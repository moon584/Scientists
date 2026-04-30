import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/authContext";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "";

/** 拼接头像完整 URL */
function avatarUrl(path: string | undefined | null): string {
  if (!path || path === "/default-avatar.png") return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export default function Profile() {
  const { user, token, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化表单
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setEmail(user.email || "");
      setPreviewUrl(avatarUrl(user.avatar));
    }
  }, [user]);

  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "头像文件不能超过 2MB" });
      return;
    }
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMessage(null);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !token) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const res = await fetch(`${API_BASE}/api/auth/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setAvatarFile(null);
      setPreviewUrl(avatarUrl(data.avatar));
      await refreshUser();
      setMessage({ type: "success", text: "头像更新成功" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "上传失败" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      await refreshUser();
      setMessage({ type: "success", text: "个人资料已更新" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const hasNameChanged = displayName !== (user.display_name || "");
  const hasEmailChanged = email !== (user.email || "");
  const hasProfileChanges = hasNameChanged || hasEmailChanged;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">个人主页</h1>
            <a
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <i className="fas fa-home mr-1"></i>返回首页
            </a>
          </div>

          {/* 提示消息 */}
          {message && (
            <div
              className={`p-4 rounded-xl text-sm border ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/30"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30"
              }`}
            >
              <i className={`fas ${message.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"} mr-2`}></i>
              {message.text}
            </div>
          )}

          {/* 头像区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">头像</h2>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="头像"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl font-bold text-red-600 dark:text-red-400 border-2 border-gray-200 dark:border-gray-600">
                    {user.display_name?.charAt(0) || user.username.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <i className="fas fa-camera mr-1"></i>选择图片
                </button>
                {avatarFile && (
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <><i className="fas fa-spinner fa-spin mr-1"></i>上传中...</>
                    ) : (
                      <><i className="fas fa-upload mr-1"></i>确认上传</>
                    )}
                  </button>
                )}
                <p className="text-xs text-gray-400">支持 JPG/PNG/GIF/WebP，最大 2MB</p>
              </div>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  昵称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="设置你的昵称"
                  maxLength={20}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="选填"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={!hasProfileChanges || saving}
                className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin"></i>保存中...</>
                ) : (
                  <><i className="fas fa-save"></i>保存</>
                )}
              </button>
            </div>
          </div>

          {/* 账号信息 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">账号信息</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">角色</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {user.role === "admin" ? (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">管理员</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">用户</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">注册时间</span>
                <span className="text-gray-900 dark:text-white">{user.created_at || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500 dark:text-gray-400">用户 ID</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs">{user.id}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
