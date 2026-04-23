import { useState, useRef, useEffect } from "react";

interface DraggableMascotProps {
  onClick: () => void;
  isOpen: boolean;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

const DEFAULT_POS = { x: 24, y: 120 };

function loadPosition() {
  try {
    const raw = localStorage.getItem("mascot_pos");
    if (!raw) return DEFAULT_POS;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
    return DEFAULT_POS;
  } catch {
    return DEFAULT_POS;
  }
}

export default function DraggableMascot({
  onClick,
  isOpen,
  onPositionChange,
}: DraggableMascotProps) {
  const [pos, setPos] = useState(loadPosition);

  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    onPositionChange?.(pos);
  }, [pos, onPositionChange]);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const movedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    movedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };

    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) movedRef.current = true;
      setPos({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      if (movedRef.current) {
        localStorage.setItem("mascot_pos", JSON.stringify(posRef.current));
      }
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const handleClick = () => {
    if (!movedRef.current) onClick();
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        left: 0,
        top: 0,
      }}
      className={`fixed z-50 w-14 h-14 rounded-full shadow-xl cursor-grab active:cursor-grabbing transition-shadow hover:shadow-2xl select-none touch-none bg-gradient-to-br from-red-500 to-red-600 will-change-transform ${
        isOpen ? "ring-4 ring-red-300 dark:ring-red-600" : ""
      }`}
    >
      <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-700">
        <img
          src="/docs/头像/ai-avatar.png"
          alt="AI助手"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            const parent = (e.target as HTMLImageElement).parentElement!;
            parent.innerHTML =
              '<i class="fas fa-robot text-white text-xl"></i>';
          }}
        />
      </div>

      {/* 未打开对话框时显示气泡 */}
      {!isOpen && (
        <div
          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none animate-[bubbleIn_0.4s_ease-out]"
          style={{ maxWidth: "calc(100vw - 110px)" }}
        >
          <style>{`
            @keyframes bubbleIn {
              from { opacity: 0; transform: translateY(6px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="absolute left-[-7px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-white dark:border-r-gray-800" />
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg border border-gray-200/60 dark:border-gray-700/60 text-center whitespace-nowrap overflow-hidden">
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
              你好呀！我是科学家知识助手，
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
              你可以向我提问！
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
