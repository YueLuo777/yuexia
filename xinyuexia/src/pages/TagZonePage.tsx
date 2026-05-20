import { CheckCircle, Edit3, Plus, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    if (raw) return JSON.parse(raw) as TagItem[];
  } catch {
    // ignore
  }
  return [
    { id: '1', name: '热血', color: '#EF4444', count: 12 },
    { id: '2', name: '战斗', color: '#F97316', count: 8 },
    { id: '3', name: '成长', color: '#10B981', count: 15 },
    { id: '4', name: '悬疑', color: '#8B5CF6', count: 6 },
    { id: '5', name: '爱情', color: '#EC4899', count: 10 },
    { id: '6', name: '科幻', color: '#3B82F6', count: 4 },
  ];
}

export default function TagZonePage() {
  const [tags, setTags] = useState<TagItem[]>(loadTags);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2000);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    setTags((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        color: newColor,
        count: 0,
      },
    ]);
    setNewName('');
    setIsAdding(false);
    showToast('标签已创建');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定删除此标签吗？')) return;
    setTags((prev) => prev.filter((item) => item.id !== id));
    showToast('标签已删除');
  };

  const handleEditStart = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) return;
    setTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, name: editName.trim() } : tag)));
    setEditingId(null);
    showToast('标签已更新');
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
            <Tag className="h-4 w-4 text-violet-600" />
          </div>
          <h1 className="text-base font-bold text-gray-900">标签专区</h1>
          <span className="rounded-md bg-violet-500 px-2 py-0.5 text-xs text-white">{tags.length} 个标签</span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          <Plus className="h-3.5 w-3.5" />
          新建标签
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isAdding && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="标签名称"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300"
                autoFocus
              />
              <div className="flex gap-1.5">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${newColor === color ? 'scale-110 border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} className="rounded-md bg-violet-500 px-4 py-2 text-sm text-white hover:bg-violet-600">
                确认
              </button>
              <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="group rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${tag.color}20` }}>
                  <Tag className="h-5 w-5" style={{ color: tag.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-violet-300"
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleEditSave(tag.id);
                        }}
                      />
                      <button onClick={() => handleEditSave(tag.id)} className="text-xs text-emerald-600 hover:text-emerald-700">
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="truncate text-sm font-bold text-gray-800">{tag.name}</div>
                  )}
                  <div className="mt-0.5 text-xs text-gray-400">{tag.count} 个资源</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => handleEditStart(tag)} className="rounded-md p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(tag.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tags.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Tag className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">暂无标签</p>
            <p className="mt-1 text-xs">点击右上角新建标签</p>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm text-white shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
