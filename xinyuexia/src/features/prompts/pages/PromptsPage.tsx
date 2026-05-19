import { Check, Edit3, Lock, Plus, Search, Sparkles, Star, Trash2, Unlock, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePrompts } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';

export function PromptsPage() {
  const {
    prompts,
    categories,
    categoryStats,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    toggleLock,
    addCategory,
  } = usePrompts();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', content: '', category: categories[0] ?? '未分类' });
  const [newCategory, setNewCategory] = useState('');

  const filteredPrompts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return prompts.filter((prompt) => {
      const matchCategory = activeCategory === '全部' || prompt.category === activeCategory;
      const matchKeyword = !keyword ||
        prompt.name.toLowerCase().includes(keyword) ||
        prompt.description.toLowerCase().includes(keyword) ||
        prompt.content.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [activeCategory, prompts, search]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: '', description: '', content: '', category: activeCategory === '全部' ? categories[0] ?? '未分类' : activeCategory });
  };

  const openEdit = (prompt: PromptItem) => {
    if (prompt.isLocked) return;
    setEditing(prompt);
    setDraft({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
    });
  };

  const saveDraft = () => {
    if (!draft.name.trim() || !draft.content.trim()) return;
    if (editing) {
      updatePrompt(editing.id, draft);
    } else {
      addPrompt(draft);
    }
    setEditing(null);
    setDraft({ name: '', description: '', content: '', category: categories[0] ?? '未分类' });
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">提示词管理</h1>
              <p className="text-xs text-gray-400">共 {prompts.length} 条提示词</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索提示词..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-brand"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              创建提示词
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[210px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-3">
            <button
              onClick={() => setActiveCategory('全部')}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs ${
                activeCategory === '全部' ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>全部</span>
              <span>{prompts.length}</span>
            </button>
            {categoryStats.map((item) => (
              <button
                key={item.category}
                onClick={() => setActiveCategory(item.category)}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  activeCategory === item.category ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.category}</span>
                <span>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="mt-auto border-t border-gray-100 p-3">
            <div className="flex gap-1">
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="新增分类"
                className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
              />
              <button
                onClick={() => {
                  addCategory(newCategory);
                  setNewCategory('');
                }}
                className="rounded-md bg-brand px-2 text-xs text-white"
              >
                加
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5">
          {filteredPrompts.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
              <Sparkles className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">暂无提示词</p>
              <button onClick={openCreate} className="mt-4 rounded-md bg-brand px-4 py-2 text-sm text-white">创建提示词</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {filteredPrompts.map((prompt) => (
                <article key={prompt.id} className="group flex h-[200px] w-[240px] flex-col rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-gray-900">{prompt.name}</h2>
                      <p className="mt-1 text-[10px] text-gray-400">{prompt.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleFavorite(prompt.id)} className={prompt.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}>
                        <Star className="h-4 w-4" fill={prompt.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => toggleLock(prompt.id)} className="text-gray-300 hover:text-brand">
                        {prompt.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-gray-400">{prompt.description || '暂无说明'}</p>
                  <p className="mt-2 line-clamp-4 flex-1 text-xs leading-5 text-gray-600">{prompt.content}</p>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(prompt)} disabled={prompt.isLocked} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:text-gray-300">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deletePrompt(prompt.id)} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        <aside className="w-[360px] shrink-0 border-l border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{editing ? '编辑提示词' : '创建提示词'}</h2>
            {editing && <button onClick={openCreate} className="text-xs text-brand">新建</button>}
          </div>
          <div className="space-y-3">
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="提示词名称"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="提示词说明"
              className="h-20 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="输入完整提示词内容..."
              className="h-[280px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-brand"
            />
            <button onClick={saveDraft} disabled={!draft.name.trim() || !draft.content.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300">
              <Check className="h-4 w-4" />
              {editing ? '保存修改' : '创建提示词'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
