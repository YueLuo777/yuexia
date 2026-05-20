import { Check, Copy, Library, Loader2, Lightbulb, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

import { useIdeaStorage, readIdeaContinueSnapshot } from '@/features/ideas/hooks/useIdeaStorage';
import { readModelSnapshot } from '@/features/models/hooks/useModels';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { callModel } from '@/features/models/services/callModel';
import { readPromptSnapshot } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';

type IdeaResult = { title: string; content: string };
type IdeaHistoryItem = IdeaResult & {
  modelName: string;
  promptName: string;
  genre: string;
  tags: string[];
  createdAt: string;
};

const GENRES = ['玄幻', '都市', '科幻', '历史', '悬疑', '游戏', '武侠', '末世', '现实'];
const TAGS = ['系统', '升级流', '重生', '穿越', '脑洞', '轻松', '热血', '反转', '群像'];
const COUNTS = [1, 2, 3, 5];
const HISTORY_KEY = 'xinyuexia_idea_history_v1';

function splitIdeas(raw: string, count: number) {
  const blocks = raw.split(/---+/).map((part) => part.trim()).filter(Boolean);
  if (blocks.length >= count) return blocks.slice(0, count);
  const numbered = raw.split(/\n(?=\d+[.)、\s])/).map((part) => part.trim()).filter(Boolean);
  if (numbered.length >= count) return numbered.slice(0, count);
  return [raw.trim()];
}

function loadHistory(): IdeaHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as IdeaHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: IdeaHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

