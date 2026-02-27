import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { match } from 'pinyin-pro';
import ScientistCard from '../components/ScientistCard';
import ChatAssistant from '../components/ChatAssistant';
import scientistsData from '../data/scientists.json';
import { useTheme } from '../hooks/useTheme';
import BackToTop from '../components/BackToTop';

export default function Home() {
  const navigate = useNavigate();
  const [scientists, setScientists] = useState(scientistsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredScientists, setFilteredScientists] = useState(scientistsData);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedField, setSelectedField] = useState('all');
  const scientistsPerPage = 9; // 每页显示9个科学家
  const { theme, toggleTheme, isDark } = useTheme();
  
  // 提取所有唯一的领域
  const allFields = ['all', ...Array.from(new Set(scientists.flatMap(s => s.field)))];

  // 过滤科学家数据
  useEffect(() => {
    let result = [...scientists];
    
    // 按领域过滤
    if (selectedField !== 'all') {
      result = result.filter(s => s.field.includes(selectedField));
    }
    
    // 按搜索词过滤
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      result = result.filter(scientist => {
        // 姓名匹配 (直接包含)
        const nameIncludes = scientist.name.toLowerCase().includes(keyword);
        
        // 姓名拼音匹配 (使用 pinyin-pro)
        // match 返回匹配的拼音索引数组，如果不匹配返回 null
        const pinyinMatch = match(scientist.name, keyword);
        
        // 其他字段匹配
        const fieldIncludes = scientist.field.some(f => f.toLowerCase().includes(keyword));
        const tagsIncludes = scientist.tags.some(tag => tag.toLowerCase().includes(keyword));
        const bioIncludes = scientist.bio.toLowerCase().includes(keyword);
        
        return nameIncludes || (pinyinMatch && pinyinMatch.length > 0) || fieldIncludes || tagsIncludes || bioIncludes;
      });
    }
    
    // 按姓名字母顺序排序（中文排序）
    result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    
    setFilteredScientists(result);
    // 重置到第一页
    setCurrentPage(1);
  }, [searchTerm, scientists, selectedField]);

  // 计算当前页显示的科学家
  const indexOfLastScientist = currentPage * scientistsPerPage;
  const indexOfFirstScientist = indexOfLastScientist - scientistsPerPage;
  const currentScientists = filteredScientists.slice(indexOfFirstScientist, indexOfLastScientist);
  
  // 计算总页数
  const totalPages = Math.ceil(filteredScientists.length / scientistsPerPage);

  // 处理分页导航
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800">
      <BackToTop />
  {/* 顶部横幅 */}
  <div className="relative bg-gradient-to-r from-red-700 to-red-500 text-white overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://space.coze.cn/api/coze_space/gen_image?image_size=landscape_16_9&prompt=science%20laboratory%20background%20research&sign=e83c479686226f1fbcc4fbf7df5ff9c8')] bg-cover bg-center opacity-10"></div>
    <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      <div className="absolute top-4 right-4 flex gap-3">
        <button
          onClick={() => navigate('/statistics')}
          className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors text-white"
          title="数据图谱"
        >
          <i className="fas fa-chart-pie"></i>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
        >
          {isDark ? (
            <i className="fas fa-sun text-yellow-200"></i>
          ) : (
            <i className="fas fa-moon text-blue-200"></i>
          )}
        </button>
      </div>
      <h1 className="text-3xl md:text-5xl font-bold mb-4 text-center">科学家精神传承</h1>
      <p className="text-xl text-center max-w-2xl mx-auto text-red-100">
        探索中国杰出科学家的卓越贡献和崇高精神，传承科学报国的家国情怀
      </p>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
  </div>

  {/* 搜索和筛选区域 */}
  <div className="container mx-auto px-4 -mt-8 relative z-20">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
      <div className="relative mb-4">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        <input
          type="text"
          placeholder="搜索科学家姓名、领域或关键词..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
      
      {/* 领域筛选和随机推荐 */}
      <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">按领域筛选</h3>
          <div className="flex flex-wrap gap-2">
            {allFields.map((field) => (
              <button
                key={field}
                onClick={() => setSelectedField(field)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedField === field
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {field === 'all' ? '全部领域' : field}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => {
            const randomId = scientistsData[Math.floor(Math.random() * scientistsData.length)].id;
            navigate(`/scientist/${randomId}`);
          }}
          className="flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <i className="fas fa-random mr-2"></i>
          随机推荐
        </button>
      </div>
    </div>
  </div>

      {/* AI 助手 */}
      <div className="container mx-auto px-4 py-8">
        <div className="h-[80vh] min-h-[600px]">
          <ChatAssistant />
        </div>
      </div>

      {/* 科学家列表 */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-center">杰出科学家</h2>
        
        {filteredScientists.length > 0 ? (
          <>
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence>
                {currentScientists.map((scientist) => (
                  <ScientistCard key={scientist.id} scientist={scientist} />
                ))}
              </AnimatePresence>
            </motion.div>
            
          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-l-lg md:px-4 ${
                    currentPage === 1 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700'
                  } transition-colors`}
                  aria-label="上一页"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                
                {/* 优化显示 - 只显示当前页附近的页码 */}
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  // 显示首页、末页、当前页及相邻的页码
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                    return (
                      <button
                        key={index}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 md:px-4 ${
                          currentPage === pageNum 
                            ? 'bg-red-600 text-white' 
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  } 
                  // 在间隔处显示省略号
                  else if ((pageNum === 2 && currentPage > 3) || (pageNum === totalPages - 1 && currentPage < totalPages - 2)) {
                    return (
                      <span key={index} className="px-3 py-2 md:px-4 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-r-lg md:px-4 ${
                    currentPage === totalPages 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700'
                  } transition-colors`}
                  aria-label="下一页"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
            
            {/* 显示分页信息 */}
            <div className="mt-4 text-center text-gray-600 dark:text-gray-400 text-sm">
              显示 {indexOfFirstScientist + 1} - {Math.min(indexOfLastScientist, filteredScientists.length)} 条，共 {filteredScientists.length} 位科学家
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search text-red-500 dark:text-red-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">未找到科学家</h3>
            <p className="text-gray-600 dark:text-gray-400">请尝试使用其他关键词搜索</p>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="bg-red-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">科学家精神传承网站 © {new Date().getFullYear()}</p>
          <p className="text-red-200 text-sm">弘扬科学家精神，激励更多青少年投身科学事业</p>
        </div>
      </footer>
    </div>
  );
}