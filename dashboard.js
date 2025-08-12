const INFLUX_URL = "https://eu-central-1-1.aws.cloud2.influxdata.com/api/v2/query?org=Haden";
const TOKEN = "Z8r7HeIH_NvtWzzzIXtUSGP9MtxnEC3NXOWbwTufBjgFy2QxoeRLfc4LLT9fV_gKC1kyr95IPgkdL1qj5BwJhA==";
const BUCKET = "esp32";

let chart;
let lastAlertTime = 0;

const thresholds = {
  soil_pct: { min: 15, max: 35 },
  temperature: { min: 15, max: 35 },
  ph: { min: 5.5, max: 7.5 },
  tds: { max: 1200 },
  humidity: { min: 40 },
  chlorophyll_index: { min: 10 },
  rssi: { min: -90 },
  distance: { max: 50 },
};

async function fetchData() {
  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: -5m)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) =>
        r._field == "chlorophyll_index" or
        r._field == "distance" or
        r._field == "humidity" or
        r._field == "ph" or
        r._field == "rssi" or
        r._field == "soil_pct" or
        r._field == "tds" or
        r._field == "temperature"
      )
      |> last()
  `;

  try {
    const res = await fetch(INFLUX_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${TOKEN}`,
        "Content-Type": "application/vnd.flux",
        Accept: "application/csv",
      },
      body: flux,
    });

    const text = await res.text();
    const lines = text.trim().split("\n").filter((l) => !l.startsWith("#"));
    if (!lines.length) return;

    const header = lines.find((l) => l.includes("_field")).split(",");
    const fi = header.indexOf("_field");
    const vi = header.indexOf("_value");

    const data = {};
    lines.slice(lines.indexOf(header.join(",")) + 1).forEach((row) => {
      const cols = row.split(",");
      data[cols[fi]] = parseFloat(cols[vi]);
    });

    let alerts = [];

    for (const key in data) {
      const el = document.getElementById(key);
      if (el) {
        let suffix = "";
        if (key === "distance") suffix = " cm";
        else if (key === "rssi") suffix = " dBm";
        else if (key === "soil_pct") suffix = " %";
        else if (key === "temperature") suffix = " °C";
        else if (key === "tds") suffix = " ppm";
        else if (key === "humidity") suffix = " %";
        else if (key === "ph") suffix = "";

        const value = data[key];
        const { min, max } = thresholds[key] || {};
        const isOutOfRange = (min !== undefined && value < min) || (max !== undefined && value > max);
        const warningIcon = isOutOfRange ? ' <span style="color:red;">⚠️</span>' : "";

        el.innerHTML = isNaN(value) ? "--" : `${value.toFixed(2)}${suffix}${warningIcon}`;

        if (isOutOfRange) {
          alerts.push(`${key.toUpperCase()} value is outside optimal range: ${value.toFixed(2)}`);
        }
      }
    }

    const alertBox = document.getElementById("alertBox");
    const alertSound = document.getElementById("alertSound");

    if (alerts.length > 0) {
      alertBox.classList.remove("d-none");
      alertBox.innerHTML = "⚠️ Alert(s):<br>" + alerts.join("<br>");
      alertSound.play().catch((e) => console.warn("Sound play failed:", e));

      const now = Date.now();
      if (now - lastAlertTime > 5 * 60 * 1000) {
        sendTelegramAlert(alerts);
        lastAlertTime = now;
      }
    } else {
      alertBox.classList.add("d-none");
    }

    const nowTime = new Date().toLocaleTimeString();
    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
      chart.data.datasets[1].data.shift();
      chart.data.datasets[2]?.data.shift();
    }

    chart.data.labels.push(nowTime);
    chart.data.datasets[0].data.push(data["chlorophyll_index"] ?? null);
    chart.data.datasets[1].data.push(data["soil_pct"] ?? null);
    if (chart.data.datasets.length > 2) {
      chart.data.datasets[2].data.push(data["temperature"] ?? null);
    }

    chart.update();
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

function sendTelegramAlert(alerts) {
  fetch("http://127.0.0.1:5000/send-telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `🚨 SkyHarvest Sensor Alert:\n\n${alerts.join("\n")}`,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        console.log("✅ Telegram alert sent");
      } else {
        console.error("❌ Telegram alert failed:", data.error);
      }
    })
    .catch((err) => console.error("❌ Telegram fetch error:", err));
}

function initChart() {
  const ctx = document.getElementById("sensorChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "🟢 Chlorophyll Index",
          data: [],
          borderColor: "#8e44ad",
          backgroundColor: "rgba(142, 68, 173, 0.2)",
          tension: 0.4,
        },
        {
          label: "🌱 Soil Moisture(%)",
          data: [],
          borderColor: "#e67e22",
          backgroundColor: "rgba(230, 126, 34, 0.2)",
          tension: 0.4,
        },
        {
          label: "🌡 Temperature (°C)",
          data: [],
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.2)",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { beginAtZero: true, ticks: { color: "#fff" } },
      },
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
    },
  });
}

window.onload = () => {
  initChart();
  fetchData();
  setInterval(fetchData, 5000);
};
