const pgp = require("pg-promise")();
require("dotenv").config();

const db = pgp(process.env.DATABASE_URL);

db.connect()
  .then((obj) => {
    obj.done();
    console.log("Connected to database");
  })
  .catch((error) => {
    console.error("Database connection error:", error.message || error);
  });

module.exports = db;
