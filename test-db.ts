import Database from "better-sqlite3";
const db = new Database("test.db");
db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
db.prepare("INSERT INTO test (name) VALUES (?)").run("Hello World");
const row = db.prepare("SELECT * FROM test").get();
console.log("Database test successful:", row);
process.exit(0);