export function IdeaGeneratorPage() {
  const navigate = useNavigate();
  const { addIdea } = useIdeaStorage();
  const [models, setModels] = useState<ModelItem[]>(() => readModelSnapshot().filter((model) => model.enabled));
  const [prompts, setPrompts] = useState<PromptItem[]>(() => readPromptSnapshot().prompts);
  const [modelId, setModelId] = useState('');
  const [promptId, setPromptId] = useState('');
  const [genres, setGenres] = useState<string[]>(['玄幻']);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [count, setCount] = useState(1);
  const [extra, setExtra] = useState('');
  const [results, setResults] = useState<IdeaResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<IdeaHistoryItem[]>(() => loadHistory());

  useEffect(() => {
    const syncModels = () => setModels(readModelSnapshot().filter((model) => model.enabled));
    const syncPrompts = () => setPrompts(readPromptSnapshot().prompts);
    window.addEventListener('xinyuexia_models_updated', syncModels);
    window.addEventListener('xinyuexia_prompts_updated', syncPrompts);
    return () => {
      window.removeEventListener('xinyuexia_models_updated', syncModels);
      window.removeEventListener('xinyuexia_prompts_updated', syncPrompts);
    };
  }, []);

  useEffect(() => {
    const draft = readIdeaContinueSnapshot();
    if (!draft) return;
    if (draft.content) setExtra(draft.content);
    if (draft.genre) setGenres([draft.genre]);
    if (draft.tags) setTags(draft.tags);
    if (draft.promptId) setPromptId(draft.promptId);
  }, []);

  useEffect(() => {
    if (!modelId && models[0]) setModelId(models[0].id);
    if (!promptId && prompts[0]) setPromptId(prompts[0].id);
  }, [models, prompts, modelId, promptId]);

  const model = models.find((item) => item.id === modelId) ?? models[0] ?? null;
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0] ?? null;
  const canGenerate = Boolean(model && prompt && extra.trim());

  const toggleValue = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const addCustomTag = () => {
    const value = customTag.trim();
    if (!value) return;
    if (!tags.includes(value)) {
      setTags((prev) => [...prev, value]);
    }
    setCustomTag('');
  };

  const pushHistory = (items: IdeaResult[]) => {
    if (!model || !prompt) return;
    const next = items.map((item) => ({
      ...item,
      modelName: model.name,
      promptName: prompt.name,
      genre: genres.join('+') || '不限',
      tags: [...genres, ...tags],
      createdAt: new Date().toLocaleString('zh-CN'),
    }));
    const merged = [...next, ...history].slice(0, 100);
    setHistory(merged);
    saveHistory(merged);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !model || !prompt) return;
    setIsLoading(true);
    setError('');
    setResults([]);
    try {
      const content = await callModel({
        model,
        prompt: prompt.content,
        userContent: [
          `题材：${genres.join('+') || '不限'}`,
          `标签：${tags.join('+') || '无'}`,
          `补充要求：${extra.trim()}`,
          `生成数量：${count}`,
          '请生成多个不同的脑洞，并用 --- 分隔。',
        ].join('\n'),
      });
      const pieces = splitIdeas(content, count);
      const parsed = pieces.map((piece, index) => {
        const title = (piece.split('\n').find(Boolean) ?? `脑洞 ${index + 1}`).replace(/^#+\s*/, '').slice(0, 60);
        return { title, content: piece };
      });
      setResults(parsed);
      setActiveIndex(0);
      pushHistory(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (index: number) => {
    const item = results[index];
    if (!item || !model || !prompt) return;
    addIdea({
      title: item.title,
      content: item.content,
      promptId: prompt.id,
      promptName: prompt.name,
      genre: genres.join('+') || '不限',
      tags: [...genres, ...tags],
      modelId: model.id,
      modelName: model.name,
    });
  };

  const handleSaveAll = () => {
    results.forEach((_, index) => handleSave(index));
  };

  const handleCopy = async (index: number) => {
    const item = results[index];
    if (!item) return;
    await navigator.clipboard.writeText(item.content);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleRestoreHistory = (item: IdeaHistoryItem) => {
    setExtra(item.content);
    setGenres(item.genre.split('+').filter(Boolean));
    setTags(item.tags.filter((tag) => !GENRES.includes(tag)));
    setHistoryOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            脑洞生成器
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">选择提示词与 AI 模型，生成小说脑洞。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Library className="h-4 w-4" />
            脑洞历史
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">{history.length}</span>
          </button>
          {results.length > 0 && (
            <>
              <button onClick={handleSaveAll} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
                <Save className="h-4 w-4" />
                全部保存
              </button>
              <button onClick={() => setResults([])} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                清空
              </button>
            </>
          )}
        </div>
      </header>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex max-h-[70vh] w-[720px] max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">脑洞历史</h2>
                <p className="mt-0.5 text-xs text-gray-400">最近 {history.length} 条生成记录</p>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('确定清空所有历史记录吗？')) {
                        setHistory([]);
                        saveHistory([]);
                      }
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    清空历史
                  </button>
                )}
                <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">暂无历史记录</div>
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <button
                      key={`${item.createdAt}-${index}`}
                      onClick={() => handleRestoreHistory(item)}
                      className="w-full rounded-lg border border-gray-100 bg-gray-50 p-4 text-left hover:bg-gray-100"
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-bold text-gray-900">{item.title}</h3>
                        <span className="text-[10px] text-gray-400">{item.createdAt}</span>
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-500">{item.content}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
                        <span>模型: {item.modelName}</span>
                        <span>提示词: {item.promptName}</span>
                        <span>题材: {item.genre}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">模型</span>
              <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand">
                {models.length === 0 ? <option value="">无可用模型</option> : models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">提示词</span>
              <select value={promptId} onChange={(event) => setPromptId(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand">
                {prompts.length === 0 ? <option value="">无提示词</option> : prompts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">核心创意</span>
              <textarea
                value={extra}
                onChange={(event) => setExtra(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
                placeholder="例如：主角拥有听见别人心声的能力..."
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">题材</span>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleValue(item, setGenres)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      genres.includes(item) ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">标签</span>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleValue(item, setTags)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      tags.includes(item) ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customTag}
                  onChange={(event) => setCustomTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addCustomTag();
                  }}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="自定义标签"
                />
                <button onClick={addCustomTag} className="rounded-lg border border-brand/30 px-3 py-2 text-sm text-brand hover:bg-brand-light">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">数量</span>
              <div className="flex gap-2">
                {COUNTS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCount(item)}
                    className={`h-8 w-10 rounded-lg border text-xs ${
                      count === item ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <button
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              生成脑洞
            </button>
            {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">{error}</div>}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-50">
          {results.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
              {isLoading ? 'AI 正在生成...' : '配置完成后点击“生成脑洞”。'}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-gray-200 bg-white px-4 pt-3">
                <div className="flex items-center gap-1">
                  {results.map((item, index) => (
                    <button
                      key={`${item.title}-${index}`}
                      onClick={() => setActiveIndex(index)}
                      className={`rounded-t-lg border-b-2 px-4 py-2 text-xs ${
                        activeIndex === index ? 'border-brand bg-brand-light text-brand' : 'border-transparent text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      脑洞 {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">{results[activeIndex]?.title}</h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void handleCopy(activeIndex)} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                        {copiedIndex === activeIndex ? <Check className="mr-1 inline h-3.5 w-3.5 text-green-500" /> : <Copy className="mr-1 inline h-3.5 w-3.5" />}
                        复制
                      </button>
                      <button onClick={() => handleSave(activeIndex)} className="rounded-md border border-brand/30 px-3 py-1.5 text-xs text-brand hover:bg-brand-light">
                        保存
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{results[activeIndex]?.content}</pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
