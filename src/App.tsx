import { Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { AuthContext } from '@/contexts/authContext';
import { useTheme } from './hooks/useTheme';
import DifyChatbot from './components/DifyChatbot';

const Home = lazy(() => import("@/pages/Home"));
const ScientistDetail = lazy(() => import("@/pages/ScientistDetail"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// 简单的加载中组件
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">加载中...</p>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme } = useTheme();
  
  // 应用主题到文档根元素
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, logout }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scientist/:id" element={<ScientistDetail />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <DifyChatbot />
    </AuthContext.Provider>
  );
}
