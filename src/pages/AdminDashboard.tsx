import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

type TabKey = "users" | "chats" | "logs" | "chatlogs";

export default function AdminDashboard() {
  const { token, user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setStats)
        .catch(console.error);
    }
  }, [token]);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <i className="fas fa-shield-halved text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400 mb-4">权限不足，仅管理员可访问</p>
          <a href="/" className="text-red-600 hover:underline">返回首页</a>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "users", label: "用户管理", icon: "fa-users" },
    { key: "chats", label: "对话记录", icon: "fa-comments" },
    { key: "logs", label: "登录日志", icon: "fa-clock-rotate" },
    { key: "chatlogs", label: "聊天日志", icon: "fa-server" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 页面标题 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理后台</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                欢迎回来，{user.display_name || user.username}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <i className="fas fa-sign-out-alt mr-1"></i>退出
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="fa-users" label="总用户" value={stats?.total_users ?? "-"} color="blue" />
          <StatCard icon="fa-comments" label="总对话" value={stats?.total_chats ?? "-"} color="green" />
          <StatCard icon="fa-right-to-bracket" label="今日登录" value={stats?.today_logins ?? "-"} color="amber" />
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === t.key
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <i className={`fas ${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {activeTab === "users" && <UsersPanel token={token!} />}
          {activeTab === "chats" && <ChatsPanel token={token!} />}
          {activeTab === "logs" && <LoginLogsPanel token={token!} />}
          {activeTab === "chatlogs" && <ChatLogsPanel token={token!} />}
        </div>
      </div>
    </div>
  );
}

/* ---- 子组件 ---- */

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* 用户管理面板 */
function UsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const fetchUsers = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    fetch(`${API_BASE}/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setUsers(data.users); setTotal(data.total); })
      .catch(console.error);
  };

  useEffect(() => { fetchUsers(); }, [page, search, token]);

  const toggleStatus = (userId: number) => {
    fetch(`${API_BASE}/api/admin/users/${userId}/toggle-status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(() => fetchUsers())
      .catch(console.error);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          用户列表 <span className="text-sm font-normal text-gray-400">(共 {total} 人)</span>
        </h3>
        <input
          type="text"
          placeholder="搜索用户名..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 w-48"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-2">ID</th>
              <th className="text-left py-3 px-2">用户名</th>
              <th className="text-left py-3 px-2">显示名称</th>
              <th className="text-left py-3 px-2">角色</th>
              <th className="text-left py-3 px-2">状态</th>
              <th className="text-left py-3 px-2">最后登录</th>
              <th className="text-left py-3 px-2">注册时间</th>
              <th className="text-left py-3 px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                <td className="py-3 px-2">{u.id}</td>
                <td className="py-3 px-2 font-medium">{u.username}</td>
                <td className="py-3 px-2">{u.display_name || "-"}</td>
                <td className="py-3 px-2">
                  {u.role === "admin" ? (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">管理员</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">用户</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {u.is_active ? '正常' : '已禁用'}
                </td>
                <td className="py-3 px-2 text-xs text-gray-400">{u.last_login_at || "-"}</td>
                <td className="py-3 px-2 text-xs text-gray-400">{u.created_at}</td>
                <td className="py-3 px-2">
                  {u.role !== "admin" && (
                    <button
                      onClick={() => toggleStatus(u.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        u.is_active
                          ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                    >
                      {u.is_active ? "禁用" : "启用"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}

/* 对话记录面板 */
function ChatsPanel({ token }: { token: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    // 暂用活动日志作为对话记录的简化视图
    // 全量对话记录可通过 admin API 扩展
    fetch(`${API_BASE}/api/admin/activity-logs?page=${page}&pageSize=${pageSize}&action=chat`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setSessions(data.logs); setTotal(data.total); })
      .catch(console.error);
  }, [page, token]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        对话记录 <span className="text-sm font-normal text-gray-400">(共 {total} 条)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-2">ID</th>
              <th className="text-left py-3 px-2">用户</th>
              <th className="text-left py-3 px-2">操作</th>
              <th className="text-left py-3 px-2">详情</th>
              <th className="text-left py-3 px-2">时间</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                <td className="py-3 px-2">{s.id}</td>
                <td className="py-3 px-2">{s.username || "-"}</td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">对话</span>
                </td>
                <td className="py-3 px-2 max-w-[300px] truncate">{s.detail || "-"}</td>
                <td className="py-3 px-2 text-xs text-gray-400">{s.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}

/* 登录日志面板 */
/* 聊天日志面板（server/logs/chat.log） */
function ChatLogsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 30;

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    fetch(`${API_BASE}/api/admin/chat-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs); setTotal(data.total); })
      .catch(console.error);
  }, [page, search, token]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          聊天日志 <span className="text-sm font-normal text-gray-400">(共 {total} 条)</span>
        </h3>
        <input
          type="text"
          placeholder="搜索 query 或 requestId..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 w-56"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-2 whitespace-nowrap">时间</th>
              <th className="text-left py-3 px-2">类型</th>
              <th className="text-left py-3 px-2">query</th>
              <th className="text-left py-3 px-2">answer (前200字)</th>
              <th className="text-left py-3 px-2">conversation_id</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: any, i: number) => (
              <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                <td className="py-3 px-2 text-xs text-gray-400 whitespace-nowrap">{l.time}</td>
                <td className="py-3 px-2">
                  {l.stage === "request" ? (
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">请求</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-full">响应</span>
                  )}
                </td>
                <td className="py-3 px-2 max-w-[300px] truncate font-medium">{l.query || "-"}</td>
                <td className="py-3 px-2 max-w-[300px] truncate text-xs text-gray-500">{l.answer || "-"}</td>
                <td className="py-3 px-2 text-xs text-gray-400 max-w-[200px] truncate">{l.conversation_id || "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">暂无聊天日志</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}

function LoginLogsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/login-logs?page=${page}&pageSize=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs); setTotal(data.total); })
      .catch(console.error);
  }, [page, token]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        登录日志 <span className="text-sm font-normal text-gray-400">(共 {total} 条)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-2">时间</th>
              <th className="text-left py-3 px-2">用户</th>
              <th className="text-left py-3 px-2">IP</th>
              <th className="text-left py-3 px-2">状态</th>
              <th className="text-left py-3 px-2">失败原因</th>
              <th className="text-left py-3 px-2">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                <td className="py-3 px-2 text-xs text-gray-400 whitespace-nowrap">{l.login_time}</td>
                <td className="py-3 px-2">{l.username || `用户#${l.user_id}`}</td>
                <td className="py-3 px-2 text-xs text-gray-400">{l.ip_address || "-"}</td>
                <td className="py-3 px-2">
                  {l.status === "success" ? (
                    <span className="text-green-600 dark:text-green-400 text-xs font-medium">成功</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">失败</span>
                  )}
                </td>
                <td className="py-3 px-2 text-xs text-gray-400">{l.fail_reason || "-"}</td>
                <td className="py-3 px-2 text-xs text-gray-400 max-w-[200px] truncate">{l.user_agent || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}
