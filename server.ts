import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { getTransferHealthMessages } from "./transfer-health";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

const clients: any[] = [];

function sendLog(message: string) {
  console.log(message);

  const lines = message.toString().split("\n");

  clients.forEach((res) => {
    lines.forEach((line) => {
      if (line.trim()) {
        res.write(`data: ${line}\n\n`);
      }
    });
  });
}

app.get("/api/logs", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write("data: Connected to live log stream\n\n");
  clients.push(res);

  req.on("close", () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    messages: getTransferHealthMessages(),
  });
});

app.post("/api/transfer", (req, res) => {
  sendLog("🚀 Starting transfer from frontend...");

  const child = spawn("npx", ["tsx", "transfer.ts"], {
    shell: true,
  });

  child.stdout.on("data", (data) => {
    sendLog(data.toString());
  });

  child.stderr.on("data", (data) => {
    sendLog("ERROR: " + data.toString());
  });

  child.on("close", (code) => {
    sendLog(`✅ Transfer process finished with code ${code}`);
  });

  res.json({ started: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});