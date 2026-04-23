import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import scientistsData from "../data/scientists.json";
import { useAuth } from "@/contexts/authContext";
import ScientistAvatar from "../components/ScientistAvatar";
import BackToTop from "../components/BackToTop";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface Scientist {
  id: string;
  name: string;
  avatar: string;
  field: string[];
  tags: string[];
  bio: string;
  motto?: string;
  references: string[];
}

export default function ScientistDetail() {
  const { id } = useParams<{
    id: string;
  }>();

  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [scientist, setScientist] = useState<Scientist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    // 使用微任务替代 setTimeout 300ms，数据就绪后立即显示
    Promise.resolve().then(() => {
      const index = scientistsData.findIndex((s) => s.id === id);
      const foundScientist = scientistsData[index];

      if (foundScientist) {
        setScientist(foundScientist);
        // 计算上一位和下一位
        const prevIndex =
          (index - 1 + scientistsData.length) % scientistsData.length;
        const nextIndex = (index + 1) % scientistsData.length;
        setPrevId(scientistsData[prevIndex].id);
        setNextId(scientistsData[nextIndex].id);
      } else {
        setScientist(null);
      }
      setIsLoading(false);
    });
  }, [id, token]);

  const handleTribute = async () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ef4444", "#dc2626", "#f87171"],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {}
        <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              aria-label="返回首页"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="ml-4 text-xl font-bold text-gray-800 dark:text-white">
              返回
            </h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {}
            <div className="relative bg-gradient-to-r from-red-700 to-red-500">
              <div className="relative container mx-auto px-6 py-12 md:py-16">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-700 bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
                  <div className="text-center md:text-left">
                    <div className="h-8 md:h-10 w-48 md:w-64 bg-white/30 backdrop-blur-sm rounded-md animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-white/20 backdrop-blur-sm rounded-md animate-pulse mb-4"></div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-6 w-24 bg-white/20 backdrop-blur-sm rounded-full animate-pulse"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {}
            <div className="p-6 md:p-8">
              <div className="mb-8">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
                </div>
              </div>
              <div>
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-4"></div>
                <div className="h-32 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!scientist) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 dark:text-red-400 text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
            科学家不存在
          </h2>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <BackToTop />
      {}
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
            <h1 className="ml-4 text-xl font-bold text-gray-800 dark:text-white">
              返回
            </h1>
          </div>
        </div>
      </div>
      {}
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.5,
        }}
        className="container mx-auto px-4 py-8"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-500 opacity-90"></div>
            <div className="relative container mx-auto px-6 py-12 md:py-16">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <motion.div
                  initial={{
                    scale: 0.8,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    delay: 0.15,
                    duration: 0.4,
                  }}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-700 overflow-hidden shadow-lg"
                >
                  <ScientistAvatar
                    src={scientist.avatar}
                    alt={scientist.name}
                    className="w-full h-full hover:scale-110 transition-transform duration-700"
                  />
                </motion.div>
                <motion.div
                  initial={{
                    y: 20,
                    opacity: 0,
                  }}
                  animate={{
                    y: 0,
                    opacity: 1,
                  }}
                  transition={{
                    delay: 0.3,
                    duration: 0.4,
                  }}
                  className="text-center md:text-left"
                >
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {scientist.name}
                  </h2>
                  <p className="text-red-100 text-lg mb-4">
                    {scientist.field.join("、")}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    {scientist.tags.map((tag, index) => (
                      <motion.span
                        key={index}
                        initial={{
                          opacity: 0,
                          x: -10,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: 0.4 + index * 0.06,
                          duration: 0.25,
                        }}
                        className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          {}
          <div className="p-6 md:p-8">
            <motion.div
              initial={{
                y: 20,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                delay: 0.5,
                duration: 0.5,
              }}
              className="mb-8"
            >
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <i className="fas fa-user-circle text-red-600 dark:text-red-400 mr-2"></i>
                个人简介
              </h3>
              <div className="text-gray-600 dark:text-gray-300 leading-relaxed p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border-l-4 border-red-500">
                <div
                  style={{
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                >
                  {scientist.bio.split("\n").map(
                    (paragraph, idx) =>
                      paragraph.trim() && (
                        <p key={idx} className="mb-4 last:mb-0">
                          {paragraph.trim()}
                        </p>
                      ),
                  )}
                </div>
              </div>
              {}
              {scientist.motto && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <i className="fas fa-quote-left text-red-500 mr-2 opacity-70"></i>
                    院士寄语
                  </h4>
                  <div className="relative p-5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="absolute top-2 left-3 text-4xl text-red-200 dark:text-red-900/50 font-serif opacity-50">
                      "
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-lg font-medium italic text-center px-4 relative z-10 font-serif">
                      {scientist.motto}
                    </p>
                    <div className="absolute bottom-[-10px] right-4 text-4xl text-red-200 dark:text-red-900/50 font-serif opacity-50 rotate-180">
                      "
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
            {}
            <motion.div
              initial={{
                y: 20,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                delay: 0.6,
                duration: 0.5,
              }}
            >
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <i className="fas fa-book text-red-600 dark:text-red-400 mr-2"></i>
                相关资料
              </h3>
              {scientist.references.length > 0 ? (
                <ul className="space-y-3">
                  {scientist.references.map((ref, index) => (
                    <li key={index}>
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-gray-50 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-all group"
                      >
                        <div className="mr-3 text-red-600 dark:text-red-400">
                          <i className="fas fa-file-pdf text-2xl group-hover:scale-110 transition-transform"></i>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-red-700 dark:group-hover:text-red-400 block break-all">
                            {scientist.name} - 院士名片.pdf
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                            点击查看完整文档
                          </span>
                        </div>
                        <i className="fas fa-external-link-alt ml-2 text-gray-400 group-hover:text-red-500 transition-colors"></i>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <i className="fas fa-file-alt text-4xl text-gray-400 dark:text-gray-600 mb-3"></i>
                  <p className="text-gray-500 dark:text-gray-400">
                    暂无相关资料
                  </p>
                </div>
              )}
            </motion.div>

            {/* 献花互动区域 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-12 mb-8 p-6 bg-red-50 dark:bg-red-900/10 rounded-xl text-center border border-red-100 dark:border-red-900/30"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                向科学家致敬
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                点击下方按钮，为{scientist.name}院士献上一束花
              </p>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleTribute}
                className="relative group inline-flex flex-col items-center justify-center w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-md border-4 border-red-100 dark:border-red-900/30 hover:border-red-200 hover:shadow-lg transition-all"
              >
                <span className="text-4xl filter drop-shadow-sm group-hover:-translate-y-1 transition-transform">
                  💐
                </span>
                <span className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                  999+
                </span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
              </motion.button>
            </motion.div>

            {}
            <div className="mt-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-8">
              <button
                onClick={() => navigate(`/scientist/${prevId}`)}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <i className="fas fa-chevron-left mr-2"></i>
                <span className="hidden sm:inline">上一位科学家</span>
              </button>

              <motion.button
                whileHover={{
                  scale: 1.05,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                onClick={() => navigate("/")}
                className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                <i className="fas fa-th-large mr-2"></i>返回列表
              </motion.button>

              <button
                onClick={() => navigate(`/scientist/${nextId}`)}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <span className="hidden sm:inline">下一位科学家</span>
                <i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
