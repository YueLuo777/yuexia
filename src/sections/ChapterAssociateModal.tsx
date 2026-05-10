import { useState, useEffect } from 'react';
import { X, Link2 } from 'lucide-react';

interface ChapterItem {
  id: number;
  serialNumber: number;
  wordCount: number;
}

interface ChapterAssociateModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: ChapterItem[];
  onAssociate: (selectedIds: number[]) => void;
}

export default function ChapterAssociateModal({ isOpen, onClose, chapters, onAssociate }: ChapterAssociateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 弹窗打开时，从 localStorage 恢复之前保存的关联状态
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('associated_chapters');
      if (raw) {
        const ids: number[] = JSON.parse(raw);
        // 只保留当前弹窗中存在的章节
        const validIds = new Set(ids.filter((id) => chapters.some((c) => c.id === id)));
        setSelectedIds(validIds);
      }
    } catch {
      setSelectedIds(new Set());
    }
  }, [isOpen, chapters]);

  if (!isOpen) return null;

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRecent = (count: number) => {
    const recent = chapters.slice(-count).map((c) => c.id);
    setSelectedIds(new Set(recent));
  };

  const selectAll = () => setSelectedIds(new Set(chapters.map((c) => c.id)));
  const clearAll = () => setSelectedIds(new Set());

  const selectedCount = selectedIds.size;
  const totalWordCount = chapters
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + (c.wordCount || 0), 0);

  const handleConfirm = () => {
    onAssociate(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col w-[420px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-gray-900">关联章节</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 快捷选择 + 统计 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => selectRecent(5)} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              近5章
            </button>
            <button onClick={() => selectRecent(10)} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              近10章
            </button>
            <button onClick={() => selectRecent(50)} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              近50章
            </button>
            <button onClick={() => selectRecent(100)} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              近100章
            </button>
            <button onClick={selectAll} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              全选
            </button>
            <button onClick={clearAll} className="px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              清空
            </button>
          </div>
          <div className="text-[10px] text-gray-500 shrink-0 ml-2">
            <span className="text-brand font-bold">{selectedCount}</span> 章 · <span className="text-brand font-bold">{totalWordCount.toLocaleString()}</span> 字
          </div>
        </div>

        {/* 章节列表 — 紧凑网格 每行5章 */}
        <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: '320px' }}>
          {chapters.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">暂无章节</div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {chapters.map((chapter) => {
                const isSelected = selectedIds.has(chapter.id);
                return (
                  <button
                    key={chapter.id}
                    onClick={() => toggle(chapter.id)}
                    className={`flex items-center justify-center px-1 py-1.5 rounded text-[11px] transition-colors border ${
                      isSelected
                        ? 'bg-brand-light border-brand text-brand-dark font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    第{chapter.serialNumber}章
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 shrink-0">
          <span className="text-[10px] text-gray-500">
            已选 <span className="text-brand font-bold">{selectedCount}</span> 章 · <span className="text-brand font-bold">{totalWordCount.toLocaleString()}</span> 字
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              确认关联
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
