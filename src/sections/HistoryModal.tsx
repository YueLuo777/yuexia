import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

export interface HistorySnapshot {
  id: string;
  chapterId: number;
  content: string;
  wordCount: number;
  timestamp: string;
  trigger: 'manual' | 'auto';
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: number;
  onRestore: (content: string) => void;
}

const STORAGE_KEY = 'editor_history_snapshots';

// 2. 加载所有快照
function loadAllSnapshots(): Record<string, HistorySnapshot[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// 保存快照（按章节隔离），5分钟节流，最多20个
export function saveSnapshot(chapterId: number, content: string) {
  try {
    const all = loadAllSnapshots();
    const key = String(chapterId);
    const list = all[key] || [];

    // 5分钟节流检查
    const now = Date.now();
    const lastSnapshot = list[list.length - 1];
    if (lastSnapshot) {
      const lastTime = Number(lastSnapshot.id);
      if (now - lastTime < 5 * 60 * 1000) return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date(now);
    const snapshot: HistorySnapshot = {
      id: String(now),
      chapterId,
      content,
      wordCount: content.length,
      timestamp: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      trigger: 'auto',
    };
    const newList = [...list, snapshot].slice(-20);
    all[key] = newList;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// 删除章节时同时删除其历史快照
export function deleteChapterSnapshots(chapterId: number) {
  try {
    const all = loadAllSnapshots();
    delete all[String(chapterId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// 删除作品时同时删除其所有章节的历史快照
export function deleteNovelSnapshots(chapterIds: number[]) {
  try {
    const all = loadAllSnapshots();
    chapterIds.forEach((id) => delete all[String(id)]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export default function HistoryModal({ isOpen, onClose, chapterId, onRestore }: HistoryModalProps) {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const all = loadAllSnapshots();
    setSnapshots(all[String(chapterId)] || []);
  }, [isOpen, chapterId]);

  const handleRestore = (snapshot: HistorySnapshot) => {
    onRestore(snapshot.content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[480px] max-h-[600px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">历史版本</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 说明 */}
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            用于误删/误覆盖恢复：每5分钟自动保存一次（有修改时），最多保留20个版本，章节删除时同步清除。
          </p>
        </div>

        {/* 快照列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RotateCcw className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">暂无历史快照</p>
              <p className="text-xs text-gray-300 mt-1">编辑内容后会自动创建快照</p>
            </div>
          ) : (
            [...snapshots].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-700">{s.timestamp}</span>
                    <span className="text-xs text-gray-400">
                      {s.wordCount}字 · {s.trigger === 'manual' ? '手动' : '自动'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{s.content.slice(0, 60)}</p>
                </div>
                <button
                  onClick={() => handleRestore(s)}
                  className="ml-3 px-3 py-1.5 text-xs text-brand border border-brand rounded-md hover:bg-brand-light transition-colors shrink-0"
                >
                  恢复
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
