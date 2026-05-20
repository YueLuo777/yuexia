import { BookOpen, ChevronDown, ChevronRight, FileText, Library, Loader2, ListTree, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { readIdeaOutlineSnapshot } from '@/features/ideas/hooks/useIdeaStorage';
import { readModelSnapshot } from '@/features/models/hooks/useModels';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { callModel } from '@/features/models/services/callModel';
import { readPromptSnapshot } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';

interface VolumeOutline {
  volumeName: string;
  chapters: Array<{ id: string; title: string; content: string }>;
}

function parseOutline(raw: string) {
  const volumes: VolumeOutline[] = [];
  const lines = raw.split('\n');
  let currentVolume: VolumeOutline | null = null;
  let currentChapter: VolumeOutline['chapters'][number] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const volumeMatch = trimmed.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (volumeMatch) {
      if (currentChapter && currentVolume) currentVolume.chapters.push(currentChapter);
      if (currentVolume) volumes.push(currentVolume);
      currentVolume = { volumeName: volumeMatch[1].trim(), chapters: [] };
      currentChapter = null;
      continue;
    }

    const chapterMatch = trimmed.match(/^(\d+[.)、\s].+|第\d+章.+)$/);
    if (chapterMatch && currentVolume) {
      if (currentChapter) currentVolume.chapters.push(currentChapter);
      currentChapter = {
        id: `${currentVolume.volumeName}-${currentVolume.chapters.length}`,
        title: trimmed,
        content: '',
      };
      continue;
    }

    if (!currentVolume) {
      currentVolume = { volumeName: '生成结果', chapters: [] };
    }
    if (!currentChapter) {
      currentChapter = {
        id: `${currentVolume.volumeName}-${currentVolume.chapters.length}`,
        title: '整本大纲',
        content: '',
      };
    }
    currentChapter.content += `${trimmed}\n`;
  }

  if (currentChapter && currentVolume) currentVolume.chapters.push(currentChapter);
  if (currentVolume) volumes.push(currentVolume);
  return volumes;
}

export function OutlineGeneratorPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelItem[]>(() => readModelSnapshot().filter((model) => model.enabled));
  const [prompts, setPrompts] = useState<PromptItem[]>(() => readPromptSnapshot().prompts);
  const [modelId, setModelId] = useState('');
  const [promptId, setPromptId] = useState('');
  const [idea, setIdea] = useState('');
  const [genre, setGenre] = useState('玄幻');
  const [targetVolume, setTargetVolume] = useState(3);
  const [targetChapters, setTargetChapters] = useState(100);
  const [wordCount, setWordCount] = useState(200);
  const [results, setResults] = useState<VolumeOutline[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    const preset = readIdeaOutlineSnapshot();
    if (preset?.content) setIdea(preset.content);
    if (preset?.genre) setGenre(preset.genre);
  }, []);

  useEffect(() => {
    if (!modelId && models[0]) setModelId(models[0].id);
    if (!promptId && prompts[0]) setPromptId(prompts[0].id);
  }, [models, prompts, modelId, promptId]);

  const model = models.find((item) => item.id === modelId) ?? models[0] ?? null;
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0] ?? null;
  const canGenerate = Boolean(model && prompt && idea.trim());

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
          `题材：${genre}`,
          `核心创意：${idea.trim()}`,
          `目标卷数：${targetVolume}`,
          `目标章节数：${targetChapters}`,
          `预计字数：${wordCount} 万字`,
          '请生成完整分卷大纲，包含卷名、核心事件、章节规划和节奏控制。',
        ].join('\n'),
      });
      const parsed = parseOutline(content);
      setResults(parsed.length > 0
        ? parsed
        : [{ volumeName: '生成结果', chapters: [{ id: 'all', title: '整本大纲', content }] }]);
      setExpanded({ 0: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = results
      .map((volume) => `=== ${volume.volumeName} ===\n\n${volume.chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join('\n\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ListTree className="h-5 w-5 text-emerald-500" />
            大纲生成器
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">输入创意，生成完整分卷大纲。</p>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <>
              <button onClick={() => void handleCopy()} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <Library className="mr-1.5 inline h-4 w-4" />
                复制全部
              </button>
              <button onClick={() => { setResults([]); setExpanded({}); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="mr-1.5 inline h-4 w-4" />
                清空结果
              </button>
            </>
          )}
          <button onClick={() => navigate('/idea-library')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            脑洞库
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white p-5">
          <div className="space-y-4">
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
              <textarea value={idea} onChange={(event) => setIdea(event.target.value)} rows={4} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-brand" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">题材</span>
              <input value={genre} onChange={(event) => setGenre(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-700">卷数</span>
                <input type="number" value={targetVolume} onChange={(event) => setTargetVolume(Number(event.target.value))} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-brand" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-700">章节</span>
                <input type="number" value={targetChapters} onChange={(event) => setTargetChapters(Number(event.target.value))} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-brand" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-700">万字</span>
                <input type="number" value={wordCount} onChange={(event) => setWordCount(Number(event.target.value))} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-brand" />
              </label>
            </div>
            <button onClick={() => void handleGenerate()} disabled={!canGenerate || isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              生成大纲
            </button>
            {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">{error}</div>}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI 正在构建大纲...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              输入核心创意后点击“生成大纲”。
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-4">
              {results.map((volume, index) => {
                const isExpanded = expanded[index] ?? false;
                return (
                  <div key={`${volume.volumeName}-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button onClick={() => setExpanded((prev) => ({ ...prev, [index]: !isExpanded }))} className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-brand" />
                        <span className="text-sm font-bold text-gray-900">{volume.volumeName}</span>
                        <span className="text-xs text-gray-400">{volume.chapters.length}章</span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {volume.chapters.map((chapter) => (
                          <div key={chapter.id} className="p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <h3 className="text-sm font-medium text-gray-800">{chapter.title}</h3>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-600">{chapter.content || '暂无内容'}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
