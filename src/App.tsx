import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ScientistDetail from "@/pages/ScientistDetail";
import { useState, useEffect } from "react";
import { AuthContext } from '@/contexts/authContext';
import { useTheme } from './hooks/useTheme';

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scientist/:id" element={<ScientistDetail />} />
      </Routes>
    </AuthContext.Provider>
  );
}
