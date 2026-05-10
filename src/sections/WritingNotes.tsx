import { useState, useEffect } from 'react';
import { Plus, X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';

interface MemoItem {
  id: string;
  title: string;
  content: string;
  type: 'permanent' | 'temporary';
  deleted?: boolean;
}

const STORAGE_KEY = 'memo_data_v1';

function loadMemosForNovel(novelKey: string): MemoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return data[novelKey] || [];
    }
  } catch { /* ignore */ }
  return [];
}

// 自动生成标题：永久1新、永久2新… 或 临时1新、临时2新…
// 自动检测断号并补全最小可用序号
function generateTitle(type: 'permanent' | 'temporary', memos: MemoItem[]): string {
  const prefix = type === 'permanent' ? '永久' : '临时';
  const existing = memos
    .filter((m) => m.type === type && !m.deleted)
    .map((m) => {
      const match = m.title.match(new RegExp(`^${prefix}(\\d+)新?$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  let next = 1;
  for (const n of existing) {
    if (n === next) next++;
    else if (n > next) break;
  }
  return `${prefix}${next}新`;
}

// ─── 新增/编辑弹窗 ───
function MemoEditModal({ isOpen, onClose, onSave, initialData, defaultType }: {
  isOpen: boolean; onClose: () => void; onSave: (item: MemoItem) => void;
  initialData?: MemoItem; defaultType: 'permanent' | 'temporary';
}) {
  const [form, setForm] = useState({ title: '', content: '' });
  useEffect(() => {
    if (initialData) setForm({ title: initialData.title, content: initialData.content });
    else setForm({ title: '', content: '' });
  }, [initialData, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave({
      id: initialData?.id ?? Date.now().toString(),
      title: form.title.trim(),
      content: form.content.trim(),
      type: initialData?.type ?? defaultType,
    });
    setForm({ title: '', content: '' });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">{initialData ? '编辑备忘' : '新增备忘'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="请输入标题" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="请输入备忘内容" rows={6} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.title.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">确认</button>
        </div>
      </div>
    </div>
  );
}

// ─── 删除确认弹窗（永久备忘） ───
function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[360px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">删除确认</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">确定要将「{title}」移入回收站吗？</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">确认删除</button>
        </div>
      </div>
    </div>
  );
}

// ─── 回收站弹窗 ───
function TrashModal({ isOpen, onClose, trashedMemos, onRestore, onPermaDelete }: {
  isOpen: boolean; onClose: () => void;
  trashedMemos: MemoItem[];
  onRestore: (id: string) => void;
  onPermaDelete: (id: string) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] max-h-[70vh] bg-white rounded-xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">回收站</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {trashedMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Trash2 className="w-10 h-10 mb-2 text-gray-200" />
              <p className="text-sm">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trashedMemos.map((memo) => (
                <div key={memo.id} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="flex-1 text-sm text-gray-700 truncate">{memo.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 bg-gray-200">{memo.type === 'permanent' ? '永久' : '临时'}</span>
                  <button onClick={() => onRestore(memo.id)} className="p-1.5 text-brand hover:bg-brand-light rounded transition-colors" title="恢复">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm('彻底删除后无法恢复，确定吗？')) onPermaDelete(memo.id); }} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="彻底删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">关闭</button>
        </div>
      </div>
    </div>
  );
}

export default function WritingNotes() {
  const { currentNovelId } = useNovelsContext();
  const novelKey = `novel_${currentNovelId}`;
  const [memos, setMemos] = useState<MemoItem[]>(() => loadMemosForNovel(novelKey));
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(`memo_selected_${novelKey}`); } catch { return null; }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'permanent' | 'temporary'>('permanent');
  const [editingMemo, setEditingMemo] = useState<MemoItem | undefined>(undefined);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemoItem | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // 作品切换时重新加载数据
  useEffect(() => {
    setMemos(loadMemosForNovel(novelKey));
    setSelectedId(null);
  }, [currentNovelId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data[novelKey] = memos;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [memos, novelKey]);

  // 选中记录持久化
  useEffect(() => {
    try {
      if (selectedId) localStorage.setItem(`memo_selected_${novelKey}`, selectedId);
      else localStorage.removeItem(`memo_selected_${novelKey}`);
    } catch { /* ignore */ }
  }, [selectedId, novelKey]);

  const permanentMemos = memos.filter((m) => m.type === 'permanent' && !m.deleted);
  const temporaryMemos = memos.filter((m) => m.type === 'temporary' && !m.deleted);
  const trashedMemos = memos.filter((m) => m.deleted);
  const selectedMemo = memos.find((m) => m.id === selectedId && !m.deleted) ?? null;

  const handleAdd = (type: 'permanent' | 'temporary') => {
    const title = generateTitle(type, memos);
    const newItem: MemoItem = {
      id: Date.now().toString(),
      title,
      content: '',
      type,
    };
    setMemos((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  const handleEdit = (memo: MemoItem) => {
    setModalType(memo.type);
    setEditingMemo(memo);
    setIsModalOpen(true);
  };

  const handleSave = (item: MemoItem) => {
    if (editingMemo) {
      setMemos((prev) => prev.map((m) => m.id === item.id ? item : m));
    } else {
      setMemos((prev) => [...prev, item]);
      setSelectedId(item.id);
    }
  };

  // 删除：永久备忘弹窗确认，临时备忘直接进回收站
  const handleDelete = (memo: MemoItem) => {
    if (memo.type === 'permanent') {
      setDeleteTarget(memo);
      setIsDeleteOpen(true);
    } else {
      // 临时备忘直接移入回收站，无需弹窗
      setMemos((prev) => prev.map((m) => m.id === memo.id ? { ...m, deleted: true } : m));
      if (selectedId === memo.id) setSelectedId(null);
    }
  };

  // 确认删除（永久备忘）→ 移入回收站
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setMemos((prev) => prev.map((m) => m.id === deleteTarget.id ? { ...m, deleted: true } : m));
    if (selectedId === deleteTarget.id) setSelectedId(null);
  };

  // 恢复
  const handleRestore = (id: string) => {
    setMemos((prev) => prev.map((m) => m.id === id ? { ...m, deleted: false } : m));
  };

  // 彻底删除
  const handlePermaDelete = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  // 监听外部触发回收站弹窗的事件
  useEffect(() => {
    const handleOpenTrash = () => setIsTrashOpen(true);
    window.addEventListener('open_memo_trash', handleOpenTrash);
    return () => window.removeEventListener('open_memo_trash', handleOpenTrash);
  }, []);

  return (
    <main className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：永久备忘 */}
        <div className="w-[200px] flex flex-col bg-gray-50 border-r border-gray-200 shrink-0">
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0">
            <span className="text-sm font-bold text-gray-800">永久备忘</span>
            <button onClick={() => handleAdd('permanent')} className="px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm">
              <Plus className="w-3 h-3 inline -mt-0.5 mr-0.5" />
              新增
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {permanentMemos.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-400">暂无永久记录</p>
                <p className="text-[10px] text-gray-300 mt-1">重要备忘将长期保存</p>
              </div>
            )}
            {permanentMemos.map((memo) => (
              <div key={memo.id} className="group flex items-center gap-1 mb-1.5">
                <button
                  onClick={() => setSelectedId(memo.id)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-left text-sm transition-all truncate border ${
                    selectedId === memo.id
                      ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium shadow-sm'
                      : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm text-gray-700'
                  }`}
                >
                  {memo.title}
                </button>
                <button
                  onClick={() => handleDelete(memo)}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 中栏：临时备忘 */}
        <div className="w-[200px] flex flex-col bg-white border-r border-gray-200 shrink-0 shadow-[inset_-4px_0_8px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0">
            <span className="text-sm font-bold text-gray-800">临时备忘</span>
            <button onClick={() => handleAdd('temporary')} className="px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm">
              <Plus className="w-3 h-3 inline -mt-0.5 mr-0.5" />
              新增
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {temporaryMemos.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-400">暂无临时记录</p>
                <p className="text-[10px] text-gray-300 mt-1">临时备忘可随时清理</p>
              </div>
            )}
            {temporaryMemos.map((memo) => (
              <div key={memo.id} className="group flex items-center gap-1 mb-1.5">
                <button
                  onClick={() => setSelectedId(memo.id)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-left text-sm transition-all truncate border ${
                    selectedId === memo.id
                      ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium shadow-sm'
                      : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm text-gray-700'
                  }`}
                >
                  {memo.title}
                </button>
                <button
                  onClick={() => handleDelete(memo)}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          </div>

        {/* 右栏：编辑区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedMemo ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-gray-500 shrink-0 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">备忘录标题</span>
                  <input
                    type="text"
                    value={selectedMemo.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setMemos((prev) => prev.map((m) => m.id === selectedMemo.id ? { ...m, title: newTitle } : m));
                    }}
                    className="flex-1 min-w-0 text-sm font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={() => handleEdit(selectedMemo)}
                  className="ml-3 px-3 py-1 text-xs text-brand border border-brand/30 rounded hover:bg-brand-light transition-colors shrink-0"
                >
                  编辑
                </button>
              </div>
              <textarea
                value={selectedMemo.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setMemos((prev) => prev.map((m) => m.id === selectedMemo.id ? { ...m, content: newContent } : m));
                }}
                placeholder="请输入备忘内容..."
                className="flex-1 px-5 py-4 text-sm text-gray-700 bg-white resize-none focus:outline-none leading-relaxed"
              />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* 空表单占位 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-gray-500 shrink-0 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">备忘录标题</span>
                  <input
                    type="text"
                    disabled
                    placeholder="请先选择左侧记录"
                    className="flex-1 min-w-0 text-sm font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-gray-300"
                  />
                </div>
              </div>
              <textarea
                disabled
                placeholder="请输入备忘内容..."
                className="flex-1 px-5 py-4 text-sm text-gray-700 bg-white resize-none focus:outline-none leading-relaxed placeholder:text-gray-300"
              />
            </div>
          )}
        </div>
      </div>

      <MemoEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingMemo}
        defaultType={modalType}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title ?? ''}
      />
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        trashedMemos={trashedMemos}
        onRestore={handleRestore}
        onPermaDelete={handlePermaDelete}
      />
    </main>
  );
}
