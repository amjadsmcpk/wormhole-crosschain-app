import fs from "fs";

export type TransferStatus =
  | "CREATED"
  | "SIGNER_READY"
  | "SOURCE_SUBMITTED"
  | "VAA_PENDING"
  | "VAA_RECEIVED"
  | "DESTINATION_SUBMITTED"
  | "COMPLETED"
  | "FAILED"
  | "RECOVERABLE"
  | "MANUAL_REVIEW";

export type TransferRecord = {
  id: string;
  status: TransferStatus;
  sourceTx?: string;
  destinationTx?: string;
  errorType?: string;
  recoverySuggestion?: string;
  updatedAt: string;
  history: string[];
};

const DB_FILE = "transfers.json";

function readDb(): TransferRecord[] {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(records: TransferRecord[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2));
}

export function createTransfer(): TransferRecord {
  const record: TransferRecord = {
    id: Date.now().toString(),
    status: "CREATED",
    updatedAt: new Date().toISOString(),
    history: ["CREATED"],
  };

  const records = readDb();
  records.push(record);
  writeDb(records);

  return record;
}

export function updateTransfer(
  id: string,
  updates: Partial<TransferRecord>,
  note: string
) {
  const records = readDb();
  const index = records.findIndex((r) => r.id === id);

  if (index === -1) return;

  records[index] = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    history: [...records[index].history, note],
  };

  writeDb(records);
}