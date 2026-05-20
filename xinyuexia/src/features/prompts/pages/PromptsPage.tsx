import { BookOpen, Edit3, Lock, Plus, Search, Sparkles, Star, Trash2, Unlock, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { usePrompts } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

type PromptTab = 'novel' | 'script' | 'default';

const TAB_LABELS: Record<PromptTab, string> = {
  novel: '小说提示词',
  script: '剧本提示词',
  default: '默认提示词',
};

function PromptEditorModal({
  isOpen,
  title,
  categories,
  initial,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  title: string;
  categories: string[];
  initial?: PromptItem | null;
  onClose: () => void;
  onSave: (draft: { name: string; description: string; content: string; category: string }) => void;
}) {
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    content: '',
    category: categories[0] ?? '未分类',
  });

  useEffect(() => {
    if (!isOpen) return;
    setDraft({
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      content: initial?.content ?? '',
      category: initial?.category ?? categories[0] ?? '未分类',
    });
  }, [categories, initial, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[980px] max-w-[94vw] rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <h2 className="text-[18px] font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-6 px-8 py-7">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">提示词名称 <span className="text-red-400">*</span></label>
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="如：章节润色"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">提示词说明</label>
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="简短描述这个提示词的用途和效果"
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-600">分类</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setDraft((prev) => ({ ...prev, category }))}
                    className={`rounded-2xl border px-4 py-2 text-sm transition-colors ${
                      draft.category === category
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">提示词内容 <span className="text-red-400">*</span></label>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="输入完整的提示词内容..."
              rows={18}
              className="h-[440px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm leading-7 outline-none transition-colors focus:border-brand"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-slate-50/60 px-8 py-5">
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-6 py-3 text-base text-slate-600 hover:bg-white">
            取消
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim() || !draft.content.trim()}
            className="rounded-2xl bg-brand px-7 py-3 text-base text-white transition-colors hover:bg-brand-dark disabled:bg-slate-300"
          >
            {initial ? '保存修改' : '创建提示词'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromptsPage() {
  const { prompts, categories, addPrompt, updatePrompt, deletePrompt, toggleFavorite, toggleLock, addCategory } = usePrompts();
  const [activeTab, setActiveTab] = useState<PromptTab>('novel');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PromptItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PromptItem | null>(null);

  const filteredPrompts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return prompts.filter((item) => {
      const matchCategory = !activeCategory || item.category === activeCategory;
      const matchKeyword =
        !keyword
        || item.name.toLowerCase().includes(keyword)
        || item.description.toLowerCase().includes(keyword)
        || item.content.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [activeCategory, prompts, searchQuery]);

  const openCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (item: PromptItem) => {
    if (item.isLocked) return;
    setEditingItem(item);
    setShowForm(true);
  };

  const savePrompt = (draft: { name: string; description: string; content: string; category: string }) => {
    if (editingItem) updatePrompt(editingItem.id, draft);
    else addPrompt(draft);
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-7 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900">提示词管理</h1>
              <p className="mt-1 text-sm text-slate-400">管理和发现 AI 写作提示词</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base text-slate-600 hover:bg-slate-50">
              回收站
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-base text-white hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              创建提示词
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-7">
        <div className="mb-6 flex items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-3">
            {(Object.keys(TAB_LABELS) as PromptTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-6 py-3 text-[18px] transition-colors ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {TAB_LABELS[tab]} <span className="ml-1 text-sm opacity-70">{filteredPrompts.length}</span>
              </button>
            ))}
          </div>

          <div className="relative w-[300px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索提示词..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-5 py-2 text-base transition-colors ${
              activeCategory === null
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-5 py-2 text-base transition-colors ${
                activeCategory === category
                  ? 'bg-white text-brand border border-brand/30'
                  : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {category}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="新增分类"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={() => {
                addCategory(newCategory);
                setNewCategory('');
              }}
              className="rounded-full border border-brand/30 px-4 py-2 text-sm text-brand hover:bg-brand-light"
            >
              + 新建
            </button>
          </div>
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white">
            <Sparkles className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-base text-slate-400">暂无提示词</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {filteredPrompts.map((prompt) => (
              <article
                key={prompt.id}
                className="flex h-[290px] w-[300px] flex-col rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[20px] font-bold text-slate-900">{prompt.name}</h2>
                      <span className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-500">{prompt.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLock(prompt.id)}
                    className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500"
                  >
                    {prompt.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-3 line-clamp-4 text-sm leading-7 text-slate-500">{prompt.description || prompt.content}</div>

                <div className="mt-auto">
                  <p className="mb-3 text-right text-sm text-slate-400">{prompt.content.length} 字</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFavorite(prompt.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-orange-50 py-3 text-base text-orange-500 hover:bg-orange-100"
                    >
                      <Star className="h-4 w-4" fill={prompt.isFavorite ? 'currentColor' : 'none'} />
                      收藏
                    </button>
                    <button
                      onClick={() => openEdit(prompt)}
                      disabled={prompt.isLocked}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-50 py-3 text-base text-blue-500 hover:bg-blue-100 disabled:text-slate-300"
                    >
                      <Edit3 className="h-4 w-4" />
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteTarget(prompt)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-red-50 py-3 text-base text-red-500 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <PromptEditorModal
        isOpen={showForm}
        title={editingItem ? '编辑提示词' : '创建提示词'}
        categories={categories}
        initial={editingItem}
        onClose={() => {
          setShowForm(false);
          setEditingItem(null);
        }}
        onSave={savePrompt}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="确认删除"
        description={`确定要删除提示词「${deleteTarget?.name ?? ''}」吗？\n删除后将移入回收站，可在回收站中恢复。`}
        confirmText="确认删除"
        confirmVariant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deletePrompt(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
