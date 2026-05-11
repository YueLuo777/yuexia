import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb, Sparkles, Loader2, Copy, Check, Trash2,
  Brain, FileText, BookOpen, Heart, Swords, Rocket,
  Ghost, Crown, Flame, Wand2, Globe, Zap, ShieldAlert,
  Plus, X, Hash, Save, ChevronLeft, ListTree,
  ArrowRight, Library,
} from 'lucide-react';
import { callModelAPI, getEnabledModels } from '@/lib/ai';
import { useIdeaStorage } from '@/hooks/useIdeaStorage';

/* ─── 预定义数据 ─── */

const GENRE_OPTIONS = [
  '玄幻', '修仙', '都市', '科幻', '历史', '悬疑', '游戏',
  '武侠', '军事', '言情', '末世', '体育', '轻小说', '现实',
];

const PRESET_TAGS = [
  '系统', '神豪', '无敌流', '升级流', '末世', '重生', '穿越',
  '迪化流', '凡人流', '无限流', '签到流', '直播流', '脑洞',
  '轻松', '热血', '暗黑', '甜宠', '虐恋', '种田', '争霸',
  '洪荒', '西游', '三国', '火影', '海贼', '漫威', 'DC',
  '幕后流', '苟道流', '长生流', '模拟器', '聊天群', '国运',
];

const COUNT_OPTIONS = [1, 2, 3, 5, 10];

/* ─── 提示词类型（来自提示词管理） ─── */
interface PromptItem {
  id: string;
  name: string;
  content: string;
  category: string;
  description?: string;
}

/* ─── 从 localStorage 读取提示词 ─── */
function loadPromptsFromStorage(): PromptItem[] {
  try {
    const raw = localStorage.getItem('prompt_personal');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

/* ═══════════════════════════════════════════
   提示词占位符格式规范

   在提示词内容中使用 {xxx} 单大括号标记占位符：

   {小说类型}  / {类型}  / {genre}   → 填入用户选择的类型
   {小说标签}  / {标签}  / {tags}    → 填入用户选择的标签
   {补充要求}  / {要求}  / {extra}   → 填入用户的补充要求
   {生成数量}  / {数量}  / {count}   → 填入生成数量

   示例提示词：
   ──────────────────────────────────────────
   你是一位资深小说创意策划师...

   小说类型：{小说类型}
   小说标签：{小说标签}
   补充要求：{补充要求}

   请生成{数量}个完整的小说脑洞...
   ──────────────────────────────────────────
   ═══════════════════════════════════════════ */

const HIGHLIGHT_COLORS = {
  genre: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300', label: '小说类型' },
  tags:  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: '标签' },
  extra: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: '补充要求' },
};

type SegmentType = 'text' | 'genre' | 'tags' | 'extra';

interface Segment {
  type: SegmentType;
  content: string;
}

/* ─── 占位符定义（单大括号 {} 格式） ─── */
function getPlaceholderDefinitions(
  genre: string[], tags: string[], extra: string, count: number,
) {
  const genreText = genre.join('+') || '不限';
  const tagText = tags.join('+') || '无';
  const extraText = extra.trim() || '无';
  const countText = String(count);

  return [
    // 中文占位符
    { regex: /\{小说类型\}/g, value: genreText, type: 'genre' as SegmentType },
    { regex: /\{类型\}/g, value: genreText, type: 'genre' as SegmentType },
    { regex: /\{小说标签\}/g, value: tagText, type: 'tags' as SegmentType },
    { regex: /\{标签\}/g, value: tagText, type: 'tags' as SegmentType },
    { regex: /\{补充要求\}/g, value: extraText, type: 'extra' as SegmentType },
    { regex: /\{要求\}/g, value: extraText, type: 'extra' as SegmentType },
    { regex: /\{生成数量\}/g, value: countText, type: 'count' as SegmentType },
    { regex: /\{数量\}/g, value: countText, type: 'count' as SegmentType },
    // 英文占位符
    { regex: /\{genre\}/g, value: genreText, type: 'genre' as SegmentType },
    { regex: /\{tags\}/g, value: tagText, type: 'tags' as SegmentType },
    { regex: /\{extra\}/g, value: extraText, type: 'extra' as SegmentType },
    // 兼容旧格式双大括号
    { regex: /\{\{类型\}\}/g, value: genreText, type: 'genre' as SegmentType },
    { regex: /\{\{标签\}\}/g, value: tagText, type: 'tags' as SegmentType },
    { regex: /\{\{补充要求\}\}/g, value: extraText, type: 'extra' as SegmentType },
    { regex: /\{\{genre\}\}/g, value: genreText, type: 'genre' as SegmentType },
    { regex: /\{\{tags\}\}/g, value: tagText, type: 'tags' as SegmentType },
    { regex: /\{\{extra\}\}/g, value: extraText, type: 'extra' as SegmentType },
    // 注意：数量相关占位符已移除，不在提示词中显示
  ];
}

