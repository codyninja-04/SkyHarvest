const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// InfluxDB settings
const INFLUX_URL = "https://eu-central-1-1.aws.cloud2.influxdata.com/api/v2/query?org=Haden";
const INFLUX_TOKEN = "Z8r7HeIH_NvtWzzzIXtUSGP9mtxnEC3NXOWbwTufBjgFy2QxoeRLfc4LLT9fV_gKC1kyr95IPgkdL1qj5BwJhA==";
const INFLUX_BUCKET = "esp32";

// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

app.get("/history-data", async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: "Date is required" });

  const start = new Date(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const fluxQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: ${start.toISOString()}, stop: ${end.toISOString()})
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
  `;

  try {
    const influxRes = await fetch(INFLUX_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${INFLUX_TOKEN}`,
        "Content-Type": "application/vnd.flux",
        Accept: "application/csv",
      },
      body: fluxQuery,
    });

    const text = await influxRes.text();
    const lines = text.trim().split("\n").filter(line => !line.startsWith("#"));
    if (!lines.length) return res.json([]);

    const header = lines[0].split(",");
    const data = lines.slice(1).map(line => {
      const cols = line.split(",");
      const obj = {};
      header.forEach((h, i) => (obj[h] = cols[i]));
      return {
        _time: obj._time,
        chlorophyll_index: parseFloat(obj.chlorophyll_index ?? null),
        distance: parseFloat(obj.distance ?? null),
        humidity: parseFloat(obj.humidity ?? null),
        ph: parseFloat(obj.ph ?? null),
        rssi: parseFloat(obj.rssi ?? null),
        soil: parseFloat(obj.soil_pct ?? null),
        tds: parseFloat(obj.tds ?? null),
        temperature: parseFloat(obj.temperature ?? null),
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Error fetching history data:", err.message);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
