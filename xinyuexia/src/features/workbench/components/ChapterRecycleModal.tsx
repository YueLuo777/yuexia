import { ArchiveRestore, Trash2, X } from 'lucide-react';

import type { RecycledChapter } from '@/features/workbench/model/workbenchTypes';

interface ChapterRecycleModalProps {
  isOpen: boolean;
  chapters: RecycledChapter[];
  onClose: () => void;
  onRestore: (chapterId: number) => void;
  onPermanentDelete: (chapterId: number) => void;
}

export function ChapterRecycleModal({ isOpen, chapters, onClose, onRestore, onPermanentDelete }: ChapterRecycleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-[420px] max-h-[80vh] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">章节回收站</h3>
            <p className="mt-0.5 text-xs text-gray-400">删除的章节会暂存在这里，可以恢复或彻底删除。</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {chapters.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200">
              <ArchiveRestore className="mb-3 h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-500">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-medium text-gray-900">
                        第{chapter.serialNumber}章{chapter.title ? ` ${chapter.title}` : ''}
                      </h4>
                      <p className="mt-1 text-xs text-gray-400">{chapter.volumeName} · 删除于 {chapter.deletedAt} · 到期 {chapter.expireAt}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => onRestore(chapter.id)} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50">
                        恢复
                      </button>
                      <button onClick={() => onPermanentDelete(chapter.id)} className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                        <span>彻底删除</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
