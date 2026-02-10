import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-9xl font-bold text-red-600 dark:text-red-500">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-4">
          页面未找到
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
          抱歉，科学家们还在探索这片未知领域。请返回主页继续您的旅程。
        </p>
        
        <button
          onClick={() => navigate("/")}
          className="mt-8 px-8 py-3 bg-red-600 text-white rounded-full 
                     hover:bg-red-700 transition duration-300 shadow-lg 
                     hover:shadow-red-500/30 flex items-center mx-auto gap-2"
        >
          <i className="fas fa-home"></i>
          返回首页
        </button>
      </motion.div>
    </div>
  );
}
