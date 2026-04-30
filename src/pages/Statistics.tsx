import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import scientistsData from '../data/scientists.json';
import { useTheme } from '../hooks/useTheme';

export default function Statistics() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // 数据处理
  const stats = useMemo(() => {
    // 1. 领域分布
    const fieldCount: Record<string, number> = {};
    scientistsData.forEach(s => {
      s.field.forEach(f => {
        fieldCount[f] = (fieldCount[f] || 0) + 1;
      });
    });
    const fieldData = Object.entries(fieldCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. 籍贯分布 (解析 bio)
    const provinceCount: Record<string, number> = {};
    const provinceRegex = /籍贯(.*?)[，,。]/;
    
    scientistsData.forEach(s => {
      const match = s.bio.match(provinceRegex);
      if (match && match[1]) {
        // 提取省份 (简单处理：取前两个或三个字，如"湖北"、"黑龙江")
        let province = match[1].replace('省', '').replace('市', '').trim();
        // 处理一些特定情况
        if (province.includes('自')) province = province.substring(0, 2); // 自治区等
        
        // 简单截取前两个字归类（大致准确）
        const shortName = province.substring(0, 2);
        provinceCount[shortName] = (provinceCount[shortName] || 0) + 1;
      }
    });
    const provinceData = Object.entries(provinceCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // 只取前10

    // 3. 出生年代分布
    const yearCount: Record<string, number> = {};
    const yearRegex = /(\d{4})年/;
    
    scientistsData.forEach(s => {
      const match = s.bio.match(yearRegex);
      if (match && match[1]) {
        const year = parseInt(match[1]);
        const decade = Math.floor(year / 10) * 10 + 's';
        yearCount[decade] = (yearCount[decade] || 0) + 1;
      }
    });
    const yearData = Object.entries(yearCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    return { fieldData, provinceData, yearData };
  }, []);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 transition-colors"
              aria-label="返回首页"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="ml-4 text-xl font-bold text-gray-800 dark:text-white">科学家数据图谱</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard title="收录科学家" value={scientistsData.length} suffix="位" icon="fa-users" color="bg-blue-500" />
            <StatsCard title="涉及领域" value={stats.fieldData.length} suffix="个" icon="fa-flask" color="bg-green-500" />
            <StatsCard title="覆盖时期" value={stats.yearData.length} suffix="个年代" icon="fa-clock" color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 领域分布图 */}
          <ChartCard title="领域分布分析 (Top 10)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.fieldData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                <XAxis type="number" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                <YAxis dataKey="name" type="category" width={80} stroke={isDark ? "#9ca3af" : "#4b5563"} />
                <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                    {stats.fieldData.slice(0, 10).map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 籍贯分布图 */}
          <ChartCard title="籍贯分布热点 (Top 10)">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.provinceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.provinceData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 出生年代分布 */}
          <ChartCard title="科学家出生年代分布" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.yearData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                <XAxis dataKey="name" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, suffix, icon, color }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700 flex items-center"
        >
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white text-xl mr-4 shadow-lg`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {value} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{suffix}</span>
                </p>
            </div>
        </motion.div>
    )
}

function ChartCard({ title, children, className = "" }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700 ${className}`}
        >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 border-l-4 border-red-500 pl-3">{title}</h3>
            {children}
        </motion.div>
    )
}
