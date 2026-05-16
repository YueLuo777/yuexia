import { useState, useEffect } from 'react';
import { useNovelsContext } from '@/hooks/useNovels';
import { useMaterials } from '@/hooks/useMaterials';
import { useTags } from '@/hooks/useTags';
import {
  Sparkles, X, ChevronDown, Loader2, BookOpen, FileText, AlertCircle,
  FileCode2, Lightbulb, Pencil, Trash2, Tag, ChevronRight, Check, Plus,
} from 'lucide-react';

interface ExtractPlotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  description: string;
}

interface ExtractResult {
  chapterId: number;
  chapterTitle: string;
  plotText: string;
  tags?: string[];
}

export default function ExtractPlotModal({ isOpen, onClose }: ExtractPlotModalProps) {
  const { novels, currentNovelId, volumesMap } = useNovelsContext();
  const { addMaterial } = useMaterials();
  const { tags, tagsByCategory, categories } = useTags();

  const currentNovel = novels.find((n) => n.id === currentNovelId);
  const volumes = currentNovelId ? (volumesMap[currentNovelId] || []) : [];
  const allChapters = volumes.flatMap((vol) =>
    vol.chapters.map((ch) => ({
      ...ch,
      volumeName: vol.name,
    }))
  );

  // 模型
  const [models, setModels] = useState<ApiModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');

  // 提示词
  const [prompts, setPrompts] = useState<{ id: string; name: string; content: string }[]>([]);
  const [selectedPromptName, setSelectedPromptName] = useState('');

  // 章节选择
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());

  // 标签选择
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState('');
  const [expandedTagCats, setExpandedTagCats] = useState<Record<string, boolean>>({
    '主角设定与开局逻辑': false,
    '剧情推进与爽点逻辑': false,
    '社交交互与情感反馈': false,
    '场景、结构与氛围锚点': false,
  });

  // 提炼状态
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResults, setExtractedResults] = useState<ExtractResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // AI 标签分类
  const [isAiTagging, setIsAiTagging] = useState(false);
  const [aiTagAssignments, setAiTagAssignments] = useState<Record<number, string[]>>({});
  const [pendingSaveResults, setPendingSaveResults] = useState<ExtractResult[]>([]);

  // 用户确认标签的弹窗
  const [showTagConfirm, setShowTagConfirm] = useState(false);

  const [showMaterials, setShowMaterials] = useState(false);

  const { materials, deleteMaterial } = useMaterials();
  const currentMaterials = materials.filter((m) => m.novelId === currentNovelId && m.type === 'novel');

  const extractSummary = (content: string): string => {
    return content.replace(/^【来源：[^】]+】\n\n/, '').trim();
  };

  // 加载模型和提示词
  useEffect(() => {
    try {
      const raw = localStorage.getItem('api_settings_v2');
      if (raw) {
        const data = JSON.parse(raw);
        const enabledModels: ApiModelConfig[] = (data.models || []).filter((m: any) => m.enabled);
        setModels(enabledModels);
        if (enabledModels.length > 0) {
          setSelectedModelId(enabledModels[0].id);
        }
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('prompt_personal');
      if (raw) {
        const list = JSON.parse(raw);
        const extractPrompts = list.filter((p: any) => p.category === '提炼');
        setPrompts(extractPrompts);
        if (extractPrompts.length > 0) {
          setSelectedPromptName(extractPrompts[0].name);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const toggleChapter = (id: number) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedChapterIds(new Set(allChapters.map((ch) => ch.id)));
  const clearSelection = () => setSelectedChapterIds(new Set());
  const selectCount = (count: number) => {
    const ids = allChapters.slice(0, count).map((ch) => ch.id);
    setSelectedChapterIds(new Set(ids));
  };

  const getSelectedPromptContent = () => {
    const p = prompts.find((p) => p.name === selectedPromptName);
    return p?.content || '';
  };

  const getSelectedPrompt = () => {
    return prompts.find((p) => p.name === selectedPromptName);
  };

  // 直接调用 AI API
  const callAI = async (chapterTitle: string, chapterContent: string): Promise<string> => {
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) throw new Error('未找到选中的模型');
    if (!model.baseUrl) throw new Error('模型缺少 Base URL');
    if (!model.apiKey) throw new Error('模型缺少 API Key');

    const promptContent = getSelectedPromptContent();
    const messages = [];
    if (promptContent.trim()) {
      messages.push({ role: 'system', content: promptContent });
    }
    messages.push({
      role: 'user',
      content: `请根据上述要求，提炼以下小说章节的剧情要点。\n\n章节标题：${chapterTitle}\n\n章节内容（前3000字）：\n${chapterContent.substring(0, 3000)}`,
    });

    const baseUrl = model.baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`请求失败 (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return (data.choices?.[0]?.message?.content || '').trim();
  };

  const handleExtract = async () => {
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) { setErrorMsg('未找到可用模型，请先在「设置 → API配置」中配置并启用模型。'); return; }
    if (!model.baseUrl || !model.apiKey) { setErrorMsg('模型配置不完整，缺少 Base URL 或 API Key。'); return; }
    if (selectedChapterIds.size === 0) { setErrorMsg('请至少选择一章'); return; }

    setIsExtracting(true);
    setErrorMsg(null);
    setProgress(0);

    const selectedChapters = allChapters.filter((ch) => selectedChapterIds.has(ch.id));
    const results: ExtractResult[] = [];

    for (let i = 0; i < selectedChapters.length; i++) {
      const ch = selectedChapters[i];
      setProgress(i);

      try {
        const content = localStorage.getItem(`novel_${currentNovelId}_chapter_${ch.id}`) || '';
        const chapterTitle = `第${ch.serialNumber}章${ch.title ? ' ' + ch.title : ''}`;

        let plotText = '';
        if (!content.trim()) {
          plotText = '（该章节暂无内容，无法提炼）';
        } else {
          plotText = await callAI(chapterTitle, content);
        }

        results.push({ chapterId: ch.id, chapterTitle, plotText });
        setExtractedResults([...results]);
      } catch (err: any) {
        const chapterTitle = `第${ch.serialNumber}章${ch.title ? ' ' + ch.title : ''}`;
        const errorText = err?.message || '提炼失败';
        setErrorMsg(errorText);
        results.push({ chapterId: ch.id, chapterTitle, plotText: `提炼失败：${errorText}` });
        setExtractedResults([...results]);
      }
    }

    setIsExtracting(false);
    setProgress(0);

    // ─── 提炼完成，进入AI标签分类阶段 ───
    const validResults = results.filter(r => r.plotText && !r.plotText.startsWith('提炼失败') && r.plotText !== '（该章节暂无内容，无法提炼）');
    if (validResults.length > 0) {
      await handleAiTagging(validResults);
    }
  };

  // ─── AI 自动标签分类 ───
  const handleAiTagging = async (results: ExtractResult[]) => {
    setIsAiTagging(true);
    setPendingSaveResults(results);

    try {
      const model = models.find((m) => m.id === selectedModelId);
      if (!model || !model.baseUrl || !model.apiKey) {
        // AI分类不可用，直接让用户手动选择
        const defaultTags = Array.from(selectedTags);
        const fallback: Record<number, string[]> = {};
        for (const r of results) {
          fallback[r.chapterId] = defaultTags.length > 0 ? [...defaultTags] : [];
        }
        setAiTagAssignments(fallback);
        setShowTagConfirm(true);
        setIsAiTagging(false);
        return;
      }

      // 构建所有可用标签列表
      const allTagsList = tags.map(t => `${t.name}${t.description ? `(${t.description.slice(0, 20)})` : ''}`).join('、');

      const promptContent = `你是一个网文剧情分类专家。请分析以下提炼的剧情要点，为每个剧情点推荐最合适的标签。

可用标签列表（共${tags.length}个）：
${allTagsList}

规则：
1. 每个剧情点至少选择1个标签，最多选择10个标签
2. 选择最贴合剧情内容的标签，宁缺毋滥
3. 如果某个剧情点与多个标签都相关，可以选多个（不超过10个）
4. 如果某个剧情点无法匹配任何标签，返回"无匹配"
5. 只返回标签名，不要返回描述或其他内容

请为以下每个剧情点推荐标签，格式如下：
[剧情序号] 标签1,标签2,标签3

剧情要点：`;

      const plotSummaries = results.map((r, idx) => `${idx + 1}. ${r.chapterTitle}：${r.plotText.slice(0, 200)}`).join('\n');

      const messages = [
        { role: 'system', content: promptContent },
        { role: 'user', content: plotSummaries },
      ];

      const baseUrl = model.baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          temperature: 0.3,
          max_tokens: 2000,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error('AI标签分类请求失败');
      }

      const data = await res.json();
      const aiResponse = (data.choices?.[0]?.message?.content || '').trim();

      // 解析AI返回的标签
      const assignments: Record<number, string[]> = {};

      // 先初始化为手动选择的标签
      const defaultTags = Array.from(selectedTags);
      for (const r of results) {
        assignments[r.chapterId] = defaultTags.length > 0 ? [...defaultTags] : [];
      }

      // 解析AI返回
      const lines = aiResponse.split('\n').filter(l => l.trim());
      for (let i = 0; i < results.length && i < lines.length; i++) {
        const line = lines[i];
        // 匹配 [数字] 标签列表 或 数字. 标签列表
        const tagMatch = line.match(/^\[?(\d+)\]?[.\s]*(.+)$/);
        if (tagMatch) {
          const tagStr = tagMatch[2].trim();
          if (tagStr !== '无匹配') {
            // 分割标签，去重，最多10个
            const aiTags = tagStr.split(/[,，、]/).map(t => t.trim()).filter(t => t.length > 0);
            // 只保留实际存在的标签名
            const validTags = aiTags.filter(tagName => tags.some(t => t.name === tagName)).slice(0, 10);
            if (validTags.length > 0) {
              assignments[results[i].chapterId] = validTags;
            }
          }
        }
      }

      setAiTagAssignments(assignments);
      setShowTagConfirm(true);
    } catch (err: any) {
      console.error('AI标签分类失败:', err);
      // 失败时使用手动选择的标签
      const defaultTags = Array.from(selectedTags);
      const fallback: Record<number, string[]> = {};
      for (const r of results) {
        fallback[r.chapterId] = defaultTags.length > 0 ? [...defaultTags] : [];
      }
      setAiTagAssignments(fallback);
      setShowTagConfirm(true);
    }

    setIsAiTagging(false);
  };

  // ─── 用户确认标签后保存 ───
  const handleConfirmSave = () => {
    const bookTitle = currentNovel?.title || '未命名作品';

    for (const result of pendingSaveResults) {
      const resultTags = aiTagAssignments[result.chapterId] || [];
      const ch = allChapters.find(c => c.id === result.chapterId);
      if (!ch) continue;

      const chapterTitle = `第${ch.serialNumber}章${ch.title ? ' ' + ch.title : ''}`;
      const tagsLine = resultTags.length > 0 ? `\n【标签】${resultTags.join('、')}` : '';
      const contentToStore = `${result.plotText}\n\n【出处】《${bookTitle}》-第${ch.serialNumber}章\n【评分】80分${tagsLine}`;

      addMaterial({
        novelId: currentNovelId || 0,
        novelTitle: bookTitle,
        type: 'novel',
        title: `${bookTitle} · ${chapterTitle} — 剧情提炼`,
        content: contentToStore,
        chapterName: ch.title || '',
        chapterSerial: ch.serialNumber,
        rating: 80,
      });
    }

    setShowTagConfirm(false);
    setPendingSaveResults([]);
    setAiTagAssignments({});
  };

  // ─── 切换标签 ───
  const toggleResultTag = (chapterId: number, tagName: string) => {
    setAiTagAssignments(prev => {
      const current = prev[chapterId] || [];
      if (current.includes(tagName)) {
        // 至少保留1个
        if (current.length <= 1) return prev;
        return { ...prev, [chapterId]: current.filter(t => t !== tagName) };
      } else {
        // 最多10个
        if (current.length >= 10) return prev;
        return { ...prev, [chapterId]: [...current, tagName] };
      }
    });
  };

  // 右侧显示模式
  const rightMode = isExtracting || isAiTagging || extractedResults.length > 0 ? 'result' : 'preview';

  if (!isOpen) return null;

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasApiConfig = !!(selectedModel?.baseUrl && selectedModel?.apiKey);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      {/* 加宽弹窗 */}
      <div className="w-[1100px] max-w-[96vw] max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            <h3 className="text-base font-bold text-gray-900">提炼剧情</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMaterials(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand border border-brand rounded-md hover:bg-brand-light transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              打开资料库
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 主体：左右分栏 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：配置区 */}
          <div className="w-[420px] min-w-0 p-5 space-y-4 border-r border-gray-100 flex flex-col overflow-hidden">

            {!hasApiConfig && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-700">模型配置不完整</p>
                  <p className="text-[10px] text-amber-500 mt-0.5">请先在「设置 → API配置」中添加并启用模型，确保已填写 Base URL 和 API Key。</p>
                </div>
              </div>
            )}

            {/* 模型 */}
            <div className="flex items-center gap-3 shrink-0">
              <label className="text-xs text-gray-500 shrink-0 w-12">模型</label>
              <div className="relative flex-1">
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white hover:border-brand focus:outline-none focus:border-brand cursor-pointer"
                >
                  {models.length === 0 ? (
                    <option value="">暂无可用模型</option>
                  ) : (
                    models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 提示词 */}
            <div className="flex items-center gap-3 shrink-0">
              <label className="text-xs text-gray-500 shrink-0 w-12">提示词</label>
              <div className="relative flex-1">
                <select
                  value={selectedPromptName}
                  onChange={(e) => setSelectedPromptName(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white hover:border-brand focus:outline-none focus:border-brand cursor-pointer"
                >
                  {prompts.length === 0 ? (
                    <option value="">暂无提炼提示词，请在提示词管理-提炼分类下创建</option>
                  ) : (
                    prompts.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 书名显示 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 rounded-lg shrink-0">
              <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
              <span className="text-xs text-gray-500">书名：</span>
              <span className="text-sm font-semibold text-sky-700">{currentNovel?.title || '未选择作品'}</span>
            </div>

            {/* ═══ 标签选择 ═══ */}
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-violet-500" />
                  <label className="text-sm font-medium text-gray-700">标签标注</label>
                </div>
                {selectedTags.size > 0 && (
                  <span className="text-xs text-violet-500">已选 {selectedTags.size} 个</span>
                )}
              </div>

              {/* 搜索 */}
              <div className="relative mb-1.5">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="搜索标签..."
                  className="w-full px-3 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-violet-300"
                />
              </div>

              {/* 已选标签 */}
              {selectedTags.size > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {Array.from(selectedTags).map(tagName => (
                    <span key={tagName} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full">
                      {tagName}
                      <button onClick={() => setSelectedTags(prev => { const next = new Set(prev); next.delete(tagName); return next; })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 按分类展开的标签列表 */}
              <div className="max-h-[120px] overflow-y-auto border border-gray-100 rounded-md p-1.5 space-y-0.5">
                {categories.map(cat => {
                  const catTags = (tagsByCategory[cat.name] || []).filter(t =>
                    !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                    (t.description && t.description.toLowerCase().includes(tagSearch.toLowerCase()))
                  );
                  if (catTags.length === 0) return null;
                  const isExpanded = expandedTagCats[cat.name] ?? false;

                  return (
                    <div key={cat.name}>
                      <button onClick={() => setExpandedTagCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                        className="w-full flex items-center gap-1 py-0.5 text-left"
                        title={cat.description}>
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[10px] text-gray-500">{cat.name}</span>
                      </button>
                      {isExpanded && (
                        <div className="ml-3 flex flex-wrap gap-1 py-0.5">
                          {catTags.map(tag => {
                            const isSelected = selectedTags.has(tag.name);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => setSelectedTags(prev => {
                                  const next = new Set(prev);
                                  if (isSelected) next.delete(tag.name); else next.add(tag.name);
                                  return next;
                                })}
                                title={tag.description}
                                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                                  isSelected
                                    ? 'bg-violet-50 text-violet-700 border-violet-300 font-medium'
                                    : 'text-gray-500 border-gray-200 hover:border-violet-200 hover:bg-violet-50/50'
                                }`}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 导出提示 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-light rounded-lg shrink-0">
              <BookOpen className="w-4 h-4 text-brand shrink-0" />
              <span className="text-xs text-gray-500">提炼到：</span>
              <span className="text-sm font-medium text-brand">小说资料</span>
            </div>

            {/* 章节选择 — 网格数字布局，flex-1占据剩余空间 */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <label className="text-xs text-gray-500">选择章节（{selectedChapterIds.size} / {allChapters.length}）</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => selectCount(5)} className="text-xs text-brand hover:underline">5章</button>
                  <button onClick={() => selectCount(10)} className="text-xs text-brand hover:underline">10章</button>
                  <button onClick={() => selectCount(20)} className="text-xs text-brand hover:underline">20章</button>
                  <button onClick={() => selectCount(50)} className="text-xs text-brand hover:underline">50章</button>
                  <button onClick={selectAll} className="text-xs text-brand hover:underline">全选</button>
                  <button onClick={clearSelection} className="text-xs text-gray-400 hover:underline">清空</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 overflow-y-auto flex-1 min-h-0">
                {allChapters.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">当前作品暂无章节</p>
                ) : (
                  <div className="grid grid-cols-8 gap-1.5">
                    {allChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => toggleChapter(ch.id)}
                        title={ch.title || `第${ch.serialNumber}章`}
                        className={`flex items-center justify-center h-8 rounded-md text-xs font-medium transition-all ${
                          selectedChapterIds.has(ch.id)
                            ? 'bg-brand text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {ch.serialNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 错误提示 */}
            {errorMsg && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-500">{errorMsg}</span>
              </div>
            )}

            {/* 开始提炼按钮 */}
            <button
              onClick={handleExtract}
              disabled={isExtracting || isAiTagging || selectedChapterIds.size === 0 || !hasApiConfig}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isAiTagging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-violet-200" />
                  <span>AI正在分类标签...</span>
                </>
              ) : isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在提炼 ({progress + 1}/{selectedChapterIds.size})</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>开始提炼</span>
                </>
              )}
            </button>
          </div>

          {/* 右侧：动态显示 */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 bg-gray-50/50">
            {rightMode === 'preview' ? (
              <>
                {getSelectedPrompt() ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                      <FileCode2 className="w-4 h-4 text-gray-400" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">提示词预览</h4>
                      <span className="text-sm font-semibold text-blue-600">{getSelectedPrompt()?.name}</span>
                    </div>
                    <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {getSelectedPromptContent()}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <FileCode2 className="w-8 h-8 text-gray-200 mb-2" />
                    <p className="text-xs text-gray-400">请先选择提示词</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">选择后这里将显示提示词内容预览</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-brand" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">提炼结果</h4>
                </div>
                <div className="space-y-3">
                  {extractedResults.map((result, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-gray-100 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3 h-3 text-brand shrink-0" />
                        <span className="text-xs font-medium text-gray-700">{result.chapterTitle}</span>
                      </div>
                      <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{result.plotText}</pre>
                    </div>
                  ))}
                  {isAiTagging && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                      <span className="text-sm text-violet-600 font-medium">AI正在分析剧情并自动分类标签...</span>
                      <span className="text-xs text-gray-400">请稍候，即将弹出标签确认窗口</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ AI标签分类确认弹窗 ═══ */}
        {showTagConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowTagConfirm(false)}>
            <div className="w-[700px] max-w-[95vw] max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-violet-500" />
                  <h3 className="text-base font-bold text-gray-900">AI标签分类结果</h3>
                  <span className="text-xs text-gray-400">({pendingSaveResults.length} 个剧情点)</span>
                </div>
                <button onClick={() => setShowTagConfirm(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-xs text-gray-500">AI已为每个剧情点推荐标签，您可以修改或确认。每个剧情点至少选1个，最多10个。</p>

                {pendingSaveResults.map((result) => {
                  const assigned = aiTagAssignments[result.chapterId] || [];
                  return (
                    <div key={result.chapterId} className="border border-gray-200 rounded-lg p-4">
                      {/* 章节标题 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">{result.chapterTitle}</span>
                        <span className={`text-[10px] ml-auto px-1.5 py-0.5 rounded ${assigned.length >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {assigned.length} 个标签
                        </span>
                      </div>

                      {/* 剧情摘要 */}
                      <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2 bg-gray-50 p-2 rounded">
                        {result.plotText}
                      </p>

                      {/* 已选标签 */}
                      <div className="mb-2">
                        <span className="text-[10px] text-gray-400 mb-1 block">已选标签（点击删除）：</span>
                        <div className="flex flex-wrap gap-1">
                          {assigned.map(tagName => (
                            <button key={tagName}
                              onClick={() => toggleResultTag(result.chapterId, tagName)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                              title="点击删除">
                              {tagName}
                              <X className="w-2.5 h-2.5" />
                            </button>
                          ))}
                          {assigned.length === 0 && (
                            <span className="text-[10px] text-red-400">请至少选择1个标签</span>
                          )}
                        </div>
                      </div>

                      {/* 可选标签 */}
                      <div>
                        <span className="text-[10px] text-gray-400 mb-1 block">可选标签（点击添加）：</span>
                        <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                          {tags.filter(t => !assigned.includes(t.name)).map(tag => (
                            <button key={tag.id}
                              onClick={() => toggleResultTag(result.chapterId, tag.name)}
                              disabled={assigned.length >= 10}
                              className="px-1.5 py-0.5 text-[10px] rounded border text-gray-500 border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors disabled:opacity-30"
                              title={tag.description}>
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部 */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
                <span className="text-xs text-gray-400">
                  {Object.values(aiTagAssignments).filter(a => a.length >= 1).length} / {pendingSaveResults.length} 个已满足最少1个标签
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowTagConfirm(false)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                    取消
                  </button>
                  <button onClick={handleConfirmSave}
                    disabled={Object.values(aiTagAssignments).some(a => a.length < 1)}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
                    <Check className="w-4 h-4" />
                    确认保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 资料库弹窗 */}
        {showMaterials && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowMaterials(false)}>
            <div className="w-[600px] max-w-[90vw] max-h-[70vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand" />
                  <h3 className="text-base font-bold text-gray-900">资料库</h3>
                  <span className="text-xs text-gray-400">({currentMaterials.length} 条)</span>
                </div>
                <button onClick={() => setShowMaterials(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {currentMaterials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500">暂无资料</p>
                    <p className="text-xs text-gray-400 mt-1">提炼剧情后，资料将自动保存到这里</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentMaterials.map((m) => {
                      const summary = extractSummary(m.content);
                      return (
                        <div key={m.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          {/* 摘要 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-gray-400 font-medium">摘要：</span>
                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 mt-0.5">{summary}</p>
                          </div>
                          {/* 出处 */}
                          <div className="mb-1">
                            <span className="text-[10px] text-gray-400 font-medium">出处：</span>
                            <span className="text-xs text-gray-700">《{m.novelTitle}》</span>
                          </div>
                          {/* 章节 */}
                          <div className="mb-1">
                            <span className="text-[10px] text-gray-400 font-medium">章节：</span>
                            <span className="text-xs text-gray-700">
                              第{m.chapterSerial}章{m.chapterName ? ` ${m.chapterName}` : ''}
                            </span>
                          </div>
                          {/* 评分 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-gray-400 font-medium">评分：</span>
                            <span className="text-xs text-gray-700">{m.rating ?? 0}分</span>
                          </div>
                          {/* 底部：左日期 + 右操作 */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-[10px] text-gray-400">{m.createdAt}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="text-[11px] text-brand hover:underline flex items-center gap-0.5"
                              >
                                <Pencil className="w-3 h-3" />
                                编辑
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }}
                                className="text-[11px] text-red-400 hover:text-red-600 hover:underline flex items-center gap-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
