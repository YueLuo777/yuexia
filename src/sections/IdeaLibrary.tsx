import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library, Trash2, Lightbulb, Sparkles, Clock, Tag,
  ChevronRight, Search, X, Loader2, Brain, FileText,
  ArrowRight,
} from 'lucide-react';
import { useIdeaStorage } from '@/hooks/useIdeaStorage';
import { getPromptById } from '@/data/prompts';

type FilterType = 'all' | 'draft' | 'outlined' | 'completed';

export default function IdeaLibrary() {
  const navigate = useNavigate();
  const { ideas, deleteIdea, importIdeaToGenerator } = useIdeaStorage();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId);

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      !search ||
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.content.toLowerCase().includes(search.toLowerCase()) ||
      idea.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || idea.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleContinueGeneration = (ideaId: string) => {
    const data = importIdeaToGenerator(ideaId);
    if (data) {
      try {
        localStorage.setItem('idea_continue_data', JSON.stringify(data));
      } catch { /* ignore */ }
      navigate('/idea-generator');
    }
  };

  const handleExpandToOutline = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId);
    if (idea) {
      try {
        localStorage.setItem('idea_to_outline', JSON.stringify({
          id: idea.id,
          title: idea.title,
          content: idea.content,
          genre: idea.tags[0] || '玄幻',
        }));
      } catch { /* ignore */ }
      navigate('/outline-generator');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    outlined: { label: '已转大纲', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    completed: { label: '已完成', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Library className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">脑洞库</h1>
            <p className="text-xs text-gray-400">管理你生成的所有脑洞，随时继续创作</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">共 {ideas.length} 个脑洞</span>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧列表 */}
        <aside className="w-[380px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          {/* 搜索和筛选 */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索脑洞..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* 筛选标签 */}
            <div className="flex gap-1.5">
              {[
                { key: 'all' as FilterType, label: '全部' },
                { key: 'draft' as FilterType, label: '草稿' },
                { key: 'outlined' as FilterType, label: '已转大纲' },
                { key: 'completed' as FilterType, label: '已完成' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    filter === f.key
                      ? 'bg-brand text-white border-brand'
                      : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Library className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">
                  {ideas.length === 0 ? '暂无脑洞，去生成器创建一个吧' : '没有符合条件的脑洞'}
                </p>
                {ideas.length === 0 && (
                  <button
                    onClick={() => navigate('/idea-generator')}
                    className="mt-3 px-4 py-2 text-xs text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
                  >
                    去生成脑洞
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => setSelectedIdeaId(idea.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedIdeaId === idea.id
                        ? 'bg-brand-light border-l-[3px] border-brand'
                        : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1 mr-2">
                        {idea.title}
                      </h3>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] rounded-full border ${statusLabels[idea.status]?.color || ''}`}>
                        {statusLabels[idea.status]?.label || idea.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{idea.content.slice(0, 120)}...</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {idea.promptName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(idea.createdAt)}
                      </span>
                    </div>
                    {idea.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {idea.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] text-brand bg-brand-light rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 右侧详情 */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          {!selectedIdea ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Library className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-sm text-gray-400">选择一个脑洞查看详情</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 详情头部 */}
              <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{selectedIdea.title}</h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5" />
                        {selectedIdea.modelName}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {selectedIdea.promptName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(selectedIdea.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleContinueGeneration(selectedIdea.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      继续生成
                    </button>
                    <button
                      onClick={() => handleExpandToOutline(selectedIdea.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      转大纲
                    </button>
                    {deleteConfirm === selectedIdea.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            deleteIdea(selectedIdea.id);
                            setDeleteConfirm(null);
                            if (selectedIdeaId === selectedIdea.id) setSelectedIdeaId(null);
                          }}
                          className="px-3 py-2 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(selectedIdea.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {selectedIdea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIdea.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs text-brand bg-brand-light rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
                  <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedIdea.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
