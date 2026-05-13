import { useState } from 'react';
import {
  Tag, Plus, X, Edit3, Trash2, CheckCircle,
} from 'lucide-react';

/* ─── 标签类型 ─── */
interface TagItem {
  id: string;
  name: string;
  color: string;
  count: number;
}

const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#94A3B8', '#64748B',
];

const STORAGE_KEY = 'tag_zone_v1';

function loadTags(): TagItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    { id: '1', name: '热血', color: '#EF4444', count: 12 },
    { id: '2', name: '战斗', color: '#F97316', count: 8 },
    { id: '3', name: '成长', color: '#10B981', count: 15 },
    { id: '4', name: '悬疑', color: '#8B5CF6', count: 6 },
    { id: '5', name: '爱情', color: '#EC4899', count: 10 },
    { id: '6', name: '科幻', color: '#3B82F6', count: 4 },
  ];
}

function saveTags(tags: TagItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); } catch { /* ignore */ }
}

export default function TagZone() {
  const [tags, setTags] = useState<TagItem[]>(loadTags);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2000);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newTag: TagItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: newColor,
      count: 0,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveTags(updated);
    setNewName('');
    setIsAdding(false);
    showToast('标签已创建');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定删除此标签吗？')) return;
    const updated = tags.filter(t => t.id !== id);
    setTags(updated);
    saveTags(updated);
    showToast('标签已删除');
  };

  const handleEditStart = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) return;
    const updated = tags.map(t => t.id === id ? { ...t, name: editName.trim() } : t);
    setTags(updated);
    saveTags(updated);
    setEditingId(null);
    showToast('标签已更新');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-violet-600" />
          </div>
          <h1 className="text-base font-bold text-gray-900">标签专区</h1>
          <span className="px-2 py-0.5 text-xs text-white bg-violet-500 rounded-md">
            {tags.length} 个标签
          </span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-500 rounded-md hover:bg-violet-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新建标签
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 新增标签 */}
        {isAdding && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="标签名称"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-violet-300"
                autoFocus
              />
              <div className="flex gap-1.5">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} className="px-4 py-2 text-sm text-white bg-violet-500 rounded-md hover:bg-violet-600">
                确认
              </button>
              <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 标签网格 */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tag.color + '20' }}
                >
                  <Tag className="w-5 h-5" style={{ color: tag.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-violet-300"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(tag.id); }}
                      />
                      <button onClick={() => handleEditSave(tag.id)} className="text-xs text-emerald-600 hover:text-emerald-700">
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-gray-800 truncate">{tag.name}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">{tag.count} 个资料</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditStart(tag)}
                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tags.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无标签</p>
            <p className="text-xs mt-1">点击右上角「新建标签」创建</p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
