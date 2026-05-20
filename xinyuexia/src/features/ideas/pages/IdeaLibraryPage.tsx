import { BookOpen, Clock, Library, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useIdeaStorage, writeIdeaContinueSnapshot, writeIdeaOutlineSnapshot } from '@/features/ideas/hooks/useIdeaStorage';
import type { IdeaItem, IdeaStatus } from '@/features/ideas/model/ideaTypes';

const STATUS_LABELS: Record<IdeaStatus, string> = {
  draft: '草稿',
  outlined: '已转大纲',
  completed: '已完成',
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN');
}

export function IdeaLibraryPage() {
  const navigate = useNavigate();
  const { ideas, deleteIdea, importIdeaToGenerator } = useIdeaStorage();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | IdeaStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredIdeas = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return ideas.filter((idea) => {
      const matchKeyword = !keyword
        || idea.title.toLowerCase().includes(keyword)
        || idea.content.toLowerCase().includes(keyword)
        || idea.tags.some((tag) => tag.toLowerCase().includes(keyword));
      const matchStatus = status === 'all' || idea.status === status;
      return matchKeyword && matchStatus;
    });
  }, [ideas, search, status]);

  const selectedIdea = ideas.find((idea) => idea.id === selectedId) ?? filteredIdeas[0] ?? null;

  const handleContinue = (idea: IdeaItem) => {
    const data = importIdeaToGenerator(idea.id);
    if (!data) return;
    writeIdeaContinueSnapshot(data);
    navigate('/idea-generator');
  };

  const handleToOutline = (idea: IdeaItem) => {
    writeIdeaOutlineSnapshot({
      title: idea.title,
      content: idea.content,
      genre: idea.genre,
    });
    navigate('/outline-generator');
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Library className="h-5 w-5 text-violet-500" />
            脑洞库
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">管理已生成的脑洞，并继续导入生成器或转大纲。</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/idea-generator')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">去生成器</button>
          <button onClick={() => navigate('/outline-generator')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">去大纲</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="space-y-3 border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索脑洞..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-brand"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="flex gap-2">
              {(['all', 'draft', 'outlined', 'completed'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    status === item ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item === 'all' ? '全部' : STATUS_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredIdeas.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-400">
                暂无脑洞，去生成器创建一个吧
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIdeas.map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() => setSelectedId(idea.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedIdea?.id === idea.id ? 'bg-brand-light/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-bold text-gray-900">{idea.title}</h3>
                      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">{STATUS_LABELS[idea.status]}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-gray-500">{idea.content.slice(0, 120)}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{idea.genre}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(idea.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-50">
          {selectedIdea ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedIdea.title}</h2>
                    <p className="mt-1 text-xs text-gray-400">{selectedIdea.promptName} · {selectedIdea.modelName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleContinue(selectedIdea)} className="rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
                      继续生成
                    </button>
                    <button onClick={() => handleToOutline(selectedIdea)} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50">
                      转大纲
                    </button>
                    <button onClick={() => deleteIdea(selectedIdea.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      删除
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{selectedIdea.content}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              选择一个脑洞查看详情
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
