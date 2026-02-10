import { useEffect, useRef } from 'react';

export default function DifyChatbot() {
  const hasInjected = useRef(false);

  useEffect(() => {
    // 1. 配置检查
    const token = import.meta.env.VITE_DIFY_TOKEN;
    const baseUrl = import.meta.env.VITE_DIFY_BASE_URL;

    if (!token || !baseUrl || hasInjected.current || document.getElementById('dify-chatbot-script')) {
      return;
    }
    hasInjected.current = true;

    // 2. 设置全局配置
    window.difyChatbotConfig = { token, baseUrl, inputs: {}, systemVariables: {}, userVariables: {} };

    // 3. 注入脚本
    const script = document.createElement('script');
    script.src = `${baseUrl}/embed.min.js`;
    script.id = 'dify-chatbot-script';
    script.defer = true;
    script.setAttribute('data-token', token);
    document.body.appendChild(script);

    // 4. 注入极简样式
    const style = document.createElement('style');
    style.innerHTML = `
      #dify-chatbot-bubble-button {
        position: fixed !important;
        background-color: #C41E3A !important;
        bottom: 5.5rem !important;
        right: 1.5rem !important;
        z-index: 9999 !important;
        box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3) !important;
        transition: transform 0.2s, background-color 0.2s !important;
      }
      #dify-chatbot-bubble-button:hover {
        transform: scale(1.1) !important;
        background-color: #A01830 !important;
      }
      
      /* 只有当没有 .hide-tooltip 类时，鼠标悬浮才显示文字 */
      #dify-chatbot-bubble-button:not(.hide-tooltip):hover::before {
        content: "您好！我是科学家知识助手。专注于为您介绍杰出科学家的故事。";
        position: absolute;
        bottom: 50%;
        right: 100%;
        margin-right: 16px;
        transform: translateY(50%);
        width: 200px;
        background: white;
        color: #333;
        padding: 12px;
        border-radius: 8px;
        font-size: 13px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        pointer-events: none;
      }
      
      /* 暗黑模式 */
      @media (prefers-color-scheme: dark) {
        #dify-chatbot-bubble-button:not(.hide-tooltip):hover::before {
          background: #1e293b;
          color: #e2e8f0;
        }
      }

      /* 强制聊天窗口位置 */
      #dify-chatbot-bubble-window {
        position: fixed !important;
        width: 30rem !important;
        height: 40rem !important; /* 长宽比 4:3 (Height:Width = 40:30) */
        bottom: 6.5rem !important;
        right: 1.5rem !important;
        z-index: 9999 !important;
      }
      @media (max-width: 640px) {
        #dify-chatbot-bubble-window { width: 90% !important; height: 75% !important; right: 5% !important; bottom: 6rem !important; }
      }
    `;
    document.head.appendChild(style);

    // 5. 极简逻辑：每100ms检查一次窗口是否可见
    // 这种“蛮力”检查在处理第三方不可控组件时，往往比复杂的事件监听更可靠
    const timer = setInterval(() => {
      const btn = document.getElementById('dify-chatbot-bubble-button');
      const win = document.getElementById('dify-chatbot-bubble-window');
      
      if (btn && win) {
        // 只要窗口显示出来了（透明度不为0 且 display不是none），就隐藏 Tooltip
        const style = getComputedStyle(win);
        const isOpen = style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';
        
        if (isOpen) {
          btn.classList.add('hide-tooltip');
        } else {
          btn.classList.remove('hide-tooltip');
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return null;
}
