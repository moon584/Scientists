import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ScientistAvatar from './ScientistAvatar';

interface Scientist {
  id: string;
  name: string;
  avatar: string;
  field: string[];
  tags: string[];
  bio: string;
  references: string[];
}

interface ScientistCardProps {
  scientist: Scientist;
}

export default function ScientistCard({ scientist }: ScientistCardProps) {
  const navigate = useNavigate();
  // 提取主要领域（取前两个）作为展示，避免过长
  const mainField = scientist.field.join(' / ');

  return (
    <motion.div
      onClick={() => navigate(`/scientist/${scientist.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/scientist/${scientist.id}`); }}
      variants={{
        initial: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 cursor-pointer"
    >
      {/* 顶部装饰背景：红色渐变 + 装饰性图案 */}
      <div className="h-28 bg-gradient-to-r from-red-600 to-red-700 dark:from-red-900 dark:to-red-800 relative overflow-hidden">
        {/* 装饰性背景圆圈 */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-8 left-4 w-12 h-12 bg-white/5 rounded-full blur-md"></div>
        
        {/* 右上角装饰图标 */}
        <div className="absolute top-4 right-4 text-white/20 text-4xl font-serif leading-none select-none">
          <i className="fas fa-atom"></i>
        </div>
      </div>

      {/* 头像区域 - 悬浮重叠效果 */}
      <div className="relative px-6 -mt-14 mb-3 flex items-end justify-between">
        <motion.div 
          className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden relative z-10 bg-white dark:bg-gray-700"
          whileHover={{ scale: 1.05 }}
        >
          <ScientistAvatar
            src={scientist.avatar}
            alt={scientist.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* 右侧：主要领域 (小字显示) */}
        <div className="mb-1 text-right max-w-[50%]">
           <span className="text-xs font-semibold tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md uppercase truncate block">
            {mainField}
           </span>
        </div>
      </div>

      {/* 内容主体 */}
      <div className="px-6 pb-6 flex-grow flex flex-col">
        {/* 姓名 */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
            {scientist.name}
          </h3>
        </div>

        {/* 标签 (仅显示前3个，避免拥挤) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {scientist.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center text-[10px] sm:text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
            >
               {index === 0 && <i className="fas fa-medal mr-1 text-yellow-500 opacity-80"></i>}
               {tag}
            </span>
          ))}
        </div>

        {/* 简介 - 增加行高，更易读 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-6 flex-grow text-justify font-sans">
          {scientist.bio}
        </p>

        {/* 底部按钮区域 */}
        <div className="pt-4 mt-auto border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
            <span className="text-sm">💐</span>
            <span className="text-sm font-bold">999+</span>
          </div>
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <i className="fas fa-arrow-right text-xs transform group-hover:-rotate-45 transition-transform duration-300"></i>
          </div>
        </div>
      </div>
    </motion.div>
  );
}