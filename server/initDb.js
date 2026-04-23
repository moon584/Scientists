import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { getDb, exec, get, run } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 初始化数据库：建表 + 种子数据 */
export async function initDatabase() {
  await getDb();

  // 执行建表 SQL
  const sqlPath = path.resolve(__dirname, '..', 'sql.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  exec(sqlContent);
  console.log('[DB] 数据库表结构初始化完成');

  // 检查是否已有管理员账号
  const admin = get('SELECT id FROM users WHERE username = ?', ['admin']);

  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    run(
      `INSERT INTO users (username, password_hash, display_name, role)
       VALUES (?, ?, ?, 'admin')`,
      ['admin', hash, '管理员']
    );
    console.log('[DB] 管理员账号已创建（admin / admin123）');
  } else {
    console.log('[DB] 管理员账号已存在，跳过创建');
  }

  console.log('[DB] 数据库初始化完成');
}
