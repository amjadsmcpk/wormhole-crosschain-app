import fs from "fs";

const DB_FILE = "transfers.json";

export function getTransferHealthMessages(): string[] {
  if (!fs.existsSync(DB_FILE)) {
    return ["THM: No transfer history found yet."];
  }

  const records = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const latest = records[records.length - 1];

  if (!latest) return ["THM: No transfers yet."];

  const ageMs = Date.now() - new Date(latest.updatedAt).getTime();
  const ageSeconds = Math.floor(ageMs / 1000);

  const messages: string[] = [];

  messages.push(`THM: Latest transfer status is ${latest.status}`);
  messages.push(`THM: Last update was ${ageSeconds} seconds ago`);

  if (latest.status === "VAA_PENDING" && ageSeconds > 45) {
    messages.push("THM WARNING: Guardian VAA is taking longer than usual. Do not start a duplicate transfer.");
  }

  if (latest.status === "VAA_PENDING" && ageSeconds > 180) {
    messages.push("THM RECOVERY: Source transaction exists. You can safely retry VAA fetching later.");
  }

  if (latest.status === "VAA_RECEIVED") {
    messages.push("THM: VAA received. Funds are not lost. Destination redemption can be retried.");
  }

  if (latest.status === "RECOVERABLE") {
    messages.push(`THM RECOVERABLE ERROR: ${latest.errorType}`);
    messages.push(`THM ACTION: ${latest.recoverySuggestion}`);
  }

  if (latest.status === "COMPLETED") {
    messages.push("THM SUCCESS: Transfer completed successfully.");
  }

  return messages;
}