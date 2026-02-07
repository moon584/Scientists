import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ScientistAvatar from './ScientistAvatar';

interface Scientist {
  id: string;
  name: string;
  avatar: string;
  field: string;
  tags: string[];
  bio: string;
  references: string[];
}

interface ScientistCardProps {
  scientist: Scientist;
}

export default function ScientistCard({ scientist }: ScientistCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-red-100 dark:border-red-900 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative p-6 flex justify-center bg-gradient-to-b from-red-50 to-white dark:from-gray-800 dark:to-gray-750">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-md transition-all duration-500 group-hover:border-red-500 dark:group-hover:border-red-400">
          <ScientistAvatar
            src={scientist.avatar}
            alt={scientist.name}
            className="w-full h-full"
          />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-center text-xl font-bold text-gray-800 dark:text-white mb-1 transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">{scientist.name}</h3>
        <p className="text-center text-red-600 dark:text-red-400 text-sm mb-3">{scientist.field}</p>
        
        <div className="flex flex-wrap gap-2 mb-3 justify-center">
          {scientist.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 flex-grow">
          {scientist.bio}
        </p>
        <Link
          to={`/scientist/${scientist.id}`}
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-300 mt-2 group-hover:shadow-md"
        >
          查看详情
          <motion.span 
            initial={{ x: 0 }} 
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <i className="fas fa-arrow-right ml-2 text-sm"></i>
          </motion.span>
        </Link>
      </div>
    </motion.div>
  );
}