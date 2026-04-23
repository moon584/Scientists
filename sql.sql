-- ============================================
-- 科学家精神网站 - 数据库初始化脚本 (SQLite)
-- ============================================
-- 使用方法：
--   cd server && npm install better-sqlite3
--   在 server.js 中引入并执行本文件中的 SQL
-- ============================================

-- 启用 WAL 模式（提高并发读性能）
PRAGMA journal_mode = WAL;
-- 启用外键约束
PRAGMA foreign_keys = ON;

-- --------------------------------------------
-- 1. 用户表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    display_name    TEXT    DEFAULT '',
    email           TEXT    DEFAULT '',
    avatar          TEXT    DEFAULT '/default-avatar.png',
    role            TEXT    NOT NULL DEFAULT 'user'
                            CHECK(role IN ('user', 'admin')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_login_at   TEXT,
    last_login_ip   TEXT    DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- --------------------------------------------
-- 2. 对话会话表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL,
    baidu_conversation_id TEXT    DEFAULT '',
    title                 TEXT    NOT NULL DEFAULT '新对话',
    message_count         INTEGER NOT NULL DEFAULT 0,
    is_active             INTEGER NOT NULL DEFAULT 1,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- 3. 聊天消息表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
    content     TEXT    NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- 4. 献花记录表（每次点击献花为一条记录）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tributes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    scientist_id  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- 5. 用户偏好设置表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL UNIQUE,
    theme            TEXT    NOT NULL DEFAULT 'system'
                             CHECK(theme IN ('light', 'dark', 'system')),
    preferred_fields TEXT    DEFAULT '[]',  -- JSON 数组：感兴趣的学科领域
    auto_tts         INTEGER NOT NULL DEFAULT 1,  -- 是否自动语音播报
    created_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- 6. 登录日志表（后台追踪）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS login_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL DEFAULT 0,
    ip_address  TEXT    DEFAULT '',
    user_agent  TEXT    DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'success'
                        CHECK(status IN ('success', 'fail')),
    fail_reason TEXT    DEFAULT '',
    login_time  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- --------------------------------------------
-- 7. 操作日志表（后台追踪用户行为）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL DEFAULT 0,
    action      TEXT    NOT NULL,  -- 'view_scientist', 'chat', 'tribute', 'search', 'login', 'logout'
    target_type TEXT    DEFAULT '', -- 'scientist', 'chat', 'system'
    target_id   TEXT    DEFAULT '', -- 目标 ID（科学家 ID 等）
    detail      TEXT    DEFAULT '', -- 额外描述（搜索关键词等）
    ip_address  TEXT    DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- --------------------------------------------
-- 索引（优化查询性能）
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id    ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated    ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session    ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created    ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tributes_user            ON tributes(user_id);
CREATE INDEX IF NOT EXISTS idx_tributes_scientist       ON tributes(scientist_id);
CREATE INDEX IF NOT EXISTS idx_tributes_created         ON tributes(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_user          ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_time          ON login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user       ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action     ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_time       ON activity_logs(created_at);

-- --------------------------------------------
-- 视图：献花统计
-- --------------------------------------------
CREATE VIEW IF NOT EXISTS v_tribute_summary AS
SELECT
    scientist_id,
    COUNT(*)                       AS total_tributes,
    COUNT(DISTINCT user_id)        AS unique_users,
    MAX(created_at)                AS last_tribute_at
FROM tributes
GROUP BY scientist_id
ORDER BY total_tributes DESC;

-- --------------------------------------------
-- 视图：用户活跃度统计
-- --------------------------------------------
CREATE VIEW IF NOT EXISTS v_user_activity AS
SELECT
    u.id            AS user_id,
    u.username,
    u.display_name,
    u.role,
    u.last_login_at,
    COUNT(DISTINCT cs.id)  AS total_sessions,
    COUNT(DISTINCT cm.id)  AS total_messages,
    COUNT(DISTINCT t.id)   AS total_tributes,
    COUNT(DISTINCT al.id)  AS total_actions
FROM users u
LEFT JOIN chat_sessions cs ON cs.user_id = u.id
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
LEFT JOIN tributes t      ON t.user_id = u.id
LEFT JOIN activity_logs al ON al.user_id = u.id
GROUP BY u.id;

-- --------------------------------------------
-- 种子数据：默认管理员账号
-- 密码: admin123 （应用启动时通过 bcrypt 哈希后写入）
-- 首次启动后请立即修改密码
-- --------------------------------------------
-- 管理员账号由应用程序在首次启动时自动创建，
-- 因为密码需要在应用中用 bcrypt 进行哈希处理。
-- 见 server/initDb.js 中的 seedAdmin() 函数。
