document.addEventListener("DOMContentLoaded", function () {
  const stakeButton = document.getElementById("stakeButton");
  const clearLogsButton = document.getElementById("clearLogsButton");
  const amountInput = document.getElementById("amount");
  const statusMessage = document.getElementById("statusMessage");
  const logOutput = document.getElementById("logOutput");
  const connectionStatus = document.getElementById("connectionStatus");

  function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
  }

  function detectLogType(message) {
    const text = message.toLowerCase();

    if (text.includes("failed") || text.includes("error") || text.includes("❌")) {
      return "error";
    }

    if (text.includes("warning") || text.includes("retrying") || text.includes("vaa_pending")) {
      return "warning";
    }

    if (text.includes("completed") || text.includes("success") || text.includes("✅")) {
      return "success";
    }

    return "info";
  }

  function addLog(message) {
    const logEntry = document.createElement("div");
    const type = detectLogType(message);

    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    logOutput.appendChild(logEntry);
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  const eventSource = new EventSource("/api/logs");

  eventSource.onopen = function () {
    connectionStatus.textContent = "SSE Online";
    connectionStatus.className = "status-pill online";
    addLog("SSE connected to backend log stream.");
  };

  eventSource.onmessage = function (event) {
    addLog(event.data);
  };

  eventSource.onerror = function () {
    connectionStatus.textContent = "SSE Offline";
    connectionStatus.className = "status-pill offline";
    addLog("SSE connection error. Backend may be stopped.");
  };

  stakeButton.addEventListener("click", async function () {
    const amount = amountInput.value;

    if (!amount || parseFloat(amount) <= 0) {
      setStatus("Please enter a valid amount.", "error");
      return;
    }

    stakeButton.disabled = true;
    setStatus("Processing cross-chain staking... live logs are streaming.", "info");
    addLog(`User requested cross-chain stake for ${amount} SOL.`);

    try {
      const response = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const result = await response.json();

      if (result.started) {
        setStatus("Transfer started. Watch live logs for progress.", "success");
      } else {
        setStatus(`Failed: ${result.message || "Unknown backend error"}`, "error");
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`, "error");
      addLog(`Frontend error: ${error.message}`);
    } finally {
      stakeButton.disabled = false;
    }
  });

  clearLogsButton.addEventListener("click", function () {
    logOutput.innerHTML = "";
    addLog("Logs cleared.");
  });
});