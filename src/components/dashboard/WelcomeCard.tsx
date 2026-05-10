import { useNavigate } from 'react-router-dom';
import { BookOpen, Feather, FileText } from 'lucide-react';
import DashboardCard from './DashboardCard';

interface WelcomeCardProps {
  username: string;
  onNewNovel?: () => void;
  wordCount?: number;
  novelCount?: number;
}

function formatWordCount(count: number): string {
  if (count < 10000) {
    return String(count);
  } else if (count < 1000000) {
    const wan = (count / 10000).toFixed(1);
    return wan.replace(/\.0$/, '') + '万';
  } else {
    return Math.floor(count / 10000) + '万';
  }
}

export default function WelcomeCard({ username, onNewNovel: _onNewNovel, wordCount = 0, novelCount = 0 }: WelcomeCardProps) {
  void _onNewNovel;
  const navigate = useNavigate();

  return (
    <DashboardCard width="flex-1">
      <div className="flex items-center justify-between h-full">
        {/* 左侧：欢迎信息+按钮 */}
        <div className="flex flex-col justify-start h-full gap-6">
          <div className="flex items-center gap-4">
            <p className="text-xl font-bold text-gray-900">
              欢迎回来，<span className="text-orange-500 font-medium">{username}</span>！
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/workbench')}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>继续创作</span>
            </button>

          </div>
        </div>

        {/* 右侧：创作数据统计 */}
        <div className="flex items-center gap-6 pl-6 border-l border-gray-100">
          <div className="text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Feather className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">累计创作</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatWordCount(wordCount)} <span className="text-sm font-normal text-gray-500">字</span></p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">作品数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{novelCount}</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
