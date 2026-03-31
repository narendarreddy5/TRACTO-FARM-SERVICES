import express from "express";
import Database from "better-sqlite3";
const db = new Database("tfs.db");
const app = express();
const PORT = 3000;
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
});
