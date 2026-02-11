import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    difyChatbotConfig: any;
  }
}

export default function DifyChatbot() {
  const hasInjected = useRef(false);

  useEffect(() => {
    const token = import.meta.env.VITE_DIFY_TOKEN;
    const baseUrl = import.meta.env.VITE_DIFY_BASE_URL;
    if (!token || !baseUrl || hasInjected.current || document.getElementById('dify-chatbot-script')) return;
    hasInjected.current = true;

    // 配置 Dify 全局参数（支持拖拽、动态脚本）
    window.difyChatbotConfig = {
      token,
      baseUrl,
      dynamicScript: true,
      draggable: true,
      containerProps: {
        style: {
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          right: '24px',
          bottom: 'auto',
          top: 'calc(50% - 30px)',
          transform: 'none',
          position: 'fixed',
          zIndex: 9999,
          backgroundColor: '#C41E3A',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }
      },
      inputs: {
        name: '访客',
        source: 'web'
      },
      systemVariables: {
        user_id: 'guest'
      },
      userVariables: {}
    };

    // 注入 Dify 脚本
    const script = document.createElement('script');
    script.src = `${baseUrl}/embed.min.js?v=${Date.now()}`;
    script.id = 'dify-chatbot-script';
    script.defer = true;
    script.setAttribute('data-token', token);
    script.onerror = () => console.error('Dify script failed to load');
    document.body.appendChild(script);

    // ========== 样式覆盖 ==========
    const style = document.createElement('style');
    style.innerHTML = `
      /* 按钮样式（通过 CSS 变量） */
      #dify-chatbot-bubble-button {
        --dify-chatbot-bubble-button-top: calc(50% - 30px);
        --dify-chatbot-bubble-button-bottom: auto;
        --dify-chatbot-bubble-button-right: 20px;
        --dify-chatbot-bubble-button-bg-color: #C41E3A;
        --dify-chatbot-bubble-button-width: 60px;
        --dify-chatbot-bubble-button-height: 60px;
        --dify-chatbot-bubble-button-border-radius: 30px;
        --dify-chatbot-bubble-button-box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        --dify-chatbot-bubble-button-hover-transform: scale(1.05);
        --dify-chatbot-bubble-button-z-index: 10000;
      }

      #dify-chatbot-bubble-window {
        width: 30rem !important;
        max-width: 90vw !important;
        height: 40rem !important;
        max-height: 80vh !important;
        position: fixed !important;
        right: 100px !important;   /* 初始移到屏幕外 */
        bottom: 9 rem !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
        transition: opacity 0.2s ease;
        z-index: 9999 !important;
      }
      @media (max-width: 640px) {
        #dify-chatbot-bubble-window {
          width: 90% !important;
          height: 75% !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
          right: auto !important;
          bottom: auto !important;
        }
      }
    `;
    document.head.appendChild(style);

    // ========== 动态定位：始终贴在按钮左上方 ==========
    const GAP = 12;      // 按钮与对话框的间距
    const MARGIN = 12;   // 视口边缘最小距离

    function updateWindowPosition() {
      const btn = document.getElementById('dify-chatbot-bubble-button');
      const win = document.getElementById('dify-chatbot-bubble-window');
      if (!btn || !win) return;

      // 检测窗口是否真正打开（Dify 隐藏时设置 opacity/visibility）
      const cs = getComputedStyle(win);
      const isOpen = cs.opacity !== '0' && cs.display !== 'none' && cs.visibility !== 'hidden';
      if (!isOpen) return;

      const btnRect = btn.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();

      // 移动端 (<640px) 由 CSS 处理居中定位，此处跳过 JS 计算
      if (window.innerWidth < 640) {
        return;
      }

      // 桌面端：跟随按钮，默认位置在按钮左上方
      let left = btnRect.left - winRect.width - GAP;
      // ...
      let top = btnRect.top - winRect.height - 80;

      // 左侧空间不足 → 放在按钮右上方
      if (left < MARGIN) {
        left = btnRect.right + GAP;
      }

      // 上方空间不足 → 放在按钮左下方
      if (top < MARGIN) {
        top = btnRect.bottom + GAP;
      }

      // 二次修正：不能超出视口
      left = Math.min(window.innerWidth - winRect.width - MARGIN, Math.max(MARGIN, left));
      top = Math.min(window.innerHeight - winRect.height - MARGIN, Math.max(MARGIN, top));

      // 应用位置（固定定位）
      win.style.position = 'fixed';
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.transform = 'none';
    }

    // 持续动画循环：只要窗口存在就不断尝试更新位置（解决拖拽、滚动、resize）
    let rafId = 0;
    function loop() {
      updateWindowPosition();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    // 滚动、窗口大小变化时也立即更新（防丢帧）
    window.addEventListener('scroll', updateWindowPosition, true);
    window.addEventListener('resize', updateWindowPosition);

    // ========== 清理 ==========
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updateWindowPosition, true);
      window.removeEventListener('resize', updateWindowPosition);
    };
  }, []);

  return null;
}