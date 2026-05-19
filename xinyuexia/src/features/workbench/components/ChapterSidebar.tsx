import { ArchiveRestore, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

import type { Volume } from '@/features/workbench/model/workbenchTypes';

interface ChapterSidebarProps {
  volumes: Volume[];
  sortAsc: boolean;
  recycledCount: number;
  onToggleVolume: (volumeId: number) => void;
  onToggleSort: () => void;
  onSelectChapter: (volumeId: number, chapterId: number) => void;
  onAddChapter: (volumeId: number) => void;
  onAddVolume: () => void;
  onDeleteChapter: (volumeId: number, chapterId: number) => void;
  onOpenRecycle: () => void;
}

export function ChapterSidebar({
  volumes,
  sortAsc,
  recycledCount,
  onToggleVolume,
  onToggleSort,
  onSelectChapter,
  onAddChapter,
  onAddVolume,
  onDeleteChapter,
  onOpenRecycle,
}: ChapterSidebarProps) {
  const chapterCount = volumes.reduce((sum, volume) => sum + volume.chapters.length, 0);

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-gray-300 bg-white">
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="whitespace-nowrap text-sm font-bold text-gray-900">未发布</h2>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-xs font-medium text-brand-dark">
            {chapterCount}
          </span>
        </div>
        <button
          onClick={onOpenRecycle}
          className="relative rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
          title="章节回收站"
        >
          <ArchiveRestore className="h-4 w-4" />
          {recycledCount > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {volumes.map((volume) => {
          const chapters = [...volume.chapters].sort((a, b) => sortAsc ? a.serialNumber - b.serialNumber : b.serialNumber - a.serialNumber);

          return (
            <div key={volume.id} className="mb-1">
              <div className="group flex h-[36px] items-center gap-1 rounded-md bg-brand-light px-2 py-1.5 transition-colors hover:bg-brand/10">
                <button onClick={() => onToggleVolume(volume.id)} className="flex flex-1 items-center gap-1.5 text-left">
                  {volume.isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-brand-dark" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-brand-dark" />
                  )}
                  <span className="text-sm font-medium text-brand-dark">{volume.name}</span>
                  <span className="ml-1 text-xs text-gray-400">{volume.chapters.length}章</span>
                </button>
                <button
                  onClick={() => onAddChapter(volume.id)}
                  className="flex h-8 w-8 items-center justify-center rounded text-brand-dark transition-colors hover:bg-brand/20"
                  title="新增章节"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {volume.isExpanded && (
                <div className="ml-1 mt-0.5 space-y-0.5">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className={`group flex items-center rounded-md border-l-[3px] transition-colors ${
                        chapter.isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => onSelectChapter(volume.id, chapter.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                      >
                        <span className={`flex-1 truncate whitespace-nowrap text-sm font-medium ${chapter.isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
                          第{chapter.serialNumber}章{chapter.title ? ` ${chapter.title}` : ''}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">{chapter.wordCount}</span>
                      </button>
                      <button
                        onClick={() => onDeleteChapter(volume.id, chapter.id)}
                        className="mr-1 rounded p-1 text-gray-300 opacity-60 transition-colors hover:bg-red-50 hover:text-red-500 hover:opacity-100 group-hover:opacity-100"
                        title="删除章节"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 border-t border-gray-100 px-2 py-2">
        <button onClick={onAddVolume} className="flex-1 rounded-md bg-brand px-1 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark">
          新增卷
        </button>
        <button onClick={onToggleSort} className="flex-1 rounded-md bg-brand px-1 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark">
          {sortAsc ? '倒序' : '正序'}
        </button>
      </div>
    </aside>
  );
}
