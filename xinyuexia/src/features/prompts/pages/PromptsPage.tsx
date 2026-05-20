import { Check, Edit3, Lock, Plus, Search, Sparkles, Star, Trash2, Unlock, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePrompts } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';

type PromptTab = 'personal' | 'public' | 'default';

export function PromptsPage() {
  const {
    prompts,
    categories,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    toggleLock,
    addCategory,
  } = usePrompts();
  const [activeTab, setActiveTab] = useState<PromptTab>('personal');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PromptItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [draft, setDraft] = useState({ name: '', description: '', content: '', category: categories[0] ?? '未分类' });

  const currentList = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return prompts.filter((item) => {
      const matchCategory = !activeCategory || item.category === activeCategory;
      const matchKeyword = !keyword
        || item.name.toLowerCase().includes(keyword)
        || item.description.toLowerCase().includes(keyword)
        || item.content.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [activeCategory, prompts, searchQuery]);

  const openCreate = () => {
    setEditingItem(null);
    setDraft({ name: '', description: '', content: '', category: activeCategory ?? categories[0] ?? '未分类' });
    setShowForm(true);
  };

  const openEdit = (item: PromptItem) => {
    if (item.isLocked) return;
    setEditingItem(item);
    setDraft({
      name: item.name,
      description: item.description,
      content: item.content,
      category: item.category,
    });
    setShowForm(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim() || !draft.content.trim()) return;
    if (editingItem) updatePrompt(editingItem.id, draft);
    else addPrompt(draft);
    setShowForm(false);
    setEditingItem(null);
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Sparkles className="mb-4 h-12 w-12 text-gray-200" />
      <p className="mb-1 text-sm text-gray-500">暂无提示词</p>
      <p className="mb-4 text-xs text-gray-400">点击“创建提示词”开始添加</p>
      <button onClick={openCreate} className="flex items-center gap-1.5 rounded-md border border-brand px-4 py-2 text-sm text-brand hover:bg-brand-light transition-colors">
        <Plus className="h-4 w-4" /> 创建提示词
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-bold text-gray-900">提示词管理</h1>
            </div>
            <p className="mt-1 text-sm text-gray-400">管理和发现 AI 写作提示词</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openCreate} className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark transition-colors">
              <Plus className="h-4 w-4" /><span>创建提示词</span>
            </button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[
              { key: 'personal', label: '小说提示词' },
              { key: 'public', label: '剧本提示词' },
              { key: 'default', label: '默认提示词' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as PromptTab)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.key ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs ${activeTab === tab.key ? 'text-white/70' : 'text-gray-400'}`}>{currentList.length}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索提示词..."
              className="w-[240px] rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${activeCategory === null ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${activeCategory === category ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {category}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="新增分类"
              className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-brand focus:outline-none"
            />
            <button
              onClick={() => {
                addCategory(newCategory);
                setNewCategory('');
              }}
              className="rounded-md bg-brand px-2 py-1.5 text-xs text-white"
            >
              加
            </button>
          </div>
        </div>

        {currentList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-wrap gap-4">
            {currentList.map((item) => (
              <article key={item.id} className="group flex h-[200px] w-[240px] flex-col rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-gray-900">{item.name}</h2>
                    <p className="mt-1 text-[10px] text-gray-400">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleFavorite(item.id)} className={item.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}>
                      <Star className="h-4 w-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => toggleLock(item.id)} className="text-gray-300 hover:text-brand">
                      {item.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-gray-400">{item.description || '暂无说明'}</p>
                <p className="mt-2 line-clamp-4 flex-1 text-xs leading-5 text-gray-600">{item.content}</p>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(item)} disabled={item.isLocked} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:text-gray-300">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deletePrompt(item.id)} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-[520px] rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{editingItem ? '编辑提示词' : '创建提示词'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="提示词名称" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
              <textarea value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder="提示词说明" className="h-20 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
              <select value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <textarea value={draft.content} onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))} placeholder="输入完整提示词内容..." className="h-[280px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-brand" />
              <button onClick={saveDraft} disabled={!draft.name.trim() || !draft.content.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300">
                <Check className="h-4 w-4" />
                {editingItem ? '保存修改' : '创建提示词'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
