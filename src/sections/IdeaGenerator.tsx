import { useState, useCallback } from 'react';
import {
  Lightbulb, Sparkles, Loader2, Copy, Check, Trash2, Wand2,
  BookOpen, Heart, Swords, Rocket, Ghost, Crown, Flame,
} from 'lucide-react';
import { callModelAPI, getEnabledModels } from '@/lib/ai';

const PRESET_TAGS = [
  { label: '玄幻', icon: Sparkles },
  { label: '都市', icon: BookOpen },
  { label: '言情', icon: Heart },
  { label: '修仙', icon: Rocket },
  { label: '悬疑', icon: Ghost },
  { label: '历史', icon: Crown },
  { label: '末世', icon: Flame },
  { label: '系统', icon: Wand2 },
  { label: '武侠', icon: Swords },
];

interface IdeaResult {
  id: number;
  title: string;
  summary: string;
  tags: string[];
  highlights: string[];
  raw: string;
}

export default function IdeaGenerator() {
  const [input, setInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<IdeaResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [modelId, setModelId] = useState(() => {
    try { return localStorage.getItem('idea_gen_model') || ''; } catch { return ''; }
  });
  const [error, setError] = useState('');

  const models = getEnabledModels();

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const buildPrompt = () => {
    const tagsText = selectedTags.length > 0 ? `类型偏好：${selectedTags.join('、')}` : '';
    const userInput = input.trim();

    return `你是一位资深网文编辑和创意策划师，擅长发掘新颖有趣的小说题材和创意。

请根据以下信息，生成5个截然不同、各具特色的小说脑洞/题材创意：

${tagsText ? tagsText + '\n' : ''}${userInput ? `用户额外要求：${userInput}\n` : ''}

要求：
1. 每个创意必须包含：标题（吸引人）、一句话梗概、核心卖点（2-3个）
2. 创意要新颖，避免陈词滥调，但要有市场潜力
3. 类型尽量多样化，覆盖不同读者群体
4. 输出格式如下：

---
【创意1】标题：xxx
梗概：xxx
卖点：
- xxx
- xxx
---
（以此类推）`;
  };

  const parseResults = (raw: string): IdeaResult[] => {
    const blocks = raw.split(/---+/).filter((b) => b.trim());
    const ideas: IdeaResult[] = [];
    let id = Date.now();

    for (const block of blocks) {
      const titleMatch = block.match(/标题[：:]\s*(.+)/);
      const summaryMatch = block.match(/梗概[：:]\s*(.+)/);
      const highlights = [...block.matchAll(/[-\*•]\s*(.+)/g)].map((m) => m[1].trim());

      if (titleMatch && summaryMatch) {
        ideas.push({
          id: id++,
          title: titleMatch[1].trim().replace(/^[【\[\(].*?[】\]\)]\s*/, ''),
          summary: summaryMatch[1].trim(),
          tags: selectedTags,
          highlights: highlights.slice(0, 3),
          raw: block.trim(),
        });
      }
    }

    return ideas;
  };

  const handleGenerate = async () => {
    if (models.length === 0) {
      setError('未配置模型，请先在「模型管理」中添加并启用模型。');
      return;
    }
    setError('');
    setIsLoading(true);
    const prompt = buildPrompt();
    const result = await callModelAPI(prompt, modelId || undefined);
    setIsLoading(false);

    if (result.startsWith('【错误】')) {
      setError(result);
      return;
    }

    const ideas = parseResults(result);
    if (ideas.length === 0) {
      // 解析失败，把整个结果作为一个创意
      setResults([{
        id: Date.now(),
        title: '生成结果',
        summary: result.slice(0, 200) + '...',
        tags: selectedTags,
        highlights: [],
        raw: result,
      }]);
    } else {
      setResults(ideas);
    }
  };

  const handleCopy = (idea: IdeaResult) => {
    navigator.clipboard.writeText(idea.raw);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const all = results.map((r) => r.raw).join('\n\n---\n\n');
    navigator.clipboard.writeText(all);
  };

  const clearAll = () => {
    setResults([]);
    setError('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">脑洞生成器</h1>
            <p className="text-xs text-gray-400">让 AI 帮你发散思维，发掘有趣的小说题材</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <button onClick={handleCopyAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Copy className="w-4 h-4" /> 复制全部
            </button>
          )}
          {results.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" /> 清空
            </button>
          )}
        </div>
      </div>

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧输入区 */}
        <aside className="w-[380px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 模型选择 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">选择模型</label>
              <select
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value);
                  try { localStorage.setItem('idea_gen_model', e.target.value); } catch {}
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white"
              >
                {models.length === 0 ? (
                  <option value="">未配置模型</option>
                ) : (
                  models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
                )}
              </select>
              {models.length === 0 && (
                <p className="text-xs text-red-400 mt-1">请先在「模型管理」中添加模型</p>
              )}
            </div>

            {/* 类型标签 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">偏好类型（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => {
                  const Icon = tag.icon;
                  const isActive = selectedTags.includes(tag.label);
                  return (
                    <button
                      key={tag.label}
                      onClick={() => toggleTag(tag.label)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-all ${
                        isActive
                          ? 'text-white bg-brand border-brand'
                          : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 额外描述 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">补充要求（可选）</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：想要一个主角很苟的题材、想要甜甜的恋爱、想要烧脑悬疑..."
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none"
              />
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在脑洞大开...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成脑洞
                </>
              )}
            </button>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* 右侧结果区 */}
        <main className="flex-1 overflow-y-auto p-6">
          {results.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Lightbulb className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-sm text-gray-400 mb-1">选择类型偏好，点击「生成脑洞」开始</p>
              <p className="text-xs text-gray-300">AI 会为你生成5个不同的小说题材创意</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {results.map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  {/* 标题 */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{idea.title}</h3>
                    <button
                      onClick={() => handleCopy(idea)}
                      className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-md transition-colors shrink-0 ml-2"
                      title="复制"
                    >
                      {copiedId === idea.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 标签 */}
                  {idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {idea.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] text-brand bg-brand-light rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 梗概 */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{idea.summary}</p>

                  {/* 卖点 */}
                  {idea.highlights.length > 0 && (
                    <div className="space-y-1">
                      {idea.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-gray-500">{h}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
