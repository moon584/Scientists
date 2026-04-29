import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { getDb, run, get, all, getValue } from "./db.js";
import { initDatabase } from "./initDb.js";
import { generateToken, authenticate, requireAdmin, JWT_SECRET } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;
const BAIDU_API_URL = "https://qianfan.baidubce.com/v2/app/conversation/runs";
const LOG_DIR = path.resolve(__dirname, "logs");
const CHAT_LOG_FILE = path.join(LOG_DIR, "chat.log");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ---------- 中间件 ----------
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// 头像上传目录
const AVATAR_DIR = path.resolve(__dirname, "public/avatars");
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
app.use("/avatars", express.static(AVATAR_DIR));

const upload = multer({ dest: "uploads/" });

// ---------- 日志辅助 ----------
function logChat(stage, payload) {
  const line = `[${new Date().toISOString()}][chat][${stage}] ${JSON.stringify(payload)}`;
  console.log(line);
  fs.appendFileSync(CHAT_LOG_FILE, `${line}\n`, "utf8");
}

// ---------- 语音识别 ----------
async function getBaiduAccessToken() {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${process.env.BAIDU_ASR_CLIENT_ID}&client_secret=${process.env.BAIDU_ASR_CLIENT_SECRET}`;
  const response = await axios.post(url);
  return response.data.access_token;
}

app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No audio file uploaded" });
  try {
    const accessToken = await getBaiduAccessToken();
    const audioData = fs.readFileSync(req.file.path);
    const base64Audio = audioData.toString("base64");
    const fileSize = fs.statSync(req.file.path).size;
    const response = await axios.post(
      "https://vop.baidubce.com/server_api",
      {
        format: "wav",
        rate: 16000,
        channel: 1,
        cuid: "scientists-web-client",
        token: accessToken,
        speech: base64Audio,
        len: fileSize,
      },
      { headers: { "Content-Type": "application/json" } },
    );
    fs.unlinkSync(req.file.path);
    if (response.data.err_no === 0) {
      res.json({ text: response.data.result[0] });
    } else {
      throw new Error(`Baidu ASR Error: ${response.data.err_msg}`);
    }
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// ---------- 百度 AI 聊天（带数据库持久化）----------
app.post("/api/chat", async (req, res) => {
  try {
    const { query, conversation_id } = req.body;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resolvedConversationId = conversation_id || null;
    let assistantReply = "";

    // 如果用户已登录，获取或创建对话会话
    let sessionId = null;
    if (req.headers.authorization) {
      try {
        const header = req.headers.authorization;
        const token = header.split(" ")[1];
        const jwtMod = await import("jsonwebtoken");
        const user = jwtMod.default.verify(token, JWT_SECRET);
        req.user = user; // debug

        if (conversation_id) {
          // 查找已有会话
          const session = get(
            "SELECT id FROM chat_sessions WHERE baidu_conversation_id = ? AND user_id = ?",
            [conversation_id, user.id],
          );
          if (session) sessionId = session.id;
        }
        if (!sessionId) {
          // 创建新会话
          const result = run(
            "INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)",
            [user.id, query.length > 20 ? query.slice(0, 20) + "..." : query],
          );
          sessionId = result.lastInsertRowid;
        }
      } catch (e) {
        console.error("[chat] session create error:", e);
      }
    }

    logChat("request", {
      requestId,
      conversation_id: resolvedConversationId,
      query,
    });

    const requestBody = {
      app_id: process.env.BAIDU_APP_ID,
      query,
      stream: true,
    };
    if (conversation_id) requestBody.conversation_id = conversation_id;

    const response = await fetch(BAIDU_API_URL, {
      method: "POST",
      headers: {
        Authorization: process.env.BAIDU_API_KEY.startsWith("Bearer ")
          ? process.env.BAIDU_API_KEY
          : `Bearer ${process.env.BAIDU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Baidu API Error: ${response.status} - ${errorData}`);
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const writeEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastAnswer = "";

    req.on("close", () => reader.cancel().catch(() => {}));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") {
          logChat("response", {
            requestId,
            conversation_id: resolvedConversationId,
            query,
            answer: assistantReply,
          });
          writeEvent("done", { done: true });
          res.end();
          // 保存到数据库
          if (sessionId && assistantReply) {
            run(
              "UPDATE chat_sessions SET baidu_conversation_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
              [resolvedConversationId, sessionId],
            );
            run(
              "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
              [sessionId, query],
            );
            run(
              "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'assistant', ?)",
              [sessionId, assistantReply],
            );
            run(
              "UPDATE chat_sessions SET message_count = message_count + 2 WHERE id = ?",
              [sessionId],
            );
          }
          return;
        }

        let data;
        try {
          data = JSON.parse(payload);
        } catch {
          continue;
        }

        if (data.conversation_id) {
          resolvedConversationId = data.conversation_id;
          writeEvent("meta", {
            conversation_id: data.conversation_id,
            session_id: sessionId,
          });
        }

        if (typeof data.answer === "string" && data.answer.length > 0) {
          const delta = data.answer.startsWith(lastAnswer)
            ? data.answer.slice(lastAnswer.length)
            : data.answer;
          if (delta) {
            assistantReply += delta;
            writeEvent("chunk", { text: delta });
          }
          lastAnswer = data.answer;
          continue;
        }
        if (typeof data.content === "string" && data.content.length > 0) {
          assistantReply += data.content;
          writeEvent("chunk", { text: data.content });
        }
        // 检测百度 API 错误码
        if (data.code && data.message) {
          console.error(`Baidu API error: [${data.code}] ${data.message}`);
          if (!assistantReply) {
            writeEvent("error", { error: `百度 API 错误: ${data.message}` });
            writeEvent("done", { done: true });
            reader.cancel().catch(() => {});
            return res.end();
          }
        }
      }
    }

    // 处理最后的 buffer
    if (buffer.trim().startsWith("data:")) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== "[DONE]") {
        try {
          const data = JSON.parse(payload);
          if (data.conversation_id)
            resolvedConversationId = data.conversation_id;
          if (typeof data.answer === "string" && data.answer.length > 0) {
            const delta = data.answer.startsWith(lastAnswer)
              ? data.answer.slice(lastAnswer.length)
              : data.answer;
            if (delta) assistantReply += delta;
          } else if (
            typeof data.content === "string" &&
            data.content.length > 0
          ) {
            assistantReply += data.content;
          }
        } catch {
          /* ignore */
        }
      }
    }

    logChat("response", {
      requestId,
      conversation_id: resolvedConversationId,
      query,
      answer: assistantReply,
    });
    writeEvent("done", { done: true });
    res.end();
    if (sessionId && assistantReply) {
      run(
        "UPDATE chat_sessions SET baidu_conversation_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
        [resolvedConversationId, sessionId],
      );
      run(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
        [sessionId, query],
      );
      run(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'assistant', ?)",
        [sessionId, assistantReply],
      );
      run(
        "UPDATE chat_sessions SET message_count = message_count + 2 WHERE id = ?",
        [sessionId],
      );
    }
  } catch (error) {
    console.error("Error calling Baidu API:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
    );
    res.end();
  }
});

// ============================================================
//  新增：认证相关 API
// ============================================================

// 用户注册
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: "用户名长度应在 2-20 个字符之间" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "密码长度不能少于 6 位" });
    }

    // 检查用户名是否已存在
    const existing = get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(409).json({ error: "用户名已被注册" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = run(
      "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
      [username, hash, display_name || username],
    );
    const user = get(
      "SELECT id, username, display_name, role, created_at FROM users WHERE id = ?",
      [result.lastInsertRowid],
    );
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "注册失败，请稍后重试" });
  }
});

// 用户登录
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const user = get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      // 用户不存在时不记录日志（避免外键约束问题）
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: "账号已被禁用，请联系管理员" });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      run(
        "INSERT INTO login_logs (user_id, status, fail_reason, ip_address) VALUES (?, 'fail', '密码错误', ?)",
        [user.id, req.ip || ""],
      );
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 更新最后登录时间
    run(
      "UPDATE users SET last_login_at = datetime('now', 'localtime'), last_login_ip = ? WHERE id = ?",
      [req.ip || "", user.id],
    );
    run(
      "INSERT INTO login_logs (user_id, status, ip_address, user_agent) VALUES (?, 'success', ?, ?)",
      [user.id, req.ip || "", req.headers["user-agent"] || ""],
    );
    run(
      "INSERT INTO activity_logs (user_id, action, target_type, detail, ip_address) VALUES (?, 'login', 'system', '用户登录', ?)",
      [user.id, req.ip || ""],
    );

    const token = generateToken(user);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "登录失败，请稍后重试" });
  }
});

// 获取当前用户信息
app.get("/api/auth/me", authenticate, (req, res) => {
  const user = get(
    "SELECT id, username, display_name, email, avatar, role, is_active, last_login_at, created_at FROM users WHERE id = ?",
    [req.user.id],
  );
  if (!user) return res.status(404).json({ error: "用户不存在" });
  const prefs = get("SELECT * FROM user_preferences WHERE user_id = ?", [
    req.user.id,
  ]);
  res.json({ user, preferences: prefs || {} });
});

// 更新个人资料（昵称、邮箱、头像 URL）
app.put("/api/auth/profile", authenticate, (req, res) => {
  const { display_name, email, avatar } = req.body;
  const updates = [];
  const params = [];

  if (display_name !== undefined) {
    updates.push("display_name = ?");
    params.push(display_name);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    params.push(email);
  }
  if (avatar !== undefined) {
    updates.push("avatar = ?");
    params.push(avatar);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "没有要更新的字段" });
  }

  updates.push("updated_at = datetime('now', 'localtime')");
  params.push(req.user.id);

  run(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  const user = get(
    "SELECT id, username, display_name, email, avatar, role, created_at FROM users WHERE id = ?",
    [req.user.id],
  );
  res.json({ message: "更新成功", user });
});

// 上传头像文件
const avatarUpload = multer({
  dest: AVATAR_DIR,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("仅支持 JPG/PNG/GIF/WebP 格式"));
    }
  },
});

app.post("/api/auth/avatar", authenticate, avatarUpload.single("avatar"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "请选择头像文件" });

  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `user_${req.user.id}${ext}`;
  const destPath = path.join(AVATAR_DIR, filename);

  // 删除旧头像文件（保留 default-avatar.png）
  try {
    const oldUser = get("SELECT avatar FROM users WHERE id = ?", [req.user.id]);
    if (oldUser && oldUser.avatar && oldUser.avatar !== "/default-avatar.png") {
      const oldPath = path.join(AVATAR_DIR, path.basename(oldUser.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } catch { /* ignore */ }

  // 重命名上传文件
  fs.renameSync(req.file.path, destPath);

  const avatarUrl = `/avatars/${filename}`;
  run("UPDATE users SET avatar = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", [
    avatarUrl,
    req.user.id,
  ]);

  res.json({ avatar: avatarUrl });
});

// ============================================================
//  新增：聊天历史 API
// ============================================================

app.get("/api/chat/sessions", authenticate, (req, res) => {
  const sessions = all(
    `SELECT id, baidu_conversation_id, title, message_count,
            created_at, updated_at
     FROM chat_sessions
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 50`,
    [req.user.id],
  );
  res.json({ sessions });
});

app.post("/api/chat/sessions", authenticate, (req, res) => {
  const { title, baidu_conversation_id } = req.body;
  const result = run(
    "INSERT INTO chat_sessions (user_id, title, baidu_conversation_id) VALUES (?, ?, ?)",
    [req.user.id, title || "新对话", baidu_conversation_id || ""],
  );
  const session = get("SELECT * FROM chat_sessions WHERE id = ?", [
    result.lastInsertRowid,
  ]);
  res.status(201).json({ session });
});

app.get("/api/chat/sessions/:id", authenticate, (req, res) => {
  const session = get(
    "SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!session) return res.status(404).json({ error: "对话不存在" });
  const messages = all(
    "SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY id",
    [req.params.id],
  );
  res.json({ session, messages });
});

app.delete("/api/chat/sessions/:id", authenticate, (req, res) => {
  const session = get(
    "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!session) return res.status(404).json({ error: "对话不存在" });
  run("DELETE FROM chat_messages WHERE session_id = ?", [req.params.id]);
  run("DELETE FROM chat_sessions WHERE id = ?", [req.params.id]);
  res.json({ message: "已删除" });
});

app.put("/api/chat/sessions/:id", authenticate, (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ error: "标题不能为空" });
  const session = get(
    "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!session) return res.status(404).json({ error: "对话不存在" });
  run(
    "UPDATE chat_sessions SET title = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [title.trim(), req.params.id],
  );
  res.json({ message: "已更新" });
});

// ============================================================
//  新增：管理员 API
// ============================================================

// 获取网站概览统计
app.get("/api/admin/stats", authenticate, requireAdmin, (req, res) => {
  const totalUsers = getValue("SELECT COUNT(*) FROM users");
  const totalChats = getValue("SELECT COUNT(*) FROM chat_sessions");
  const totalMessages = getValue("SELECT COUNT(*) FROM chat_messages");
  const totalTributes = getValue("SELECT COUNT(*) FROM tributes");
  const todayLogins = getValue(
    "SELECT COUNT(*) FROM login_logs WHERE status='success' AND date(login_time) = date('now', 'localtime')",
  );
  const todayChats = getValue(
    "SELECT COUNT(*) FROM chat_messages WHERE date(created_at) = date('now', 'localtime')",
  );

  res.json({
    total_users: totalUsers,
    total_chats: totalChats,
    total_messages: totalMessages,
    total_tributes: totalTributes,
    today_logins: todayLogins,
    today_chats: todayChats,
  });
});

// 获取用户列表（管理员）
app.get("/api/admin/users", authenticate, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  const search = req.query.search || "";

  let sql, countSql, params;
  if (search) {
    const like = `%${search}%`;
    sql = `SELECT id, username, display_name, email, role, is_active, last_login_at, created_at
           FROM users WHERE username LIKE ? OR display_name LIKE ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    countSql =
      "SELECT COUNT(*) as total FROM users WHERE username LIKE ? OR display_name LIKE ?";
    params = [like, like, pageSize, offset];
    const total = getValue(countSql, [like, like]);
    const users = all(sql, params);
    res.json({ users, total, page, pageSize });
  } else {
    sql = `SELECT id, username, display_name, email, role, is_active, last_login_at, created_at
           FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const total = getValue("SELECT COUNT(*) FROM users");
    const users = all(sql, [pageSize, offset]);
    res.json({ users, total, page, pageSize });
  }
});

// 禁用/启用用户（管理员）
app.put(
  "/api/admin/users/:id/toggle-status",
  authenticate,
  requireAdmin,
  (req, res) => {
    const user = get("SELECT id, is_active FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!user) return res.status(404).json({ error: "用户不存在" });
    if (user.id == 1)
      return res.status(400).json({ error: "不能禁用超级管理员" });

    const newStatus = user.is_active ? 0 : 1;
    run(
      "UPDATE users SET is_active = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [newStatus, user.id],
    );
    res.json({
      message: newStatus ? "已启用" : "已禁用",
      is_active: newStatus,
    });
  },
);

// 获取登录日志
app.get("/api/admin/login-logs", authenticate, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 30;
  const offset = (page - 1) * pageSize;

  const total = getValue("SELECT COUNT(*) FROM login_logs");
  const logs = all(
    `SELECT l.id, l.user_id, u.username, l.ip_address, l.user_agent, l.status, l.fail_reason, l.login_time
     FROM login_logs l
     LEFT JOIN users u ON l.user_id = u.id
     ORDER BY l.login_time DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  res.json({ logs, total, page, pageSize });
});

