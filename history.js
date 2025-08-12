document.addEventListener("DOMContentLoaded", () => {
  const datePicker = document.getElementById("datePicker");
  const dataContainer = document.getElementById("dataContainer");
  const noDataMsg = document.getElementById("noDataMsg");

  datePicker.addEventListener("change", async () => {
    const selectedDate = datePicker.value;
    if (!selectedDate) return;

    try {
      const res = await fetch(`/history-data?date=${selectedDate}`);
      const data = await res.json();

      if (data.length === 0) {
        dataContainer.innerHTML = "";
        noDataMsg.classList.remove("d-none");
        return;
      }

      noDataMsg.classList.add("d-none");

      let tableHTML = `
        <table class="table table-striped table-dark table-bordered">
          <thead>
            <tr>
              <th>Time</th>
              <th>Chlorophyll</th>
              <th>Distance</th>
              <th>Humidity</th>
              <th>pH</th>
              <th>RSSI</th>
              <th>Soil</th>
              <th>TDS</th>
              <th>Temperature</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.forEach(entry => {
        tableHTML += `
          <tr>
            <td>${new Date(entry._time).toLocaleTimeString()}</td>
            <td>${entry.chlorophyll_index ?? "-"}</td>
            <td>${entry.distance ?? "-"}</td>
            <td>${entry.humidity ?? "-"}</td>
            <td>${entry.ph ?? "-"}</td>
            <td>${entry.rssi ?? "-"}</td>
            <td>${entry.soil ?? "-"}</td>
            <td>${entry.tds ?? "-"}</td>
            <td>${entry.temperature ?? "-"}</td>
          </tr>
        `;
      });

      tableHTML += "</tbody></table>";
      dataContainer.innerHTML = tableHTML;
    } catch (err) {
      console.error("Error fetching history:", err);
      noDataMsg.textContent = "❌ Error loading data.";
      noDataMsg.classList.remove("d-none");
      dataContainer.innerHTML = "";
    }
  });
});
