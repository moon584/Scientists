import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "@/contexts/authContext";
import { useTheme } from './hooks/useTheme';
import LoginModal from "@/components/LoginModal";
import ChatWidget from "@/components/ChatWidget";

const Home = lazy(() => import("@/pages/Home"));
const ScientistDetail = lazy(() => import("@/pages/ScientistDetail"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const LoadingFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
  >
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">加载中...</p>
    </div>
  </motion.div>
);

/** 全局导航栏（含登录入口） */
function GlobalNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
            <i className="fas fa-flask text-lg"></i>
            <span className="text-sm hidden sm:inline">科学家精神</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/statistics"
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="数据图谱"
            >
              <i className="fas fa-chart-pie"></i>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
            >
              {isDark ? (
                <i className="fas fa-sun text-yellow-400"></i>
              ) : (
                <i className="fas fa-moon text-blue-400"></i>
              )}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                    {user.display_name?.charAt(0) || user.username.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline max-w-[100px] truncate">
                    {user.display_name || user.username}
                  </span>
                  <i className="fas fa-chevron-down text-xs text-gray-400"></i>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500">{user.username}</p>
                        <p className="text-xs text-gray-400">{user.role === 'admin' ? '管理员' : '用户'}</p>
                      </div>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <i className="fas fa-gauge w-4 text-gray-400"></i>
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <i className="fas fa-sign-out-alt w-4"></i>
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <i className="fas fa-user-plus text-xs"></i>
                <span>登录</span>
              </button>
            )}
          </div>
        </div>
      </nav>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}

export default function App() {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <AuthProvider>
      <GlobalNav />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/scientist/:id" element={<ScientistDetail />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      <ChatWidget />
    </AuthProvider>
  );
}
