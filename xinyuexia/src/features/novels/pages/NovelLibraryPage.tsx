import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react';

import { NewNovelModal } from '@/features/novels/components/NewNovelModal';
import { NovelCard } from '@/features/novels/components/NovelCard';
import { RecycleBinModal } from '@/features/novels/components/RecycleBinModal';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import type { WorkType } from '@/features/novels/model/novelTypes';

export function NovelLibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workType: WorkType = location.pathname === '/scripts' ? 'script' : 'novel';
  const typeLabel = workType === 'novel' ? '小说' : '剧本';
  const title = workType === 'novel' ? '我的小说' : '我的剧本';

  const {
    categories,
    currentNovelId,
    recycledNovels,
    getNovelsByType,
    createNovel,
    renameNovel,
    moveToRecycle,
    restoreNovel,
    permanentDelete,
    selectNovel,
  } = useNovelLibrary();

  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    setIsNewOpen(false);
    setIsRecycleOpen(false);
    setRenameTarget(null);
  }, [workType]);

  const sourceNovels = getNovelsByType(workType);
  const filters = ['全部', ...categories];
  const filteredNovels = useMemo(() => sourceNovels.filter((novel) => {
    const matchFilter = activeFilter === '全部' || novel.category === activeFilter;
    const matchSearch = !searchQuery.trim() || novel.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchFilter && matchSearch;
  }), [activeFilter, searchQuery, sourceNovels]);

  const handleOpen = (id: number) => {
    selectNovel(id);
    navigate('/workbench');
  };

  const confirmRename = () => {
    if (!renameTarget?.title.trim()) return;
    renameNovel(renameTarget.id, renameTarget.title);
    setRenameTarget(null);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${workType === 'novel' ? 'text-blue-600' : 'text-orange-500'}`}>{title}</h1>
            <p className="mt-1 text-sm text-gray-400">共 {sourceNovels.length} 部{typeLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <SlidersHorizontal className="h-4 w-4" />
              <span>作品卡片设置</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <Upload className="h-4 w-4" />
              <span>导入</span>
            </button>
            <button onClick={() => setIsRecycleOpen(true)} className="flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-red-600">
              <Trash2 className="h-4 w-4" />
              <span>回收站</span>
            </button>
            <button onClick={() => setIsNewOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <Plus className="h-4 w-4" />
              <span>新建{typeLabel}</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
                  activeFilter === filter
                    ? 'bg-brand text-white'
                    : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="novel-tag-font">{filter}</span>
                <span className={`text-xs ${activeFilter === filter ? 'text-white/70' : 'text-gray-400'}`}>
                  {filter === '全部' ? sourceNovels.length : sourceNovels.filter((novel) => novel.category === filter).length}
                </span>
              </button>
            ))}
          </div>

          <label className="relative w-[200px] shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-colors focus:border-brand"
              placeholder={`搜索${typeLabel}`}
            />
          </label>
        </div>

        {filteredNovels.length === 0 ? (
          <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
            <p className="text-sm text-gray-500">暂无{typeLabel}</p>
            <button onClick={() => setIsNewOpen(true)} className="mt-3 rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
              新建{typeLabel}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {filteredNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                isSelected={currentNovelId === novel.id}
                onOpen={handleOpen}
                onRename={(id, currentTitle) => setRenameTarget({ id, title: currentTitle })}
                onDelete={moveToRecycle}
              />
            ))}
          </div>
        )}
      </main>

      <NewNovelModal
        isOpen={isNewOpen}
        type={workType}
        categories={categories}
        onClose={() => setIsNewOpen(false)}
        onCreate={createNovel}
      />

      <RecycleBinModal
        isOpen={isRecycleOpen}
        type={workType}
        items={recycledNovels}
        onClose={() => setIsRecycleOpen(false)}
        onRestore={restoreNovel}
        onPermanentDelete={permanentDelete}
      />

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRenameTarget(null)}>
          <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-gray-900">修改作品名称</h3>
            <input
              value={renameTarget.title}
              onChange={(event) => setRenameTarget({ ...renameTarget, title: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') confirmRename(); }}
              className="mb-5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm transition-colors focus:border-brand"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setRenameTarget(null)} className="px-4 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700">
                取消
              </button>
              <button onClick={confirmRename} className="rounded-lg bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