/* ─── 构建带高亮分段的预览 ─── */
function buildPreviewSegments(
  template: string,
  genre: string[],
  tags: string[],
  extra: string,
  count: number,
): Segment[] {
  const placeholders = getPlaceholderDefinitions(genre, tags, extra, count);

  // 如果没有占位符，自动追加用户选择信息
  let source = template;
  const hasPlaceholder = /\{[^{}]+\}/.test(source);
  if (!hasPlaceholder) {
    source += `\n\n【用户选择】\n小说类型：{小说类型}\n标签：{小说标签}\n补充要求：{补充要求}`;
  }

  const segments: Segment[] = [];
  let remaining = source;

  while (remaining.length > 0) {
    let nearest: { regex: RegExp; value: string; type: SegmentType; index: number; match: string } | null = null;

    for (const ph of placeholders) {
      const match = ph.regex.exec(remaining);
      if (match && (!nearest || match.index < nearest.index)) {
        nearest = { regex: ph.regex, value: ph.value, type: ph.type, index: match.index, match: match[0] };
      }
      ph.regex.lastIndex = 0;
    }

    if (!nearest) {
      if (remaining) segments.push({ type: 'text', content: remaining });
      break;
    }

    if (nearest.index > 0) {
      segments.push({ type: 'text', content: remaining.slice(0, nearest.index) });
    }
    segments.push({ type: nearest.type, content: nearest.value });
    remaining = remaining.slice(nearest.index + nearest.match.length);
  }

  return segments;
}

/* ─── 生成占位符替换（纯文本版，用于发送给AI） ─── */
function fillPromptTemplate(
  template: string,
  genre: string[],
  tags: string[],
  extra: string,
  count: number,
): string {
  const placeholders = getPlaceholderDefinitions(genre, tags, extra, count);

  let filled = template;
  for (const ph of placeholders) {
    filled = filled.replace(ph.regex, ph.value);
  }

  // 清除剩余的 {类型}/{标签}/{要求} 占位符
  filled = filled.replace(/\{(小说类型|类型|genre|小说标签|标签|tags|补充要求|要求|extra)\}/g, '（未设置）');
  filled = filled.replace(/\{\{(小说类型|类型|genre|小说标签|标签|tags|补充要求|要求|extra)\}\}/g, '（未设置）');

  // 数量不在提示词中占位，而是在最后统一追加
  if (count > 1) {
    filled += `\n\n请一次生成${count}个不同的脑洞，每个脑洞之间用 --- 分隔。`;
  }

  return filled;
}

/* ─── 解析多个脑洞结果 ─── */
function parseIdeas(raw: string, count: number): string[] {
  // 尝试用 --- 分隔
  const blocks = raw.split(/---+/).map((b) => b.trim()).filter((b) => b.length > 20);
  if (blocks.length >= count) return blocks.slice(0, count);

  // 尝试用数字编号分隔（如 1. 或 ①）
  const numbered = raw.split(/\n(?=\d+[\.、]\s)/).map((b) => b.trim()).filter((b) => b.length > 20);
  if (numbered.length >= 2) return numbered.slice(0, count);

  // 尝试用【创意】分隔
  const creative = raw.split(/【创意\d*】/).map((b) => b.trim()).filter((b) => b.length > 20);
  if (creative.length >= 2) return creative.slice(0, count);

  // 回退：按段落分组
  return [raw];
}

