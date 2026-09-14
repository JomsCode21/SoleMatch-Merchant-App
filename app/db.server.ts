import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "./db/schema";

const pool = mysql.createPool(process.env.DATABASE_URL!);

const db = drizzle(pool, {
  schema,
  mode: "default",
});

export default db;
