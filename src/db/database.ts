import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";

import { createSchema } from "./schema";

export type BotDb = Database;

export const initDatabase = async (dbPath: string): Promise<BotDb> => {
  const absolutePath = resolve(dbPath);

  await mkdir(dirname(absolutePath), { recursive: true });

  const db = await open({
    filename: absolutePath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON;");
  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA synchronous = NORMAL;");
  await createSchema(db);

  return db;
};
