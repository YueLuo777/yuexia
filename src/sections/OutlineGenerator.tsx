import { useState, useCallback } from 'react';
import {
  ListTree, Sparkles, Loader2, Copy, Check, Trash2, ChevronDown, ChevronRight,
  BookOpen, FileText,
} from 'lucide-react';
import { callModelAPI, getEnabledModels } from '@/lib/ai';

interface OutlineNode {
  id: string;
  title: string;
  content: string;
}

interface VolumeOutline {
  volumeName: string;
  chapters: OutlineNode[];
}

export default function OutlineGenerator() {
  const [idea, setIdea] = useState('');
  const [genre, setGenre] = useState('');
  const [targetVolume, setTargetVolume] = useState(3);
  const [targetChapters, setTargetChapters] = useState(100);
  const [wordCount, setWordCount] = useState(200);
  const [results, setResults] = useState<VolumeOutline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState(() => {
    try { return localStorage.getItem('outline_gen_model') || ''; } catch { return ''; }
  });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedVolumes, setExpandedVolumes] = useState<Record<number, boolean>>({});

  const models = getEnabledModels();

  const toggleVolume = useCallback((idx: number) => {
    setExpandedVolumes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const buildPrompt = () => {
    return `你是一位资深网络小说大纲策划师，擅长根据创意构思构建完整的小说大纲。

请根据以下信息，生成一份详细的整书大纲：

【题材类型】${genre || '不限'}
【核心创意】${idea}
【全书规划】${targetVolume}卷，约${targetChapters}章，预计${wordCount}万字

要求：
1. 每卷包含：卷名、核心事件、卷末高潮
2. 每章包含：章节标题、核心剧情（100字以内）、爽点/钩子
3. 大纲要有整体节奏感：开局抓人→铺垫升级→小高潮→大高潮→结局
4. 角色要有成长弧光，世界观逐步展开
5. 每卷至少埋1个伏笔，至少收1个伏笔
6. 输出格式如下：

=== 第一卷：卷名 ===
核心事件：xxx
卷末高潮：xxx

第1章 章节名
剧情：xxx
爽点：xxx

第2章 章节名
剧情：xxx
爽点：xxx

（以此类推，每卷列出前5章作为示例，最后列出该卷剩余章节的简要规划）

=== 第二卷：卷名 ===
...

（请完整生成所有${targetVolume}卷的大纲）`;
  };

  const parseOutline = (raw: string): VolumeOutline[] => {
    const volumes: VolumeOutline[] = [];
    const lines = raw.split('\n');
    let currentVolume: VolumeOutline | null = null;
    let currentChapter: OutlineNode | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 匹配卷标题 === 第一卷：xxx ===
      const volMatch = trimmed.match(/^={2,}\s*(第[一二三四五六七八九十\d]+卷[：:]?\s*.+)\s*={2,}$/);
      if (volMatch) {
        if (currentVolume) volumes.push(currentVolume);
        currentVolume = { volumeName: volMatch[1].trim(), chapters: [] };
        currentChapter = null;
        continue;
      }

      // 匹配章节标题 第X章 章节名
      const chapMatch = trimmed.match(/^(第[\d一二三四五六七八九十百千]+章)\s*(.+)$/);
      if (chapMatch && currentVolume) {
        if (currentChapter) currentVolume.chapters.push(currentChapter);
        currentChapter = {
          id: `${currentVolume.volumeName}-${chapMatch[1]}`,
          title: `${chapMatch[1]} ${chapMatch[2]}`,
          content: '',
        };
        continue;
      }

      // 匹配章节内容（剧情、爽点等）
      if (currentChapter) {
        currentChapter.content += trimmed + '\n';
      }
    }

    if (currentChapter && currentVolume) currentVolume.chapters.push(currentChapter);
    if (currentVolume) volumes.push(currentVolume);

    return volumes;
  };

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError('请输入核心创意');
      return;
    }
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

    const volumes = parseOutline(result);
    if (volumes.length === 0) {
      setResults([{
        volumeName: '生成结果',
        chapters: [{ id: 'all', title: '完整大纲', content: result }],
      }]);
    } else {
      setResults(volumes);
      setExpandedVolumes({ 0: true });
    }
  };

  const handleCopy = () => {
    let text = '';
    for (const vol of results) {
      text += `=== ${vol.volumeName} ===\n\n`;
      for (const ch of vol.chapters) {
        text += `${ch.title}\n${ch.content}\n\n`;
      }
      text += '\n';
    }
    navigator.clipboard.writeText(text || results.map((r) => r.chapters.map((c) => c.content).join('\n')).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setResults([]);
    setError('');
  };

  const genreOptions = ['玄幻', '都市', '言情', '修仙', '悬疑', '历史', '末世', '科幻', '游戏', '武侠', '军事', '谍战'];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ListTree className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">大纲生成器</h1>
            <p className="text-xs text-gray-400">输入脑洞，AI 帮你生成完整的整书大纲</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制全部'}
              </button>
              <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> 清空
              </button>
            </>
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
                  try { localStorage.setItem('outline_gen_model', e.target.value); } catch {}
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

            {/* 题材类型 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">题材类型</label>
              <div className="flex flex-wrap gap-1.5">
                {genreOptions.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      genre === g
                        ? 'text-white bg-brand border-brand'
                        : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 核心创意 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                核心创意 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="描述你的小说核心创意，例如：一个普通人意外获得能看到别人寿命的能力，发现身边的人都活不过三天..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none"
              />
            </div>

            {/* 规模参数 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">卷数</label>
                <input
                  type="number"
                  value={targetVolume}
                  onChange={(e) => setTargetVolume(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand text-center"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">总章数</label>
                <input
                  type="number"
                  value={targetChapters}
                  onChange={(e) => setTargetChapters(Number(e.target.value))}
                  min={10}
                  max={1000}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand text-center"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">万字</label>
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  min={10}
                  max={500}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand text-center"
                />
              </div>
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
                  AI 正在构建大纲...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成大纲
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
              <ListTree className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-sm text-gray-400 mb-1">输入核心创意，点击「生成大纲」开始</p>
              <p className="text-xs text-gray-300">AI 会为你生成完整的整书分卷大纲</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
              <p className="text-sm text-gray-500">AI 正在构建大纲，请稍候...</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {results.map((vol, vidx) => (
                <div key={vidx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* 卷标题 */}
                  <button
                    onClick={() => toggleVolume(vidx)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-brand" />
                      <span className="text-sm font-bold text-gray-900">{vol.volumeName}</span>
                      <span className="text-xs text-gray-400">{vol.chapters.length}章</span>
                    </div>
                    {expandedVolumes[vidx] ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* 章节列表 */}
                  {expandedVolumes[vidx] && (
                    <div className="divide-y divide-gray-100">
                      {vol.chapters.map((ch) => (
                        <div key={ch.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">{ch.title}</h4>
                          {ch.content ? (
                            <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
                              {ch.content}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-300 italic">暂无详细内容</p>
                          )}
                        </div>
                      ))}
                      {vol.chapters.length === 0 && (
                        <div className="px-4 py-6 text-center">
                          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">该卷暂无章节信息</p>
                        </div>
                      )}
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
