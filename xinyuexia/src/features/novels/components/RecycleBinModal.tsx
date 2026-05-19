import { RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';

import type { RecycledNovel, WorkType } from '@/features/novels/model/novelTypes';

interface RecycleBinModalProps {
  isOpen: boolean;
  type: WorkType;
  items: RecycledNovel[];
  onClose: () => void;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
}

export function RecycleBinModal({ isOpen, type, items, onClose, onRestore, onPermanentDelete }: RecycleBinModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeLabel = type === 'novel' ? '小说' : '剧本';
  const filtered = items.filter((item) => item.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-[520px] max-h-[80vh] w-[640px] max-w-[90vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{typeLabel}回收站</h3>
            <p className="mt-0.5 text-sm text-gray-400">删除后的作品会暂存在这里，确认无用后再彻底删除。</p>
            <p className="mt-0.5 text-xs text-gray-400">总数：{filtered.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>刷新</span>
            </button>
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200">
              <Trash2 className="mb-3 h-10 w-10 text-gray-300" />
              <p className="mb-1 text-sm text-gray-500">回收站为空</p>
              <p className="text-xs text-gray-400">删除的{typeLabel}会显示在这里。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((novel) => (
                <div key={novel.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-1 flex items-start justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{novel.title}</h4>
                    <span className="text-xs text-gray-400">{typeLabel}</span>
                  </div>
                  <p className="mb-2 text-xs text-gray-400">{novel.synopsis || '暂无简介'}</p>
                  <p className="mb-3 text-xs text-gray-400">删除于 {novel.deletedAt} · 到期 {novel.expireAt}</p>
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => onRestore(novel.id)} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50">
                      恢复
                    </button>
                    <button onClick={() => onPermanentDelete(novel.id)} className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                      <span>彻底删除</span>
                    </button>
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
