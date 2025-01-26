import sqlite3 from "sqlite3";
import * as Query from "./queries.js";

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(process.env.DB_NAME);

const run = async (query, params = []) => {
  if (params && params.length > 0) {
    return new Promise((resolve, reject) => {
      db.run(query, params, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.exec(query, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const fetchAll = async (sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

export const fetchFirst = async (sql, params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};

export async function initializeDB() {
  try {
    await db.run(Query.createURLShortenerTable);
  } catch (err) {
    console.error(err);
  }
}

export default {
  run,
  fetchFirst,
  fetchAll,
  initializeDB,
};