export default function IdeaGenerator() {
  const navigate = useNavigate();
  const { addIdea } = useIdeaStorage();

  /* ── 状态 ── */
  const [modelId, setModelId] = useState('');
  const [promptId, setPromptId] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('idea_custom_tags') || '[]'); }
    catch { return []; }
  });
  const [genCount, setGenCount] = useState(1);
  const [extraRequirement, setExtraRequirement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ title: string; content: string }[]>([]);
  const [activeResultTab, setActiveResultTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  /* ── 脑洞历史 ── */
  interface HistoryItem {
    id: string;
    title: string;
    content: string;
    modelName: string;
    promptName: string;
    genre: string;
    tags: string;
    createdAt: string;
  }
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('idea_gen_history') || '[]'); }
    catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  /* ── 加载数据 ── */
  const models = useMemo(() => getEnabledModels(), []);
  const prompts = useMemo(() => loadPromptsFromStorage(), []);

  // 加载上次使用的模型
  useEffect(() => {
    try {
      const saved = localStorage.getItem('idea_gen_model');
      if (saved) setModelId(saved);
      else if (models.length > 0) setModelId(models[0].id);
    } catch { /* ignore */ }
  }, [models]);

  // 加载上次使用的提示词
  useEffect(() => {
    try {
      const saved = localStorage.getItem('idea_gen_prompt');
      if (saved && prompts.some((p) => p.id === saved)) setPromptId(saved);
      else if (prompts.length > 0) setPromptId(prompts[0].id);
    } catch { /* ignore */ }
  }, [prompts]);

  const selectedPrompt = prompts.find((p) => p.id === promptId);

  /* ── 操作 ── */
  const toggleGenre = useCallback((g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }, []);

  const toggleTag = useCallback((t: string) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (!customTags.includes(tag)) {
      const next = [...customTags, tag];
      setCustomTags(next);
      try { localStorage.setItem('idea_custom_tags', JSON.stringify(next)); } catch { }
    }
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  }, [customTagInput, customTags, selectedTags]);

  const removeCustomTag = useCallback((tag: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
    try {
      localStorage.setItem('idea_custom_tags', JSON.stringify(customTags.filter((t) => t !== tag)));
    } catch { }
  }, [customTags]);

  const canGenerate = modelId && promptId;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (models.length === 0) {
      setError('未配置模型，请先在「模型管理」中添加并启用模型。');
      return;
    }
    if (prompts.length === 0) {
      setError('没有可用的提示词，请先在「提示词管理」中创建提示词。');
      return;
    }

    setError('');
    setIsLoading(true);
    setResults([]);

    const promptContent = selectedPrompt?.content || '';
    const filledPrompt = fillPromptTemplate(
      promptContent,
      selectedGenres,
      selectedTags,
      extraRequirement,
      genCount
    );

    const result = await callModelAPI(filledPrompt, modelId);
    setIsLoading(false);

    if (result.startsWith('【错误】')) {
      setError(result);
      return;
    }

    // 解析多个脑洞
    const ideas = parseIdeas(result, genCount);
    const parsed = ideas.map((content, idx) => {
      const lines = content.split('\n').filter((l) => l.trim());
      const titleLine = lines.find((l) => l.includes('《') && l.includes('》')) || lines[0] || `脑洞 ${idx + 1}`;
      const title = titleLine.replace(/^#+\s*/, '').replace(/^\d+[\.、]\s*/, '').replace(/[*#【】]/g, '').trim().slice(0, 60);
      return { title, content };
    });

    setResults(parsed);
    setActiveResultTab(0);

    // 保存到历史记录
    const modelName = models.find((m) => m.id === modelId)?.name || modelId;
    const newHistoryItems: HistoryItem[] = parsed.map((r) => ({
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: r.title,
      content: r.content,
      modelName,
      promptName: selectedPrompt?.name || '未知',
      genre: selectedGenres.join('+') || '未分类',
      tags: [...selectedGenres, ...selectedTags].join('+'),
      createdAt: new Date().toLocaleString('zh-CN'),
    }));
    setHistory((prev) => {
      const next = [...newHistoryItems, ...prev].slice(0, 100); // 保留最近100条
      try { localStorage.setItem('idea_gen_history', JSON.stringify(next)); } catch { }
      return next;
    });

    // 保存使用偏好
    try {
      localStorage.setItem('idea_gen_model', modelId);
      localStorage.setItem('idea_gen_prompt', promptId);
    } catch { }
  };

  const handleCopy = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSave = (index: number, title: string, content: string) => {
    const modelName = models.find((m) => m.id === modelId)?.name || modelId;
    addIdea({
      title,
      content,
      promptType: promptId,
      promptName: selectedPrompt?.name || '未知',
      genre: selectedGenres.join('+') || '未分类',
      tags: [...selectedGenres, ...selectedTags],
      modelId,
      modelName,
      status: 'draft',
    });
    setSavedIndex(index);
    setTimeout(() => setSavedIndex(null), 2000);
  };

  const handleSaveAll = () => {
    const modelName = models.find((m) => m.id === modelId)?.name || modelId;
    results.forEach((r) => {
      addIdea({
        title: r.title,
        content: r.content,
        promptType: promptId,
        promptName: selectedPrompt?.name || '未知',
        genre: selectedGenres.join('+') || '未分类',
        tags: [...selectedGenres, ...selectedTags],
        modelId,
        modelName,
        status: 'draft',
      });
    });
  };

  const handleClear = () => {
    setResults([]);
    setError('');
  };

  const allTags = [...PRESET_TAGS, ...customTags];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">脑洞生成器</h1>
            <p className="text-xs text-gray-400">选择提示词与AI模型，一键生成小说脑洞</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 脑洞历史按钮 */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Library className="w-4 h-4" />
            脑洞历史
            {history.length > 0 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{history.length}</span>
            )}
          </button>
          {results.length > 0 && (
            <>
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
              >
                <Save className="w-4 h-4" />
                全部保存
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            </>
          )}
        </div>
      </div>

      {/* 脑洞历史弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[640px] max-w-[90vw] max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">脑洞历史</h2>
                <p className="text-xs text-gray-400 mt-0.5">共 {history.length} 条历史记录</p>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('确定要清空所有历史记录吗？')) {
                        setHistory([]);
                        try { localStorage.removeItem('idea_gen_history'); } catch { }
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    清空历史
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Library className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">暂无历史记录</p>
                  <p className="text-xs text-gray-300 mt-1">生成的脑洞会自动保存在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1 mr-2">{item.title}</h3>
                        <span className="text-[10px] text-gray-400 shrink-0">{item.createdAt}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-3 mb-2">{item.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>模型: {item.modelName}</span>
                        <span>提示词: {item.promptName}</span>
                        <span>类型: {item.genre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 - 配置区 */}
        <aside className="w-[400px] flex flex-col bg-white border-r border-gray-200 shrink-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ①② 选择模型 + 提示词 — 同一行 */}
            <div className="grid grid-cols-2 gap-3">
              <ConfigSection icon={<Brain className="w-4 h-4" />} title="选择AI模型" required>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white"
                >
                  <option value="">请选择模型</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {models.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">请先在「模型管理」中添加并启用模型</p>
                )}
              </ConfigSection>

              <ConfigSection icon={<FileText className="w-4 h-4" />} title="选择提示词" required>
                <select
                  value={promptId}
                  onChange={(e) => setPromptId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white"
                >
                  <option value="">请选择提示词</option>
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {prompts.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">请先在「提示词管理」中创建提示词</p>
                )}
              </ConfigSection>
            </div>
            {selectedPrompt && (
              <p className="text-xs text-gray-400 -mt-3 ml-1">{selectedPrompt.description || selectedPrompt.content.slice(0, 80)}...</p>
            )}

            {/* ③ 小说类型（多选） */}
            <ConfigSection icon={<BookOpen className="w-4 h-4" />} title="小说类型" subtitle="可多选组合，如 玄幻+科幻">
              <div className="flex flex-wrap gap-1.5">
                {GENRE_OPTIONS.map((g) => {
                  const active = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        active
                          ? 'bg-brand text-white border-brand'
                          : 'text-gray-600 bg-white border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              {selectedGenres.length > 0 && (
                <p className="text-xs text-brand mt-1.5">
                  已选：{selectedGenres.join('+')}
                </p>
              )}
            </ConfigSection>

            {/* ④ 标签选择（多选+自定义） */}
            <ConfigSection icon={<Hash className="w-4 h-4" />} title="标签" subtitle="可多选组合，支持自定义">
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => {
                  const active = selectedTags.includes(t);
                  const isCustom = customTags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`group flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
                        active
                          ? 'bg-brand text-white border-brand'
                          : 'text-gray-600 bg-white border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {t}
                      {isCustom && !active && (
                        <span
                          onClick={(e) => { e.stopPropagation(); removeCustomTag(t); }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* 自定义标签输入 */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomTag(); }}
                  placeholder="输入自定义标签，按回车添加"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
                />
                <button
                  onClick={addCustomTag}
                  className="px-3 py-1.5 text-xs text-brand border border-brand/30 rounded-lg hover:bg-brand-light transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-brand mt-1.5">
                  已选：{selectedTags.join('+')}
                </p>
              )}
            </ConfigSection>

            {/* ⑤ 生成数量 */}
            <ConfigSection icon={<Hash className="w-4 h-4" />} title="生成数量">
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setGenCount(n)}
                    className={`w-10 h-8 text-xs rounded-lg border transition-all ${
                      genCount === n
                        ? 'bg-brand text-white border-brand font-medium'
                        : 'text-gray-600 bg-white border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </ConfigSection>

            {/* ⑥ 补充要求 */}
            <ConfigSection icon={<Sparkles className="w-4 h-4" />} title="补充要求">
              <textarea
                value={extraRequirement}
                onChange={(e) => setExtraRequirement(e.target.value)}
                placeholder="例如：主角性格要沉稳内敛，不要穿越梗，要有权谋斗争..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none"
              />
            </ConfigSection>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在生成...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成{genCount > 1 ? `${genCount}个` : ''}脑洞
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
        <main className="flex-1 overflow-hidden bg-gray-50">
          {results.length === 0 && !isLoading ? (
            selectedPrompt ? (
              /* 已选提示词 — 显示带高亮的提示词预览 */
              <PromptPreviewPanel
                prompt={selectedPrompt}
                segments={buildPreviewSegments(selectedPrompt.content, selectedGenres, selectedTags, extraRequirement, genCount)}
                genre={selectedGenres}
                tags={selectedTags}
                extra={extraRequirement}
              />
            ) : (
              /* 未选提示词 — 空状态 */
              <div className="flex flex-col items-center justify-center h-full">
                <Lightbulb className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-sm text-gray-400 mb-1">配置完成后点击「生成脑洞」</p>
                <p className="text-xs text-gray-300">AI 将根据你的选择生成专业级小说创意</p>
              </div>
            )
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
              <p className="text-sm text-gray-500">AI 正在生成中，请稍候...</p>
              <p className="text-xs text-gray-400 mt-1">
                使用「{selectedPrompt?.name}」提示词 × {selectedGenres.join('+') || '不限类型'}
                {selectedTags.length > 0 ? ` + ${selectedTags.join('+')}` : ''}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              {/* 脑洞标签栏 */}
              <div className="px-4 pt-3 pb-0 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-1">
                  {results.map((idea, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveResultTab(idx)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-t-lg border-b-2 transition-all ${
                        activeResultTab === idx
                          ? 'text-brand border-brand bg-brand-light font-medium'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      脑洞 {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* 当前选中的脑洞内容 — 独立滚动 */}
              <div className="flex-1 overflow-y-auto p-6">
                {results[activeResultTab] && (
                  <div className="max-w-3xl mx-auto">
                    {/* 标题栏 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-gray-900">
                          {results[activeResultTab].title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(activeResultTab, results[activeResultTab].content)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {copiedIndex === activeResultTab ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedIndex === activeResultTab ? '已复制' : '复制'}
                        </button>
                        <button
                          onClick={() => handleSave(activeResultTab, results[activeResultTab].title, results[activeResultTab].content)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand border border-brand/30 rounded-lg hover:bg-brand-light transition-colors"
                        >
                          {savedIndex === activeResultTab ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
                          {savedIndex === activeResultTab ? '已保存' : '保存'}
                        </button>
                        <button
                          onClick={() => navigate('/idea-library')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Library className="w-3.5 h-3.5" />
                          脑洞库
                        </button>
                      </div>
                    </div>
                    {/* 内容 */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                        {results[activeResultTab].content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─── 子组件：带高亮的提示词预览面板 ─── */
function PromptPreviewPanel({ prompt, segments, genre, tags, extra }: {
  prompt: PromptItem; segments: Segment[]; genre: string[]; tags: string[]; extra: string;
}) {
  const renderSegments = () => {
    const lines: Segment[][] = [[]];
    for (const seg of segments) {
      if (seg.type === 'text' && seg.content.includes('\n')) {
        const parts = seg.content.split('\n');
        parts.forEach((part, i) => {
          if (i > 0) lines.push([]);
          if (part) lines[lines.length - 1].push({ type: 'text', content: part });
        });
      } else {
        lines[lines.length - 1].push(seg);
      }
    }

    return lines.map((line, lineIdx) => (
      <span key={lineIdx}>
        {line.map((seg, segIdx) => {
          if (seg.type === 'text') {
            return <span key={segIdx} className="text-gray-700">{seg.content}</span>;
          }
          const colors = HIGHLIGHT_COLORS[seg.type];
          return (
            <span
              key={segIdx}
              className={`inline-block mx-0.5 px-1.5 py-0.5 text-xs font-semibold rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}
              title={`${colors.label}: ${seg.content}`}
            >
              {seg.content}
            </span>
          );
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    ));
  };

  // 摘要行数据
  const genreText = genre.join('+') || '未选择';
  const tagText = tags.join('+') || '未选择';
  const extraText = extra.trim() || '无';

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium text-gray-700">提示词预览</span>
          <span className="text-xs text-gray-400">「{prompt.name}」</span>
        </div>
        <span className="text-xs text-gray-400">{prompt.content.length} 字</span>
      </div>

      {/* 预览内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 顶部摘要行 — 像截图中的那样 */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-sky-50 text-sky-700 border-sky-200">
              <span className="opacity-60">小说类型:</span>
              <span className="font-semibold">{genreText}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="opacity-60">标签:</span>
              <span className="font-semibold">{tagText}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-amber-50 text-amber-700 border-amber-200">
              <span className="opacity-60">补充要求:</span>
              <span className="font-semibold">{extraText}</span>
            </span>
          </div>

          {/* 提示词内容卡片 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {prompt.description && (
              <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">{prompt.description}</p>
            )}

            {/* 高亮渲染的提示词 */}
            <div className="text-sm leading-relaxed font-sans">
              {renderSegments()}
            </div>
          </div>

          {/* 图例说明 */}
          <div className="flex items-center gap-4 px-3 py-2">
            <span className="text-[11px] text-gray-400">图例：</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border bg-sky-100 text-sky-700 border-sky-300">小说类型</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border bg-emerald-100 text-emerald-700 border-emerald-300">标签</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border bg-amber-100 text-amber-700 border-amber-300">补充要求</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 子组件：配置区块 ─── */
function ConfigSection({
  icon,
  title,
  subtitle,
  required,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-medium text-gray-700">
            {title}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </span>
        </div>
        {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
