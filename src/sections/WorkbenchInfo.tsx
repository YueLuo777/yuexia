import { useNovelsContext } from '@/hooks/useNovels';
import { Sparkles } from 'lucide-react';

export default function WorkbenchInfo() {
  const { novels, currentNovelId, renameNovel, updateNovelSynopsis } = useNovelsContext();
  const currentNovel = novels.find((n) => n.id === currentNovelId);

  const title = currentNovel?.title || '未命名作品';
  const synopsis = currentNovel?.synopsis || '';

  const handleTitleChange = (value: string) => {
    if (currentNovelId) {
      renameNovel(currentNovelId, value);
    }
  };

  const handleSynopsisChange = (value: string) => {
    if (currentNovelId) {
      updateNovelSynopsis(currentNovelId, value);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-white min-w-0 overflow-y-auto">
      {/* 作品信息内容区 */}
      <div className="flex-1 flex flex-col px-5 pb-5 space-y-4 pt-4">
        {/* 书名 */}
        <div className="p-4 border border-gray-200 rounded-lg shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-900">书名</h3>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 取名</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value.slice(0, 20))}
              placeholder="请输入书名"
              maxLength={20}
              className="w-[280px] px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand"
            />
            <span className="text-xs text-gray-400 shrink-0">{title.length}/20</span>
          </div>
        </div>

        {/* 作品简介 - 填满剩余空间 */}
        <div className="flex-1 flex flex-col p-4 border border-gray-200 rounded-lg min-h-[200px]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-base font-bold text-gray-900">作品简介</h3>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 简介</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-2 shrink-0">控制在 150 字以内，提炼题材与冲突。</p>
          <textarea
            value={synopsis}
            onChange={(e) => handleSynopsisChange(e.target.value)}
            placeholder="请输入简介……"
            className="flex-1 min-h-0 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none overflow-y-auto"
          />
        </div>
      </div>
    </main>
  );
}
