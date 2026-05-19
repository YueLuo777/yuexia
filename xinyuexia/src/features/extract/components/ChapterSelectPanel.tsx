import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ExtractChapter, ExtractNovel } from '@/features/extract/model/extractTypes';

interface ChapterSelectPanelProps {
  novels: ExtractNovel[];
  selectedNovelId: number | null;
  selectedChapterIds: Set<number>;
  onSelectNovel: (id: number) => void;
  onToggleChapter: (id: number) => void;
  onSelectFirst: (count: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

function chapterLabel(chapter: ExtractChapter) {
  return `第${chapter.serialNumber}章${chapter.title ? ` ${chapter.title}` : ''}`;
}

export function ChapterSelectPanel({
  novels,
  selectedNovelId,
  selectedChapterIds,
  onSelectNovel,
  onToggleChapter,
  onSelectFirst,
  onSelectAll,
  onClear,
}: ChapterSelectPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const selectedNovel = novels.find((novel) => novel.id === selectedNovelId) ?? novels[0] ?? null;
  const groups = useMemo(() => {
    if (!selectedNovel) return [];
    const result: ExtractChapter[][] = [];
    for (let i = 0; i < selectedNovel.chapters.length; i += 50) {
      result.push(selectedNovel.chapters.slice(i, i + 50));
    }
    return result;
  }, [selectedNovel]);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">关联小说</h2>
          <span className="text-xs text-gray-400">{selectedChapterIds.size} 章已选</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {novels.map((novel) => (
            <button
              key={novel.id}
              onClick={() => onSelectNovel(novel.id)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                selectedNovel?.id === novel.id
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{novel.title}</div>
              <div className="mt-0.5 text-[10px] text-gray-400">{novel.chapters.length} 章</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
        <button onClick={onSelectAll} className="rounded-md bg-brand px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark">全选</button>
        <button onClick={() => onSelectFirst(50)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">选择50章</button>
        <button onClick={() => onSelectFirst(30)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">选择30章</button>
        <button onClick={() => onSelectFirst(10)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">选择10章</button>
        <button onClick={onClear} className="ml-auto rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">清空</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNovel || selectedNovel.chapters.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">暂无章节</div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, index) => {
              const start = index * 50 + 1;
              const end = start + group.length - 1;
              const collapsed = collapsedGroups[index] ?? false;
              const selectedCount = group.filter((chapter) => selectedChapterIds.has(chapter.id)).length;

              return (
                <div key={index} className="overflow-hidden rounded-lg border border-gray-100">
                  <button
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [index]: !collapsed }))}
                    className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      第{start}-{end}章
                    </span>
                    <span className="text-[10px] text-gray-400">{selectedCount}/{group.length}</span>
                  </button>
                  {!collapsed && (
                    <div className="grid grid-cols-10 gap-1.5 p-3">
                      {group.map((chapter) => {
                        const selected = selectedChapterIds.has(chapter.id);
                        return (
                          <button
                            key={chapter.id}
                            onClick={() => onToggleChapter(chapter.id)}
                            title={chapterLabel(chapter)}
                            className={`aspect-square rounded-md border text-[11px] font-medium transition-colors ${
                              selected
                                ? 'border-brand bg-brand-light text-brand'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-brand/60'
                            }`}
                          >
                            {chapter.serialNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