// 获取行为日志
app.get("/api/admin/activity-logs", authenticate, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 30;
  const offset = (page - 1) * pageSize;
  const action = req.query.action || "";

  let sql, countSql, params;
  if (action) {
    sql = `SELECT a.*, u.username FROM activity_logs a
           LEFT JOIN users u ON a.user_id = u.id
           WHERE a.action = ?
           ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    countSql = "SELECT COUNT(*) FROM activity_logs WHERE action = ?";
    params = [action, pageSize, offset];
    const total = getValue(countSql, [action]);
    const logs = all(sql, params);
    res.json({ logs, total, page, pageSize });
  } else {
    sql = `SELECT a.*, u.username FROM activity_logs a
           LEFT JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    const total = getValue("SELECT COUNT(*) FROM activity_logs");
    const logs = all(sql, [pageSize, offset]);
    res.json({ logs, total, page, pageSize });
  }
});

// ---------- 聊天日志（server/logs/chat.log）----------
app.get("/api/admin/chat-logs", authenticate, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 30;
  const search = (req.query.search || "").toLowerCase();

  try {
    if (!fs.existsSync(CHAT_LOG_FILE)) {
      return res.json({ logs: [], total: 0, page, pageSize });
    }
    const content = fs.readFileSync(CHAT_LOG_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);

    const parsed = lines.map((line) => {
      // [timestamp][chat][stage] {json}
      const match = line.match(/^\[(.+?)\]\[chat\]\[(.+?)\]\s(.+)$/);
      if (!match) return null;
      let payload;
      try { payload = JSON.parse(match[3]); } catch { payload = {}; }
      return {
        time: match[1],
        stage: match[2],
        query: payload.query || "",
        answer: (payload.answer || "").slice(0, 200),
        conversation_id: payload.conversation_id || "",
        requestId: payload.requestId || "",
      };
    }).filter(Boolean);

    // 搜索过滤
    const filtered = search
      ? parsed.filter((l) => l.query.toLowerCase().includes(search) || l.requestId.includes(search))
      : parsed;

    // 倒序（最新在前）
    filtered.reverse();

    const total = filtered.length;
    const offset = (page - 1) * pageSize;
    const logs = filtered.slice(offset, offset + pageSize);
    res.json({ logs, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  启动服务器
// ============================================================

async function start() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
  });
}

start();
