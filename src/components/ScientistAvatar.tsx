import { useState } from 'react';
import { cn } from '@/lib/utils'; // 假设你有这个工具函数，如果没有就不用

interface ScientistAvatarProps {
  src: string;
  alt: string;
  className?: string;
  draggable?: boolean;
}

export default function ScientistAvatar({ src, alt, className, draggable }: ScientistAvatarProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // 默认头像路径
  const fallbackSrc = "/docs/头像/default.png";

  return (
    <div className={cn("relative overflow-hidden bg-gray-100 dark:bg-gray-700 w-full h-full", className)}>
      <img
        src={error ? fallbackSrc : src}
        alt={alt}
        draggable={draggable}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          error && "p-2 opacity-50" // 如果是默认图，稍微缩小一点并降低透明度以示区别
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
            setError(true);
            setLoading(false);
        }}
        loading="lazy"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 animate-pulse">
          <i className="fas fa-user text-gray-400"></i>
        </div>
      )}
    </div>
  );
}
