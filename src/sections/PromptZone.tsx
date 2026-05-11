import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Search, Trash2, Star, Lock, Unlock, RefreshCw,
  Sparkles, X, Edit3, BookOpen, Globe, Check,
} from 'lucide-react';
import { usePrompts } from '@/hooks/usePrompts';
import type { PromptItem, PromptCategory, PromptVisibility } from '@/hooks/usePrompts';

/* ─── 创建/编辑弹窗 ─── */
function PromptFormModal({
  isOpen, onClose, onSave, initial, categories, preferredCategory,
}: {
  isOpen: boolean; onClose: () => void;
  onSave: (data: Omit<PromptItem, 'id' | 'usageCount' | 'isFavorite' | 'authorId' | 'createdAt'>) => void;
  initial?: PromptItem | null;
  categories: string[];
  preferredCategory?: string;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [content, setContent] = useState(initial?.content || '');
  const [category, setCategory] = useState<string>(initial?.category || preferredCategory || categories[0] || '未分类');
  const [_visibility, setVisibility] = useState<PromptVisibility>(initial?.visibility || 'private');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setContent(initial?.content || '');
      setCategory(initial?.category || preferredCategory || categories[0] || '未分类');
      setVisibility(initial?.visibility || 'private');
      setPrice(initial?.price ?? 0);
      setErrors({});
    }
  }, [isOpen, initial, preferredCategory, categories]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '请输入提示词名称';
    if (!content.trim()) errs.content = '请输入提示词内容';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim(), category, visibility: 'private', price: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[800px] max-w-[95vw] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{initial ? '编辑提示词' : '创建提示词'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-5">
            <div className="flex-[2] min-w-0 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">提示词名称 <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：章节润色"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-brand transition-colors ${errors.name ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.name && <p className="text-[10px] text-red-400 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">提示词说明</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述该提示词的用途和效果" rows={2}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-brand transition-colors resize-none ${errors.description ? 'border-red-300' : 'border-gray-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">分类</label>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((c) => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${category === c ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-[3] min-w-0">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">提示词内容 <span className="text-red-400">*</span></label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="输入完整的提示词内容..." rows={16}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-brand transition-colors resize-none font-mono leading-relaxed ${errors.content ? 'border-red-300' : 'border-gray-200'}`} />
              {errors.content && <p className="text-[10px] text-red-400 mt-0.5">{errors.content}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2 text-xs text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> {initial ? '保存修改' : '创建提示词'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 回收站弹窗 ─── */
function RecycleModal({
  isOpen, onClose, recycleBin, onRestore, onPermanentDelete,
}: {
  isOpen: boolean; onClose: () => void; recycleBin: PromptItem[];
  onRestore: (id: string) => void; onPermanentDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[560px] max-h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">提示词回收站</h2>
            <p className="text-xs text-gray-400 mt-0.5">已删除的提示词可恢复，彻底删除后将无法找回</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {recycleBin.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trash2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recycleBin.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">{item.category}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">删除于 {item.deletedAt?.split('T')[0]}</p>
                  </div>
                  <button onClick={() => onRestore(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shrink-0">
                    <RefreshCw className="w-3 h-3" /> 恢复
                  </button>
                  {confirmId === item.id ? (
                    <button onClick={() => { onPermanentDelete(item.id); setConfirmId(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors shrink-0">确认删除</button>
                  ) : (
                    <button onClick={() => setConfirmId(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 删除确认弹窗 ─── */
function DeleteConfirmModal({
  isOpen, onClose, onConfirm, itemName,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; itemName: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[360px] max-w-[90vw] bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">确认删除</h3>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          确定要删除提示词 <span className="font-medium text-gray-900">「{itemName}」</span> 吗？
        </p>
        <p className="text-xs text-gray-400 mb-6">
          删除后将移入回收站，可在回收站中恢复。
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            取消
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 个人提示词卡片 ─── */
function PersonalPromptCard({
  item, onEdit, onDelete, onToggleFav, onToggleLock,
}: {
  item: PromptItem; onEdit: (item: PromptItem) => void; onDelete: (id: string) => void; onToggleFav: (id: string) => void; onToggleLock: (id: string) => void;
}) {
  return (
    <div className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-3 flex flex-col"
      style={{ width: '240px', height: '200px' }}>
      <div className="flex items-start justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-500">{item.category}</span>
        </div>
        <button
          onClick={() => onToggleLock(item.id)}
          title={item.isLocked ? '已锁定，点击解锁' : '点击锁定'}
          className={`p-1 rounded-md transition-colors ${item.isLocked ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}
        >
          {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2 shrink-0">{item.description}</p>
      <div className="flex items-center justify-between shrink-0 mt-auto"></div>
      <p className="text-[10px] text-gray-400 text-right mb-1">{item.content?.length || 0} 字</p>
      <div className="flex items-center gap-1.5 mt-2 shrink-0">
        <button onClick={() => onToggleFav(item.id)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-colors ${item.isFavorite ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-orange-400 bg-orange-50/60 hover:bg-orange-100 hover:text-orange-600'}`}>
          <Star className="w-3.5 h-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
          <span>收藏</span>
        </button>
        <button onClick={() => onEdit(item)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs text-blue-500 bg-blue-50 hover:bg-blue-100 hover:text-blue-600 transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
          <span>编辑</span>
        </button>
        <button
          onClick={() => !item.isLocked && onDelete(item.id)}
          disabled={item.isLocked}
          title={item.isLocked ? '已锁定，无法删除' : '删除'}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-colors ${
            item.isLocked ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600'
          }`}>
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除</span>
        </button>
      </div>
    </div>
  );
}

/* ─── 主页面 ─── */
export default function PromptZone({ embedded = false }: { embedded?: boolean }) {
  const {
    personalPrompts, recycleBin, favoriteIds, categories,
    addPrompt, updatePrompt, deletePrompt, restorePrompt, permanentDelete,
    toggleFavorite, toggleLockPrompt, usePrompt,
    addCategory, removeCategory,
  } = usePrompts();

  const [activeTab, setActiveTab] = useState<'personal' | 'public' | 'default'>('personal');
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PromptItem | null>(null);
  const [showRecycle, setShowRecycle] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 新建分类
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);

  // 删除确认弹窗状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 分类筛选后的列表
  const getFilteredList = (tab: 'personal' | 'public' | 'default') => {
    let list: PromptItem[] = [];
    if (tab === 'personal') {
      list = activeCategory ? personalPrompts.filter((p) => p.category === activeCategory) : [...personalPrompts];
    } else if (tab === 'public') {
      list = activeCategory ? personalPrompts.filter((p) => p.category === activeCategory) : [...personalPrompts];
    } else {
      list = activeCategory ? personalPrompts.filter((p) => p.category === activeCategory) : [...personalPrompts];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    return list;
  };

  const currentList = getFilteredList(activeTab);

  const handleCreate = (data: Omit<PromptItem, 'id' | 'usageCount' | 'isFavorite' | 'authorId' | 'createdAt'>) => {
    addPrompt(data);
    showToast('提示词创建成功');
  };

  const handleUpdate = (data: Omit<PromptItem, 'id' | 'usageCount' | 'isFavorite' | 'authorId' | 'createdAt'>) => {
    if (editingItem) {
      updatePrompt(editingItem.id, data);
      showToast('提示词已更新');
      setEditingItem(null);
    }
  };

  const handleDeleteRequest = (id: string) => {
    const item = personalPrompts.find((p) => p.id === id);
    if (item?.isLocked) {
      showToast('提示词已锁定，无法删除');
      return;
    }
    if (item) {
      setDeleteTargetId(id);
      setDeleteTargetName(item.name);
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      deletePrompt(deleteTargetId);
      showToast('提示词已移入回收站');
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    }
  };

  const openEdit = (item: PromptItem) => { setEditingItem(item); setShowForm(true); };
  const openCreate = () => { setEditingItem(null); setShowForm(true); };

  const tabStyle = (tab: 'personal' | 'public' | 'default') =>
    `flex items-center gap-1.5 px-5 py-2 text-sm rounded-full transition-all cursor-pointer ${
      activeTab === tab ? 'text-white bg-gray-900 shadow-sm' : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'
    }`;

  // 新建分类
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError('请输入分类名称');
      return;
    }
    if (categories.includes(name)) {
      setCategoryError('该分类已存在');
      return;
    }
    const ok = addCategory(name);
    if (ok) {
      showToast(`分类「${name}」创建成功`);
      setNewCategoryName('');
      setCategoryError('');
      setIsAddingCategory(false);
    }
  };

  const closeCategoryModal = () => {
    setIsAddingCategory(false);
    setNewCategoryName('');
    setCategoryError('');
  };

  // 分类筛选条
  const CategoryFilterBar = () => (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <button onClick={() => setActiveCategory(undefined)}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${!activeCategory ? 'text-white bg-gray-900' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}>
          全部
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 text-xs rounded-full transition-colors ${activeCategory === cat ? 'text-white bg-gray-900' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}>
            {cat}
          </button>
        ))}
        <button
          onClick={() => setIsAddingCategory(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand border border-brand/30 rounded-full hover:bg-brand-light transition-colors"
          title="新建分类"
        >
          <Plus className="w-3.5 h-3.5" />
          新建
        </button>
      </div>
      {/* 删除当前选中的分类 */}
      {activeCategory && activeCategory !== '未分类' && (
        <button
          onClick={() => {
            if (confirm(`确定要删除分类「${activeCategory}」吗？该分类下的提示词将移到「未分类」。`)) {
              removeCategory(activeCategory);
              setActiveCategory(undefined);
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
          title={`删除分类「${activeCategory}」`}
        >
          <Trash2 className="w-3 h-3" />
          删除「{activeCategory}」
        </button>
      )}
    </div>
  );

  /* ─── 新建分类弹窗 ─── */
  const CategoryCreateModal = () => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [composing, setComposing] = useState(false);
    const [localName, setLocalName] = useState('');

    useEffect(() => {
      if (isAddingCategory) {
        setLocalName('');
        setCategoryError('');
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }, [isAddingCategory]);

    const submit = () => {
      const name = localName.trim();
      if (!name) { setCategoryError('请输入分类名称'); return; }
      if (categories.includes(name)) { setCategoryError('该分类已存在'); return; }
      addCategory(name);
      showToast(`分类「${name}」创建成功`);
      setIsAddingCategory(false);
      setLocalName('');
    };

    if (!isAddingCategory) return null;
    return (
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-[420px] max-w-[90vw] bg-white rounded-xl shadow-2xl p-6">
          <h3 className="text-base font-bold text-gray-900 mb-1">新建分类</h3>
          <p className="text-xs text-gray-400 mb-4">输入新分类的名称</p>
          <textarea
            ref={textareaRef}
            value={localName}
            onChange={(e) => { setLocalName(e.target.value); setCategoryError(''); }}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !composing) { e.preventDefault(); submit(); } }}
            placeholder="例如：脑洞、大纲、人设..."
            rows={2}
            className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
            style={{ color: '#111827', backgroundColor: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}
          />
          {categoryError && <p className="text-xs text-red-500 mt-2">{categoryError}</p>}
          <div className="flex items-center justify-end gap-3 mt-5">
            <button onClick={() => { setIsAddingCategory(false); setLocalName(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={submit} className="px-5 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">创建</button>
          </div>
        </div>
      </div>
    );
  };

  // 空状态
  const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div className="flex flex-col items-center justify-center py-20">
      {icon}
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>
      <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm text-brand border border-brand rounded-md hover:bg-brand-light transition-colors">
        <Plus className="w-4 h-4" /> 创建提示词
      </button>
    </div>
  );

  // 列表渲染
  const PromptList = ({ list }: { list: PromptItem[] }) => {
    if (list.length === 0) {
      return <EmptyState icon={<Sparkles className="w-12 h-12 text-gray-200 mb-4" />} title="暂无提示词" subtitle="点击「创建提示词」开始添加" />;
    }
    return (
      <div className="flex flex-wrap gap-4">
        {list.map((item) => (
          <PersonalPromptCard key={item.id} item={item}
            onEdit={openEdit} onDelete={handleDeleteRequest} onToggleFav={toggleFavorite} onToggleLock={toggleLockPrompt} />
        ))}
      </div>
    );
  };

  const mainContent = (
    <div className={`flex-1 overflow-y-auto ${embedded ? 'p-4' : 'p-6'}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" />
            <h1 className="text-xl font-bold text-gray-900">提示词管理</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">管理和发现AI写作提示词</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRecycle(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Trash2 className="w-4 h-4" /><span>回收站</span>
            {recycleBin.length > 0 && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">{recycleBin.length}</span>}
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
            <Plus className="w-4 h-4" /><span>创建提示词</span>
          </button>
        </div>
      </div>

      {/* 切换标签 + 搜索 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('personal')} className={tabStyle('personal')}>
            小说提示词
            <span className={`text-xs ${activeTab === 'personal' ? 'text-gray-300' : 'text-gray-400'}`}>{personalPrompts.length}</span>
          </button>
          <button onClick={() => setActiveTab('public')} className={tabStyle('public')}>
            剧本提示词
            <span className={`text-xs ${activeTab === 'public' ? 'text-gray-300' : 'text-gray-400'}`}>{personalPrompts.length}</span>
          </button>
          <button onClick={() => setActiveTab('default')} className={tabStyle('default')}>
            默认提示词
            <span className={`text-xs ${activeTab === 'default' ? 'text-gray-300' : 'text-gray-400'}`}>{personalPrompts.length}</span>
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索提示词..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand w-[240px]" />
        </div>
      </div>

      {/* 分类筛选（所有 tab 都显示） */}
      <CategoryFilterBar />

      {/* 提示词列表（三个 tab 共享同一套数据，仅通过分类区分） */}
      <PromptList list={currentList} />
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {mainContent}
        <CategoryCreateModal />
        <PromptFormModal
          key={editingItem?.id || 'create-new'}
          isOpen={showForm} onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={editingItem ? handleUpdate : handleCreate} initial={editingItem} categories={categories}
          preferredCategory={activeCategory} />
        <RecycleModal
          isOpen={showRecycle} onClose={() => setShowRecycle(false)}
          recycleBin={recycleBin} onRestore={restorePrompt} onPermanentDelete={permanentDelete} />
        <DeleteConfirmModal
          isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete} itemName={deleteTargetName} />
        {toast && (
          <div className="fixed bottom-6 right-6 z-[70] px-5 py-3 bg-white rounded-lg shadow-lg border border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
            <p className="text-sm text-gray-700">{toast}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {mainContent}
      <CategoryCreateModal />
      <PromptFormModal
        key={editingItem?.id || 'create-new'}
        isOpen={showForm} onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={editingItem ? handleUpdate : handleCreate} initial={editingItem} categories={categories}
        preferredCategory={activeCategory} />
      <RecycleModal
        isOpen={showRecycle} onClose={() => setShowRecycle(false)}
        recycleBin={recycleBin} onRestore={restorePrompt} onPermanentDelete={permanentDelete} />
      <DeleteConfirmModal
        isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete} itemName={deleteTargetName} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] px-5 py-3 bg-white rounded-lg shadow-lg border border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
          <p className="text-sm text-gray-700">{toast}</p>
        </div>
      )}
    </div>
  );
}
