import { Plus, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { NewNovelModal } from '@/features/novels/components/NewNovelModal';
import { NovelCard, type NovelCardSettings } from '@/features/novels/components/NovelCard';
import { RecycleBinModal } from '@/features/novels/components/RecycleBinModal';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import type { Novel, WorkType } from '@/features/novels/model/novelTypes';

const CARD_SETTINGS_KEY = 'xinyuexia_novel_card_settings_v1';

function loadCardSettings(): NovelCardSettings {
  try {
    const raw = localStorage.getItem(CARD_SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as NovelCardSettings) : { cardWidth: 'small', coverHeight: 'medium' };
  } catch {
    return { cardWidth: 'small', coverHeight: 'medium' };
  }
}

function saveCardSettings(settings: NovelCardSettings) {
  localStorage.setItem(CARD_SETTINGS_KEY, JSON.stringify(settings));
}

function CardSettingsModal({
  isOpen,
  settings,
  onClose,
  onChange,
}: {
  isOpen: boolean;
  settings: NovelCardSettings;
  onClose: () => void;
  onChange: (next: NovelCardSettings) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[420px] rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">作品卡片设置</h2>
            <p className="mt-0.5 text-xs text-gray-400">调整作品卡片宽度和封面高度。</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">卡片宽度</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => onChange({ ...settings, cardWidth: value })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
                    settings.cardWidth === value ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {value === 'small' ? '小' : value === 'medium' ? '中' : '大'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">封面高度</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => onChange({ ...settings, coverHeight: value })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs ${
                    settings.coverHeight === value ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {value === 'small' ? '小' : value === 'medium' ? '中' : '大'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg bg-brand px-5 py-2 text-xs text-white hover:bg-brand-dark">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverModal({
  isOpen,
  novel,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  novel: Novel | null;
  onClose: () => void;
  onSave: (cover?: string) => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(novel?.cover ?? '');
  }, [novel]);

  if (!isOpen || !novel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[460px] rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">设置封面</h2>
          <p className="mt-0.5 text-xs text-gray-400">{novel.title}</p>
        </div>
        <div className="space-y-4 p-6">
          <label className="block text-xs font-medium text-gray-600">封面地址</label>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="输入图片 URL 或 data URL"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex justify-between border-t border-gray-100 px-6 py-4">
          <button onClick={() => onSave(undefined)} className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-600 hover:bg-red-50">
            清空封面
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button onClick={() => onSave(value.trim() || undefined)} className="rounded-lg bg-brand px-5 py-2 text-xs text-white hover:bg-brand-dark">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NovelLibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workType: WorkType = location.pathname === '/scripts' ? 'script' : 'novel';
  const typeLabel = workType === 'novel' ? '小说' : '剧本';
  const title = workType === 'novel' ? '我的小说' : '我的剧本';

  const {
    novels,
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
    updateCover,
    importNovels,
  } = useNovelLibrary();

  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: number; title: string } | null>(null);
  const [coverTargetId, setCoverTargetId] = useState<number | null>(null);
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [cardSettings, setCardSettings] = useState<NovelCardSettings>(loadCardSettings);
  const [notice, setNotice] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsNewOpen(false);
    setIsRecycleOpen(false);
    setRenameTarget(null);
    setCoverTargetId(null);
    setNotice('');
  }, [workType]);

  const sourceNovels = getNovelsByType(workType);
  const filters = ['全部', ...categories];
  const filteredNovels = useMemo(() => sourceNovels.filter((novel) => {
    const matchFilter = activeFilter === '全部' || novel.category === activeFilter;
    const matchSearch = !searchQuery.trim() || novel.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchFilter && matchSearch;
  }), [activeFilter, searchQuery, sourceNovels]);

  const coverTarget = novels.find((novel) => novel.id === coverTargetId) ?? null;

  const handleOpen = (id: number) => {
    const novel = novels.find((item) => item.id === id);
    if (!novel) return;
    selectNovel(id);
    navigate(novel.type === 'script' ? '/script-editor-v2' : '/workbench');
  };

  const confirmRename = () => {
    if (!renameTarget?.title.trim()) return;
    renameNovel(renameTarget.id, renameTarget.title);
    setRenameTarget(null);
  };

  const handleExportNovel = (id: number) => {
    const novel = novels.find((item) => item.id === id);
    if (!novel) return;
    const blob = new Blob([JSON.stringify(novel, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${novel.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`已导出 ${novel.title}`);
  };

  const handleImport = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as Novel | Novel[] | { novels?: Novel[] };
      const items = Array.isArray(parsed)
        ? parsed
        : 'novels' in parsed && Array.isArray(parsed.novels)
          ? parsed.novels
          : [parsed as Novel];
      importNovels(items.filter(Boolean));
      setNotice(`已导入 ${items.length} 个作品`);
    } catch {
      setNotice('导入文件格式不正确');
    }
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
            <button onClick={() => setShowCardSettings(true)} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <SlidersHorizontal className="h-4 w-4" />
              <span>作品卡片设置</span>
            </button>
            <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
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

        {notice && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {notice}
          </div>
        )}

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
                <span>{filter}</span>
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
                settings={cardSettings}
                onOpen={handleOpen}
                onRename={(id, currentTitle) => setRenameTarget({ id, title: currentTitle })}
                onCover={(id) => setCoverTargetId(id)}
                onExport={handleExportNovel}
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

      <CardSettingsModal
        isOpen={showCardSettings}
        settings={cardSettings}
        onClose={() => setShowCardSettings(false)}
        onChange={(next) => {
          setCardSettings(next);
          saveCardSettings(next);
        }}
      />

      <CoverModal
        isOpen={coverTargetId !== null}
        novel={coverTarget}
        onClose={() => setCoverTargetId(null)}
        onSave={(cover) => {
          if (coverTargetId !== null) updateCover(coverTargetId, cover);
          setCoverTargetId(null);
          setNotice('封面已更新');
        }}
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

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleImport(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
