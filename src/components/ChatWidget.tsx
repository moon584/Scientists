import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatAssistant from "./ChatAssistant";
import DraggableMascot from "./DraggableMascot";

const MASCOT_SIZE = 60;
const MASCOT_SIZE_PX = 56;
const GAP = 8;
const EDGE_PAD = 16;
const MIN_W = 320;
const MIN_H = 400;
const BREAKPOINT = 768;

function getDefaultSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < BREAKPOINT) {
    // 手机：全屏
    return { width: vw, height: vh };
  }
  // 电脑：页面宽度的一半
  return { width: Math.round(vw * 0.5), height: Math.round(vh * 0.7) };
}

function isMobile() {
  return window.innerWidth < BREAKPOINT;
}

function getDialogStyle(
  mascotPos: { x: number; y: number },
  w: number,
  h: number
) {
  if (isMobile()) {
    return { left: 0, top: 0 };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 优先在右侧展开
  let left = mascotPos.x + MASCOT_SIZE + GAP;
  const maxRightX = vw - EDGE_PAD;
  if (left + w > maxRightX) {
    // 右侧不够放，尝试左侧
    left = Math.max(EDGE_PAD, mascotPos.x - w - GAP);
    // 如果左侧也不够，贴边
    if (left + w > maxRightX) {
      left = Math.max(EDGE_PAD, maxRightX - w);
    }
  }

  // 垂直定位
  let top = Math.max(80, mascotPos.y - 20);
  const maxBottom = vh - EDGE_PAD;
  if (top + h > maxBottom) {
    top = Math.max(80, maxBottom - h);
  }

  return { left, top };
}

function loadSize() {
  try {
    const saved = localStorage.getItem("dialog_size");
    if (!saved) return getDefaultSize();
    const p = JSON.parse(saved);
    if (typeof p.width === "number" && typeof p.height === "number") {
      return p;
    }
    return getDefaultSize();
  } catch {
    return getDefaultSize();
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mascotPos, setMascotPos] = useState({ x: 20, y: 80 });
  const [dialogSize, setDialogSize] = useState(loadSize);

  const sizeRef = useRef(dialogSize);
  sizeRef.current = dialogSize;

  const handlePositionChange = useCallback((pos: { x: number; y: number }) => {
    setMascotPos(pos);
  }, []);

  const dialogStyle = isOpen
    ? getDialogStyle(mascotPos, dialogSize.width, dialogSize.height)
    : { left: 0, top: 0 };

  // 检测悬浮球与对话框是否重叠
  const isOverlapping = isOpen && (() => {
    const mx = mascotPos.x;
    const my = mascotPos.y;
    const dl = dialogStyle.left;
    const dt = dialogStyle.top;
    const dr = dl + dialogSize.width;
    const db = dt + dialogSize.height;
    return mx < dr && (mx + MASCOT_SIZE_PX) > dl && my < db && (my + MASCOT_SIZE_PX) > dt;
  })();

  // --- 缩放逻辑 ---
  const resizeRef = useRef<{
    startX: number; startY: number; origW: number; origH: number;
    left: number; top: number;
  } | null>(null);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: dialogSize.width,
      origH: dialogSize.height,
      left: dialogStyle.left,
      top: dialogStyle.top,
    };

    const handleMove = (e: PointerEvent) => {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = vw - resizeRef.current.left - EDGE_PAD;
      const maxH = vh - resizeRef.current.top - 80;

      setDialogSize({
        width: Math.min(Math.max(resizeRef.current.origW + dx, MIN_W), maxW),
        height: Math.min(Math.max(resizeRef.current.origH + dy, MIN_H), maxH),
      });
    };

    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      localStorage.setItem("dialog_size", JSON.stringify(sizeRef.current));
      resizeRef.current = null;
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
        {isOpen && (
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              left: dialogStyle.left,
              top: dialogStyle.top,
              width: dialogSize.width,
              height: dialogSize.height,
            }}
            className="fixed z-50 max-w-[calc(100vw-32px)] max-h-[calc(100vh-140px)]"
          >
            <ChatAssistant onClose={() => setIsOpen(false)} />

            {/* 右下角缩放把手 */}
            <div
              onPointerDown={handleResizeStart}
              className="absolute bottom-0 right-0 z-10 w-6 h-6 cursor-se-resize opacity-40 hover:opacity-100 transition-opacity touch-none"
            >
              <svg viewBox="0 0 10 10" className="w-full h-full" aria-hidden="true">
                <path
                  d="M1,9 L9,1 M1,6 L6,1 M1,3 L3,1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  className="text-gray-400"
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DraggableMascot
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onPositionChange={handlePositionChange}
        hidden={isOverlapping}
      />
    </>
  );
}
