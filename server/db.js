import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db = null;

/** 初始化数据库连接 */
export async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');
  return db;
}

/** 将内存数据库写入磁盘 */
export function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * 执行写操作（INSERT / UPDATE / DELETE）
 * @param {string} sql      - 支持 ? 或 $name 占位符
 * @param {object|array} [bindParams] - 绑定参数
 * @returns {{ changes: number, lastInsertRowid: number|null }}
 */
export function run(sql, bindParams) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(bindParams);
  stmt.run();
  stmt.free();
  // 必须在 saveDb() 前获取，因为 export() 会重置这些值
  const changes = db.getRowsModified();
  const rowidArr = db.exec('SELECT last_insert_rowid()');
  const lastInsertRowid = rowidArr?.[0]?.values?.[0]?.[0] ?? null;
  saveDb();
  return { changes, lastInsertRowid };
}

/** 查询单条记录 */
export function get(sql, bindParams) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(bindParams);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return Object.keys(row).length ? row : null;
  }
  stmt.free();
  return null;
}

/** 查询多条记录 */
export function all(sql, bindParams) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(bindParams);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** 查询单个值 */
export function getValue(sql, bindParams) {
  if (!db) throw new Error('Database not initialized');
  const row = get(sql, bindParams);
  return row ? Object.values(row)[0] : null;
}

/** 批量执行多条语句（建表用） */
export function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
  saveDb();
}

export default { getDb, saveDb, run, get, all, exec, getValue };
