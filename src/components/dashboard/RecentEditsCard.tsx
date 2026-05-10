import { useNavigate } from 'react-router-dom';
import { Book, BookOpen } from 'lucide-react';
import DashboardCard from './DashboardCard';
import type { Novel } from '@/hooks/useNovels';
import { useNovelsContext } from '@/hooks/useNovels';

interface RecentEditsCardProps {
  novels: Novel[];
  maxCount?: number;
}

/** 格式化时间为"X月X日 XX:XX"或"XX:XX" */
function formatTime(raw?: string): string {
  if (!raw) return '今天';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const now = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === now.toDateString()) return `${hours}:${minutes}`;
    return `${month}月${day}日 ${hours}:${minutes}`;
  } catch { return raw; }
}

export default function RecentEditsCard({ novels, maxCount = 4 }: RecentEditsCardProps) {
  const navigate = useNavigate();
  const { setCurrentNovel } = useNovelsContext();

  const sortedNovels = novels
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.lastModifiedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastModifiedAt || b.createdAt).getTime();
      return timeB - timeA;
    })
    .slice(0, maxCount);

  const handleClick = (novel: Novel) => {
    setCurrentNovel(novel.id);
    navigate('/workbench');
  };

  return (
    <DashboardCard
      width="100%"
      title="最近编辑"
    >
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
        {sortedNovels.map((novel) => {
          const isScript = novel.type === 'script';
          return (
            <button
              key={novel.id}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              onClick={() => handleClick(novel)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isScript ? 'bg-orange-50' : 'bg-brand-light'}`}>
                {isScript ? (
                  <BookOpen className="w-5 h-5 text-orange-500" />
                ) : (
                  <Book className="w-5 h-5 text-brand" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{novel.title}</p>
                <p className="text-xs text-gray-400">
                  更新时间 {formatTime(novel.lastModifiedAt || novel.createdAt)}
                </p>
              </div>
              {/* 属性标签 */}
              <span className={`px-3 py-1 text-sm font-medium rounded shrink-0 ${
                isScript
                  ? 'text-orange-600 bg-orange-50 border border-orange-100'
                  : 'text-blue-600 bg-blue-50 border border-blue-100'
              }`}>
                {isScript ? '剧本' : '小说'}
              </span>
            </button>
          );
        })}
        {sortedNovels.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 rounded-lg">
            暂无作品，点击上方"新建作品"开始创作
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
