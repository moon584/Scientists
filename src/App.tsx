import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ScientistDetail from "@/pages/ScientistDetail";
import { useState, useEffect, useRef } from "react";
import { AuthContext } from '@/contexts/authContext';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme } = useTheme();
  const hasInjectedDify = useRef(false);
  
  // 应用主题到文档根元素
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // 初始化 Dify Chatbot
  useEffect(() => {
    if (hasInjectedDify.current) return;

    const difyToken = import.meta.env.VITE_DIFY_TOKEN;
    const difyBaseUrl = import.meta.env.VITE_DIFY_BASE_URL;

    if (!difyToken || !difyBaseUrl) {
      console.warn('Dify Chatbot configuration missing in environment variables');
      return;
    }

    // 设置配置
    window.difyChatbotConfig = {
      token: difyToken,
      baseUrl: difyBaseUrl,
      inputs: {},
      systemVariables: {},
      userVariables: {},
    };

    // 注入脚本
    const scriptId = difyToken; // 使用 token 作为 ID，与原代码一致
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${difyBaseUrl}/embed.min.js`;
      script.defer = true;
      script.onload = () => console.info('Dify Chatbot script loaded');
      script.onerror = (e) => console.error('Dify Chatbot script failed to load', e);
      document.body.appendChild(script);

      // 注入样式
      if (!document.getElementById('dify-style')) {
        const style = document.createElement('style');
        style.id = 'dify-style';
        style.innerHTML = `
          #dify-chatbot-bubble-button {
            background-color: #C41E3A !important;
            z-index: 9999 !important;
            bottom: 5.5rem !important; /* 避开回到顶部按钮 */
            right: 1.5rem !important;
          }
          #dify-chatbot-bubble-window {
            width: 24rem !important;
            height: 40rem !important;
            z-index: 9999 !important;
            bottom: 6.5rem !important;
            right: 1.5rem !important;
          }
        `;
        document.head.appendChild(style);
      }

      hasInjectedDify.current = true;
    }
  }, []);

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
