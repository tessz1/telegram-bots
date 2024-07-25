const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database("./telegram.bot.db", (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log("Con");
  }
});

db.run(`CREATE TABLE IF NOT EXISTS users (
    userID INTEGER PRIMARY KEY,
    username,
    firstname TEXT,
    lastName TEXT,
    date TEXT)`);

module.exports = db;
