import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, FileText, Settings, Play, Check, X, Loader2,
  Layers, Link, TrendingUp, LayoutGrid, Hash, Star, Zap,
  GripVertical, Plus, Trash2, ChevronLeft, Bot, Library,
} from 'lucide-react';
import { getEnabledModels, getDefaultModelId, callModelAPIStream } from '@/lib/ai';

import { useExtractModules, DEFAULT_MODULES, exportExtractConfig, importExtractConfig } from '@/hooks/useExtractModules';
import { toPinyin } from '@/lib/pinyin';
import {
  buildPrompt, cleanAiResponse, splitResults,
  type ExtractedPlotPoint,
} from '@/lib/extractEngine';
import { importToPlotLibrary } from '@/hooks/usePlotLibrary';

const FILES_CACHE_KEY = 'extract_files_cache';
const HISTORY_KEY = 'extract_history_v1';
type ExtractMode = 'chapter' | 'multi' | 'smart';

const CONFIG_KEY = 'extract_config_v1';

interface SavedConfig {
  outputMode: 'single' | 'multi' | 'book';
  extractMode: ExtractMode;
  chaptersPerBatch: number;
  pointsPerFile: number;
}

function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return { outputMode: 'single', extractMode: 'chapter', chaptersPerBatch: 2, pointsPerFile: 100 };
}
function saveConfig(cfg: SavedConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* */ }
}

interface HistoryRecord {
  id: string;
  timestamp: number;
  fileNames: string[];
  moduleLabels: string[];
  plotPointCount: number;
  /** 提炼模式名称 */
  extractModeLabel: string;
  /** 完整的剧情点数据 */
  plotPoints: ExtractedPlotPoint[];
}

interface FileItem { id: string; name: string; content: string; selected: boolean; }
interface ChapterItem { title: string; content: string; fileName: string; }

const MODULE_ICONS: Record<string, typeof Layers> = {
  juqingshenfen: Layers, qiangzhiguize: Link,
  juqing: Layers, yinguoluoji: TrendingUp, zhuangtaizengliang: LayoutGrid,
  houxugousi: Sparkles, juqingleixing: Hash,
  huangjinsanzhangpinggu: Zap, jiazhipinggu: FileText,
};

// ─── 智能弹性分组：按内容密度自动调整合并范围 ───
function buildSmartBatches(chapters: ChapterItem[]): ChapterItem[] {
  if (chapters.length <= 2) return chapters;

  const MIN_MERGE = 1;      // 高潮章节：单独提炼（最少1章）
  const MAX_MERGE = 5;      // 灌水章节：最多合并5章
  const LENGTH_THRESHOLD = 800; // 字数阈值：低于此值视为短章

  const batches: ChapterItem[] = [];
  let i = 0;

  while (i < chapters.length) {
    const ch = chapters[i];
    const len = ch.content.length;

    // 判断当前章节密度
    const density = estimateDensity(ch.content);

    // 高潮章节（高密度）：单独提炼
    if (density === 'high' || len > 3000) {
      batches.push(ch);
      i += 1;
      continue;
    }

    // 中低密度章节：尝试合并后续同类型章节
    let mergeCount = 1;
    let totalLen = len;

    while (
      i + mergeCount < chapters.length &&
      mergeCount < MAX_MERGE &&
      totalLen < 12000
    ) {
      const nextCh = chapters[i + mergeCount];
      const nextLen = nextCh.content.length;
      const nextDensity = estimateDensity(nextCh.content);

      // 遇到高潮章节停止合并
      if (nextDensity === 'high' || nextLen > 3000) break;

      // 短章（低于阈值）优先合并
      if (nextLen < LENGTH_THRESHOLD || mergeCount < MIN_MERGE) {
        mergeCount += 1;
        totalLen += nextLen;
        continue;
      }

      // 中密度章节：允许合并但不超过最大值
      mergeCount += 1;
      totalLen += nextLen;
    }

    // 构建合并批次
    if (mergeCount === 1) {
      batches.push(ch);
    } else {
      const groupChapters = chapters.slice(i, i + mergeCount);
      const startCh = i + 1;
      const endCh = i + mergeCount;
      const mergedContent = groupChapters.map(c => `【${c.title}】\n${c.content}`).join('\n\n---\n\n');
      batches.push({
        title: `第${startCh}-${endCh}章（智能合并）`,
        content: mergedContent,
        fileName: groupChapters[0].fileName,
      });
    }
    i += mergeCount;
  }

  return batches;
}

/** 估计章节内容密度 */
function estimateDensity(text: string): 'low' | 'medium' | 'high' {
  const t = text.trim();
  // 高潮指标：对话密度高、动作描写多、短句多
  const dialogueRatio = (t.match(/[""""''""""]/g) || []).length / Math.max(t.length, 1);
  const actionKeywords = ['杀', '战', '斗', '打', '逃', '追', '闪', '爆', '破', '斩', '刺', '拳', '刀', '剑', '血', '死', '怒', '吼', '咆哮', '尖叫', '颤抖', '冷汗'];
  const actionCount = actionKeywords.reduce((sum, kw) => sum + (t.split(kw).length - 1), 0);
  const density = dialogueRatio * 10 + actionCount / Math.max(t.length / 1000, 1);

  if (density > 2.5) return 'high';
  if (density > 1.2) return 'medium';
  return 'low';
}

function splitChapters(content: string, fileName: string): ChapterItem[] {
  const patterns = [
    /^(第[一二三四五六七八九十百千零\d]+章[\s:：].*?)$/gm,
    /^(Chapter\s+\d+[\s:：].*?)$/gim,
    /^(={2,}\s*第?\s*\d+\s*章?\s*={2,})$/gm,
    /^(【第\d+章】.*?)$/gm,
    /^(卷[一二三四五六七八九十\d]+[\s:：].*?)$/gm,
    /^(\d+\.\s+.*?)$/gm,
  ];
  for (const pattern of patterns) {
    const matches: { index: number; title: string }[] = [];
    let m;
    while ((m = pattern.exec(content)) !== null) matches.push({ index: m.index, title: m[1].trim() });
    if (matches.length >= 2) {
      return matches.map((match, i) => ({
        title: match.title,
        content: content.slice(match.index, i < matches.length - 1 ? matches[i + 1].index : content.length).trim(),
        fileName,
      }));
    }
  }
  return [{ title: fileName.replace('.txt', ''), content, fileName }];
}

function saveFilesCache(files: FileItem[]) { try { localStorage.setItem(FILES_CACHE_KEY, JSON.stringify(files)); } catch { /* */ } }
function loadFilesCache(): FileItem[] { try { const raw = localStorage.getItem(FILES_CACHE_KEY); if (raw) return JSON.parse(raw); } catch { /* */ } return []; }

function loadHistory(): HistoryRecord[] { try { const raw = localStorage.getItem(HISTORY_KEY); if (raw) return JSON.parse(raw); } catch { /* */ } return []; }
function saveHistory(list: HistoryRecord[]) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* */ } }
function addHistory(record: Omit<HistoryRecord, 'id' | 'timestamp'>) {
  const list = loadHistory();
  const newRecord: HistoryRecord = { ...record, id: Math.random().toString(36).slice(2), timestamp: Date.now() };
  list.unshift(newRecord);
  if (list.length > 50) list.length = 50;
  saveHistory(list);
  return newRecord;
}

// ─── 左栏模块列表项 ───
function ModuleListItem({
  id, mod, isActive, isSelected, Icon,
  onToggleActive, onSelect,
  dragId, dragOverId, onDragStart, onDragOver, onDragLeave, onDrop,
  allMods,
}: {
  id: string; mod: { label: string; requires?: string[] }; isActive: boolean; isSelected: boolean; Icon: typeof Layers;
  onToggleActive: (id: string) => void; onSelect: (id: string) => void;
  dragId: string | null; dragOverId: string | null;
  onDragStart: (id: string) => void; onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent, id: string) => void;
  allMods: Record<string, { label: string }>;
}) {
  const isBuiltIn = !!DEFAULT_MODULES[id];
  const isDragOver = dragOverId === id;
  const hasPrereqs = mod.requires && mod.requires.length > 0;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(id); }}
      onDragOver={e => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, id)}
      className={`border-b border-gray-50 transition-all duration-100 ${
        isDragOver
          ? 'bg-blue-100/60 border-t-2 border-t-blue-400'
          : dragId === id
          ? 'opacity-50'
          : ''
      }`}
    >
      <button onClick={() => onSelect(id)}
        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors ${isSelected ? 'bg-brand-light/70' : 'hover:bg-gray-50'}`}>
        {/* 拖拽手柄 - 增大热区 */}
        <div className="p-1 -ml-1 shrink-0 cursor-grab active:cursor-grabbing" draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStart(id); }}>
          <GripVertical className="w-3 h-3 text-gray-300" />
        </div>
        <div onClick={e => { e.stopPropagation(); onToggleActive(id); }}
          className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${isActive ? 'bg-brand border-brand' : 'border-gray-300 hover:border-brand'}`}>
          {isActive && <Check className="w-2 h-2 text-white" />}
        </div>
        <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span className={`text-xs truncate ${isSelected ? 'text-brand font-medium' : 'text-gray-700'}`}>{mod.label}</span>
          {/* 前置依赖标签 */}
          {hasPrereqs && (
            <span className="text-[8px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded shrink-0" title={`需要先勾选：${mod.requires!.map(r => allMods[r]?.label).filter(Boolean).join('、')}`}>
              需{mod.requires!.map(r => allMods[r]?.label).filter(Boolean).join(',')}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── 组合预览内容（复用组件） ───
function PreviewPanel({
  systemKeys, outputKeys, allModules,
}: {
  systemKeys: string[];
  outputKeys: string[];
  allModules: Record<string, { key: string; label: string; instruction: string; output?: boolean }>;
}) {
  return (
    <div className="space-y-4">
      {/* 系统指令区 */}
      {systemKeys.length > 0 && (
        <div className="space-y-3 pb-3 border-b border-dashed border-gray-200">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">系统指令</div>
          {systemKeys.map(k => {
            const mod = allModules[k]; if (!mod) return null;
            return (
              <div key={k}>
                <div className="text-[15px] font-bold text-gray-900 mb-1">{mod.label}</div>
                <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">{mod.instruction}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 输出模块区 */}
      {outputKeys.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-brand uppercase tracking-wider">输出模块</div>
          {outputKeys.map(k => {
            const mod = allModules[k]; if (!mod) return null;
            return (
              <div key={k}>
                <div className="text-[15px] font-bold text-gray-900 mb-1">{mod.label}</div>
                <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">{mod.instruction}</div>
              </div>
            );
          })}
        </div>
      )}

      {systemKeys.length === 0 && outputKeys.length === 0 && (
        <div className="h-full flex items-center justify-center text-gray-400 text-xs">
          未选择模块，无法生成预览
        </div>
      )}
    </div>
  );
}

export default function ExtractPage() {
  // ─── 文件状态 ───
  const [files, setFiles] = useState<FileItem[]>(loadFilesCache);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ─── 提炼配置 ───
  const savedCfg = loadConfig();
  const [outputMode, setOutputMode] = useState<'single' | 'multi' | 'book'>(savedCfg.outputMode);
  const [pointsPerFile, setPointsPerFile] = useState(savedCfg.pointsPerFile);
  const [extractMode, setExtractMode] = useState<ExtractMode>(savedCfg.extractMode);
  const [chaptersPerBatch, setChaptersPerBatch] = useState(savedCfg.chaptersPerBatch);
  const [selectedModel, setSelectedModel] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>(loadHistory);

  // ─── 确认提炼弹窗 ───
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── 提炼过程 ───
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [plotPoints, setPlotPoints] = useState<ExtractedPlotPoint[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // ─── 导入配置弹窗 ───
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);
  // ─── 删除确认弹窗 ───
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');
  // 当前轮播显示的模块索引
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);

  // ─── 模块管理 ───
  const {
    allModules, systemKeys, outputKeys, activeKeys,
    addModule, updateModule, deleteModule, toggleActive,
    reorderSystem, reorderOutput, moveToZone, resetToDefault, isModified,
  } = useExtractModules();
  const activeSystemKeys = systemKeys.filter(k => activeKeys.includes(k));
  const activeOutputKeys = outputKeys.filter(k => activeKeys.includes(k));
  const activeSystemLabels = activeSystemKeys.map(k => allModules[k]?.label).filter(Boolean);
  const activeOutputLabels = activeOutputKeys.map(k => allModules[k]?.label).filter(Boolean);

  // ─── 修改模块模式 ───
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ label: '', instruction: '', output: true, requires: [] as string[] });

  // ─── 拖拽状态 ───
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'system' | 'output' | null>(null);

  // ─── 跨区拖拽 ───
  const handleDropOnZone = (e: React.DragEvent, zone: 'system' | 'output') => {
    e.preventDefault();
    if (!dragId) return;
    const targetOutput = zone === 'output';
    const currentMod = allModules[dragId];
    if (!currentMod) return;
    if (currentMod.output !== targetOutput) {
      // 跨区移动：切换 output 字段
      moveToZone(dragId, targetOutput);
    } else {
      // 同区内排序
      if (dragId !== dragOverId && dragOverId) {
        if (zone === 'system') reorderSystem(dragId, dragOverId);
        else reorderOutput(dragId, dragOverId);
      }
    }
    setDragId(null); setDragOverId(null); setDragOverZone(null);
  };

  const models = getEnabledModels();

  useEffect(() => { saveFilesCache(files); }, [files]);

  // 持久化用户配置
  useEffect(() => {
    saveConfig({ outputMode, extractMode, chaptersPerBatch, pointsPerFile });
  }, [outputMode, extractMode, chaptersPerBatch, pointsPerFile]);



  

  // ─── 文件操作 ───
  const addFiles = useCallback((newFiles: File[]) => {
    const txtFiles = newFiles.filter(f => f.name.endsWith('.txt'));
    Promise.all(txtFiles.map(file =>
      file.text().then(content => ({ id: Math.random().toString(36).slice(2), name: file.name, content, selected: true }))
    )).then(items => setFiles(prev => [...prev, ...items]));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files || [])); }, [addFiles]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); addFiles(Array.from(e.dataTransfer.files)); }, [addFiles]);
  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearFiles = () => { setFiles([]); localStorage.removeItem(FILES_CACHE_KEY); };
  const toggleAll = (selected: boolean) => setFiles(prev => prev.map(f => ({ ...f, selected })));
  const toggleFile = (id: string) => setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  const selectedCount = files.filter(f => f.selected).length;

  // ─── 模块拖拽 ───
  const handleModDragStart = (id: string) => setDragId(id);
  const handleModDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); if (dragId && dragId !== id) setDragOverId(id); };
  const handleModDragLeave = () => setDragOverId(null);
  const handleModDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragId && dragId !== targetId) {
      // 判断 dragId 在哪个区域
      const inSystem = systemKeys.includes(dragId);
      const targetInSystem = systemKeys.includes(targetId);
      if (inSystem && targetInSystem) {
        reorderSystem(dragId, targetId);
      } else if (!inSystem && !targetInSystem) {
        reorderOutput(dragId, targetId);
      }
      // 跨区域在 handleDropOnZone 中处理
    }
    setDragId(null); setDragOverId(null);
  };

  // ─── 模块编辑 ───
  const selectModule = (id: string) => {
    const mod = allModules[id]; if (!mod) return;
    setEditingId(id); setIsCreating(false);
    setForm({ label: mod.label, instruction: mod.instruction, output: mod.output, key: mod.key, requires: mod.requires || [] });
  };
  const startCreate = () => {
    setEditingId(null); setIsCreating(true); setForm({ label: '', instruction: '', output: true, key: '', requires: [] });
  };
  const handleSaveModule = () => {
    if (!form.label.trim() || !form.instruction.trim()) return;
    if (isCreating) {
      const id = addModule(form);
      setIsCreating(false); setEditingId(id);
    } else if (editingId) {
      // 编辑时也要更新key（可能label变了）和output
      const key = toPinyin(form.label.trim());
      updateModule(editingId, { ...form, key });
    }
  };
  const handleDeleteModule = (id: string) => {
    if (DEFAULT_MODULES[id]) return;
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };
  const confirmDeleteModule = () => {
    deleteModule(deleteTargetId);
    if (editingId === deleteTargetId) { setEditingId(null); setForm({ key: '', label: '', instruction: '', output: true, requires: [] }); }
    setShowDeleteConfirm(false);
    setDeleteTargetId('');
  };
  const isBuiltIn = editingId ? !!DEFAULT_MODULES[editingId] : false;

  // ─── 开始提炼 ───
  const handleExtract = async () => {
    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0 || activeOutputKeys.length === 0) return;
    setIsProcessing(true); setIsAborting(false); setShowResult(true); setPlotPoints([]);

    // 模块轮播列表
    const allActiveLabels = [...activeSystemKeys, ...activeOutputKeys]
      .filter(k => allModules[k])
      .map(k => allModules[k].label);
    setActiveModuleIdx(0);

    // 创建新的 AbortController
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    let chapters: ChapterItem[];
    if (extractMode === 'chapter' || extractMode === 'multi' || extractMode === 'smart') {
      chapters = selectedFiles.flatMap(f => splitChapters(f.content, f.name));
    } else {
      chapters = selectedFiles.map(f => ({ title: f.name.replace('.txt', ''), content: f.content, fileName: f.name }));
    }
    let batches: ChapterItem[];
    if (extractMode === 'multi') {
      // 每 X 章合并：固定步长切片
      batches = [];
      const mergeCount = Math.max(2, chaptersPerBatch);
      for (let i = 0; i < chapters.length; i += mergeCount) {
        const groupChapters = chapters.slice(i, i + mergeCount);
        const startCh = i + 1;
        const endCh = i + groupChapters.length;
        const mergedContent = groupChapters.map(c => `【${c.title}】\n${c.content}`).join('\n\n---\n\n');
        batches.push({ title: `第${startCh}-${endCh}章`, content: mergedContent, fileName: groupChapters[0].fileName });
      }
    } else if (extractMode === 'smart') {
      // 智能弹性分组：按内容密度自动调整合并范围
      batches = buildSmartBatches(chapters);
    } else { batches = chapters; }

    setProgress({ current: 0, total: batches.length, currentTitle: '' });
    const allPoints: ExtractedPlotPoint[] = [];
    // 启动模块轮播定时器
    const carouselInterval = allActiveLabels.length > 0
      ? setInterval(() => {
          setActiveModuleIdx(prev => (prev + 1) % allActiveLabels.length);
        }, 800)
      : null;
    for (let i = 0; i < batches.length; i++) {
      if (signal.aborted) break;
      const batch = batches[i];
      setProgress({ current: i + 1, total: batches.length, currentTitle: batch.title });
      try {
        const chapterText = batch.content.slice(0, 12000);
        const { systemPrompt, userPrompt } = buildPrompt(activeSystemKeys, activeOutputKeys, chapterText, allModules);

        // ═══ 流式输出 + 实时拆分剧情点 ═══
        const SEP = '\n---\n';           // 剧情点分隔符
        const BUF_KEEP = 10;              // buffer末尾保留字符数（防分隔符被chunk切断）
        let buffer = '';                  // 文本缓冲仓库
        let pointIdx = allPoints.length;  // 当前正在写入的剧情点索引

        // 创建第一个空卡片（AI将直接往这里写）
        allPoints.push({ _raw: '', _chapter: batch.title } as ExtractedPlotPoint);
        setPlotPoints([...allPoints]);

        await callModelAPIStream(
          `${systemPrompt}\n\n${userPrompt}`,
          selectedModel || undefined,
          signal,
          (delta, _accumulated, isDone) => {
            if (!delta && !isDone) return;

            if (isDone) {
              // 流式结束：buffer中剩余内容写入当前卡片
              const existingRaw = ((allPoints[pointIdx] as any)?._raw) || '';
              allPoints[pointIdx] = {
                ...allPoints[pointIdx],
                _raw: existingRaw + buffer
              };
              buffer = '';
              setPlotPoints([...allPoints]);
              return;
            }

            // 追加到 buffer
            buffer += delta;

            // 实时检测分隔符 \n---\n
            let sepIdx;
            while ((sepIdx = buffer.indexOf(SEP)) !== -1) {
              // 分隔符前面的内容 → 当前卡片完成
              const before = buffer.slice(0, sepIdx);
              allPoints[pointIdx] = {
                ...allPoints[pointIdx],
                _raw: ((allPoints[pointIdx] as any)?._raw || '') + before
              };

              // 分隔符后面的内容 → 留在buffer中
              buffer = buffer.slice(sepIdx + SEP.length);

              // 创建新卡片
              pointIdx++;
              allPoints.push({ _raw: '', _chapter: batch.title } as ExtractedPlotPoint);
            }

            // buffer 太长：把安全部分写入卡片，只保留 BUF_KEEP 个字符防切断
            if (buffer.length > BUF_KEEP) {
              const safeLen = buffer.length - BUF_KEEP;
              const writeOut = buffer.slice(0, safeLen);
              allPoints[pointIdx] = {
                ...allPoints[pointIdx],
                _raw: ((allPoints[pointIdx] as any)?._raw || '') + writeOut
              };
              buffer = buffer.slice(safeLen);
            }

            // 触发重新渲染（剧情点卡片实时显示AI输出）
            setPlotPoints([...allPoints]);
          }
        );
      } catch (err) {
        if ((err as any)?.name === 'AbortError') { console.log('提炼已中止'); break; }
        console.error('提炼失败:', err);
      }
    }
    // 清理模块轮播定时器
    if (carouselInterval) clearInterval(carouselInterval);
    setActiveModuleIdx(0);
    abortRef.current = null;
    setIsProcessing(false); setIsAborting(false);

    // ─── 提炼完成，自动保存到历史 ───
    if (allPoints.length > 0) {
      const fileNames = files.filter(f => f.selected).map(f => f.name);
      const extractLabel = extractMode === 'chapter' ? '逐章' : extractMode === 'multi' ? `每${chaptersPerBatch}章合并` : '智能弹性';
      const moduleLabels = [...activeSystemLabels, ...activeOutputLabels];
      addHistory({ fileNames, moduleLabels, plotPointCount: allPoints.length, extractModeLabel: extractLabel, plotPoints: [...allPoints] });
      setHistory(loadHistory());
    }
  };

  // ─── 中止提炼 ───
  const handleAbort = () => {
    setIsAborting(true);
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  // ─── 导出 ───
  // 严格一文一档：每个剧情点 = 1个独立TXT
  // 首选 showDirectoryPicker() 选择文件夹批量写入，fallback 逐个 download
  const handleExport = async () => {
    // 过滤无效剧情点（无实质内容、跳过、未达到标准等）
    const SKIP_KEYWORDS = ['无实质剧情点', '未达到提炼标准', '无可提炼剧情点', '跳过'];
    const isValidPoint = (point: ExtractedPlotPoint): boolean => {
      const raw = ((point as any)._raw || '').trim();
      if (!raw) return false;
      const lower = raw.toLowerCase();
      return !SKIP_KEYWORDS.some(kw => lower.includes(kw));
    };
    const validPoints = plotPoints.filter(isValidPoint);
    if (validPoints.length === 0) {
      alert('没有有效的剧情点可导出');
      return;
    }

    /**
     * 生成文件内容：直接使用AI返回的Markdown文本
     */
    const renderContent = (point: ExtractedPlotPoint): string => {
      return (point as any)._raw || '';
    };

    /**
     * 生成唯一文件名
     * 命名规范：【剧情卡】第X章.txt 或 【剧情卡】第X章_至_第Y章.txt
     */
    const buildFileName = (point: ExtractedPlotPoint, idx: number): string => {
      const chapterInfo = (point as any)._chapter || '';
      const rangeMatch = chapterInfo.match(/第(\d+)(?:[-–](\d+))?章/);
      if (rangeMatch) {
        const start = rangeMatch[1];
        const end = rangeMatch[2];
        return end
          ? `【剧情卡】第${start}章_至_第${end}章_${idx + 1}.txt`
          : `【剧情卡】第${start}章_${idx + 1}.txt`;
      }
      return `【剧情卡】剧情点_${idx + 1}.txt`;
    };

    // ═══ 方案A：File System Access API（选择文件夹 + 批量独立写入）═══
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        let successCount = 0;
        for (let i = 0; i < validPoints.length; i++) {
          const point = validPoints[i];
          const fileName = buildFileName(point, i);
          const content = renderContent(point);
          try {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            successCount++;
          } catch (err) {
            console.error(`写入文件失败 ${fileName}:`, err);
          }
        }
        alert(`导出完成：成功 ${successCount} / ${validPoints.length} 个文件`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('选择文件夹失败:', err);
          alert('选择文件夹失败，将使用备用导出方式');
          fallbackExport(validPoints, buildFileName, renderContent);
        }
      }
    } else {
      // ═══ 方案B：浏览器不支持 File System Access API，fallback 逐个 download ═══
      fallbackExport(validPoints, buildFileName, renderContent);
    }

    // 导出时保存历史记录
    const fileNames = files.filter(f => f.selected).map(f => f.name);
    const labels = [...activeSystemLabels, ...activeOutputLabels];
    const extractLabel = extractMode === 'chapter' ? '逐章' : extractMode === 'multi' ? `每${chaptersPerBatch}章合并` : '智能弹性';
    addHistory({ fileNames, moduleLabels: labels, plotPointCount: validPoints.length, extractModeLabel: extractLabel, plotPoints: validPoints });
    setHistory(loadHistory());
  };

  /**
   * Fallback 导出：浏览器不支持 showDirectoryPicker 时使用逐个 download
   */
  const fallbackExport = (
    validPoints: ExtractedPlotPoint[],
    buildFileName: (p: ExtractedPlotPoint, i: number) => string,
    renderContent: (p: ExtractedPlotPoint) => string
  ) => {
    validPoints.forEach((point, i) => {
      const content = renderContent(point);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildFileName(point, i);
      setTimeout(() => { a.click(); URL.revokeObjectURL(url); }, i * 200);
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题栏 */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">提炼剧情</h1>
              <p className="text-[10px] text-gray-400">勾选模块 → 上传文件 → 配置 → AI提炼 → 导出</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 导出配置 */}
            <button
              onClick={() => {
                const json = exportExtractConfig();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `月下写作-提炼配置-${new Date().toLocaleDateString('zh-CN')}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="将当前所有模块配置导出为文件，可在重新部署后导入恢复"
            >
              <FileText className="w-3 h-3" /> 导出配置
            </button>
            {/* 导入配置 */}
            <button
              onClick={() => { setShowImport(true); setImportText(''); setImportResult(null); }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="从之前导出的配置文件恢复所有模块设置"
            >
              <FileText className="w-3 h-3" /> 导入配置
            </button>
            <input ref={fileImportRef} type="file" accept=".json"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const text = String(ev.target?.result || '');
                  setImportText(text);
                  setImportResult(null);
                  setShowImport(true);
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FileText className="w-3 h-3" /> 提炼历史
              {history.length > 0 && (
                <span className="text-[9px] text-gray-400 ml-0.5">({history.length})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ═══ 修改模块视图：左(模块列表) 中(编辑) 右(预览) ═══ */}
      {/* ════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════ */}
      {/* ═══ 统一布局：左(模块列表) + 中(动态) + 右(预览) ═══ */}
      {/* ════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">
        {/* 左：模块列表（始终固定） */}
        <div className="w-[200px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          {/* ─── 系统指令区 ─── */}
          <div className="shrink-0 mt-2 mb-1 px-3 py-1.5 rounded-md" style={{ backgroundColor: '#FFF7ED', marginLeft: '8px', marginRight: '8px' }}>
            <span className="text-sm font-bold" style={{ color: '#92400E' }}>系统指令</span>
          </div>
          <div className="shrink-0 max-h-[35%] overflow-y-auto"
            onDragOver={e => { e.preventDefault(); setDragOverZone('system'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={e => handleDropOnZone(e, 'system')}
          >
            {systemKeys.map(id => {
              const mod = allModules[id]; if (!mod) return null;
              const Icon = MODULE_ICONS[id] || Layers;
              return (
                <ModuleListItem
                  key={id} id={id} mod={mod}
                  isActive={activeKeys.includes(id)} isSelected={isEditMode && editingId === id} Icon={Icon}
                  onToggleActive={toggleActive} onSelect={isEditMode ? selectModule : (mid: string) => { setIsEditMode(true); selectModule(mid); }}
                  dragId={dragId} dragOverId={dragOverId}
                  onDragStart={handleModDragStart} onDragOver={handleModDragOver}
                  onDragLeave={handleModDragLeave} onDrop={handleModDrop} allMods={allModules}
                />
              );
            })}
          </div>

          {/* ─── 输出模块区 ─── */}
          <div className="shrink-0 mt-1 mb-1 px-3 py-1.5 rounded-md" style={{ backgroundColor: '#E6F7FB', marginLeft: '8px', marginRight: '8px' }}>
            <span className="text-sm font-bold" style={{ color: '#0E7490' }}>输出模块</span>
          </div>
          <div className="flex-1 overflow-y-auto"
            onDragOver={e => { e.preventDefault(); setDragOverZone('output'); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={e => handleDropOnZone(e, 'output')}
          >
            {outputKeys.map(id => {
              const mod = allModules[id]; if (!mod) return null;
              const Icon = MODULE_ICONS[id] || Layers;
              return (
                <ModuleListItem
                  key={id} id={id} mod={mod}
                  isActive={activeKeys.includes(id)} isSelected={isEditMode && editingId === id} Icon={Icon}
                  onToggleActive={toggleActive} onSelect={isEditMode ? selectModule : (mid: string) => { setIsEditMode(true); selectModule(mid); }}
                  dragId={dragId} dragOverId={dragOverId}
                  onDragStart={handleModDragStart} onDragOver={handleModDragOver}
                  onDragLeave={handleModDragLeave} onDrop={handleModDrop} allMods={allModules}
                />
              );
            })}
          </div>
          <div className="shrink-0 px-2.5 py-2 border-t border-gray-100">
            <button onClick={() => { setIsEditMode(true); startCreate(); }}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-brand bg-brand-light rounded hover:bg-brand-light/80 transition-colors">
              <Plus className="w-3 h-3" /> 新建模块
            </button>
          </div>
          <div className="shrink-0 px-2.5 py-1.5 border-t border-gray-100 text-[10px] text-gray-400">
            {systemKeys.length + outputKeys.length} 模块 · {activeKeys.length} 已激活
          </div>
        </div>

        {/* 中：动态区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditMode ? (
            <>
              {/* 返回按钮 */}
              <div className="shrink-0 flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setIsEditMode(false); setEditingId(null); setIsCreating(false); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" /> 返回
                </button>
                {editingId && (
                  <span className="text-xs text-gray-400">正在编辑：{allModules[editingId]?.label}</span>
                )}
              </div>
              {!editingId && !isCreating ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                  <Settings className="w-10 h-10 mb-3 text-gray-200" />
                  <p className="text-sm">从左侧选择一个模块查看或编辑</p>
                  <button onClick={startCreate}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm text-brand border border-brand rounded-lg hover:bg-brand-light transition-colors">
                    <Plus className="w-4 h-4" /> 新建模块
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="mb-4" />
                    <div className="space-y-4">
                      {/* 显示名称 + JSON字段名 + 所属区域 */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">显示名称 <span className="text-red-400">*</span></label>
                          <input value={form.label}
                            onChange={e => {
                              const label = e.target.value;
                              setForm(f => ({ ...f, label, key: isCreating ? toPinyin(label.trim()) : f.key }));
                            }}
                            placeholder="如：剧情"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand" />
                        </div>
                        <div className="w-[100px]">
                          <label className="text-xs text-gray-500 mb-1 block">字段标识</label>
                          <input value={form.key || ''} disabled
                            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                        </div>
                        <div className="w-[120px]">
                          <label className="text-xs text-gray-500 mb-1 block">所属区域</label>
                          <select
                            value={form.output ? 'output' : 'system'}
                            onChange={e => setForm(f => ({ ...f, output: e.target.value === 'output' }))}
                            disabled={!isCreating}
                            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white disabled:bg-gray-50 disabled:text-gray-400"
                          >
                            <option value="output">输出模块</option>
                            <option value="system">系统指令</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">提示词 <span className="text-red-400">*</span></label>
                        <textarea value={form.instruction}
                          onChange={e => setForm(f => ({ ...f, instruction: e.target.value }))}
                          placeholder="输入提示词，告诉AI如何处理这个维度..." rows={8}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none" />
                      </div>

                      {/* 前置依赖配置 */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">前置依赖</label>
                        <div className="text-[10px] text-gray-400 mb-1.5">勾选此模块需要先勾选哪些模块（自动级联勾选）</div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const candidates = (form.output ? outputKeys : systemKeys)
                              .filter(k => k !== editingId && allModules[k]);
                            if (candidates.length === 0) {
                              return <span className="text-[10px] text-gray-400">暂无可选模块</span>;
                            }
                            return candidates.map(k => {
                              const mod = allModules[k];
                              const isChecked = form.requires.includes(k);
                              return (
                                <label key={k} className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded border cursor-pointer transition-colors ${isChecked ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      const next = e.target.checked
                                        ? [...form.requires, k]
                                        : form.requires.filter(r => r !== k);
                                      setForm(f => ({ ...f, requires: next }));
                                    }}
                                    className="w-3 h-3 rounded border-gray-300 text-brand focus:ring-brand"
                                  />
                                  <span>{mod.label}</span>
                                </label>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* 左下角：删除按钮（所有模块都可删除） */}
                        <div>
                          {!isCreating && editingId && (
                            <button onClick={() => {
                              const label = allModules[editingId]?.label || '此模块';
                              if (confirm(`确定删除「${label}」吗？${DEFAULT_MODULES[editingId] ? '（内置模块删除后将恢复默认）' : ''}`)) {
                                deleteModule(editingId);
                                setEditingId(null);
                                setIsCreating(false);
                              }
                            }} className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                              <Trash2 className="w-4 h-4" /> 删除
                            </button>
                          )}
                        </div>
                        {/* 右侧：取消 + 保存 */}
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setEditingId(null); setIsCreating(false); }}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
                          <button onClick={handleSaveModule} disabled={!form.label.trim() || !form.instruction.trim()}
                            className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">
                            <Check className="w-4 h-4" /> {isCreating ? '创建' : '保存'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 四列配置：AI模型 | 提炼模式 | 导出设置 | 历史记录 */}
              <div className="flex gap-3">
                {/* AI 模型 */}
                <div className="w-[18%] bg-white rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-brand" /> AI 模型
                  </h3>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white">
                    {models.length === 0 && <option value="">未配置</option>}
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {models.length === 0 && <p className="mt-1 text-[9px] text-amber-500">去「云端设置」配置</p>}
                </div>

                {/* 提炼模式 */}
                <div className="w-[25%] bg-white rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-bold text-gray-900 mb-2">提炼模式</h3>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${extractMode === 'chapter' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="extractMode" value="chapter" checked={extractMode === 'chapter'} onChange={() => setExtractMode('chapter')} className="w-3 h-3 text-brand" />
                      <div>
                        <div className={`text-xs font-medium ${extractMode === 'chapter' ? 'text-brand' : 'text-gray-700'}`}>逐章提炼</div>
                        <div className="text-[10px] text-gray-400">每章单独提炼</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${extractMode === 'multi' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="extractMode" value="multi" checked={extractMode === 'multi'} onChange={() => setExtractMode('multi')} className="w-3 h-3 text-brand shrink-0" />
                      <div className="flex-1">
                        <div className={`text-xs font-medium ${extractMode === 'multi' ? 'text-brand' : 'text-gray-700'}`}>
                          <span>每</span>
                          <input type="number" min={2} max={50} value={chaptersPerBatch}
                            onChange={e => setChaptersPerBatch(Math.max(2, Math.min(50, Number(e.target.value))))}
                            onClick={e => e.stopPropagation()}
                            className={`w-10 mx-1 px-1 py-0.5 text-xs border rounded text-center focus:outline-none focus:border-brand ${extractMode === 'multi' ? 'border-brand bg-white' : 'border-gray-200 bg-gray-50'}`} />
                          <span>章合并</span>
                        </div>
                        <div className="text-[10px] text-gray-400">N章合并为一组</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${extractMode === 'smart' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="extractMode" value="smart" checked={extractMode === 'smart'} onChange={() => setExtractMode('smart')} className="w-3 h-3 text-brand" />
                      <div>
                        <div className={`text-xs font-medium ${extractMode === 'smart' ? 'text-brand' : 'text-gray-700'}`}>智能提炼</div>
                        <div className="text-[10px] text-gray-400">AI智能弹性分组提炼</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 导出设置 */}
                <div className="w-[25%] bg-white rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-bold text-gray-900 mb-2">导出设置</h3>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${outputMode === 'single' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="outputMode" value="single" checked={outputMode === 'single'} onChange={() => setOutputMode('single')} className="w-3 h-3 text-brand" />
                      <span className={`text-xs font-medium ${outputMode === 'single' ? 'text-brand' : 'text-gray-700'}`}>1个剧情点 = 1个txt</span>
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${outputMode === 'book' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="outputMode" value="book" checked={outputMode === 'book'} onChange={() => setOutputMode('book')} className="w-3 h-3 text-brand" />
                      <span className={`text-xs font-medium ${outputMode === 'book' ? 'text-brand' : 'text-gray-700'}`}>1本小说 = 1个txt</span>
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${outputMode === 'multi' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="outputMode" value="multi" checked={outputMode === 'multi'} onChange={() => setOutputMode('multi')} className="w-3 h-3 text-brand shrink-0" />
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} max={1000} value={pointsPerFile}
                          onChange={e => setPointsPerFile(Math.max(1, Math.min(1000, Number(e.target.value))))}
                          onClick={e => e.stopPropagation()}
                          className={`w-12 px-1 py-0.5 text-xs border rounded text-center focus:outline-none focus:border-brand ${outputMode === 'multi' ? 'border-brand bg-white' : 'border-gray-200 bg-gray-50'}`} />
                        <span className={`text-xs font-medium ${outputMode === 'multi' ? 'text-brand' : 'text-gray-700'}`}>个剧情点 = 1个txt</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 历史提炼记录 */}
                <div className="w-[32%] bg-white rounded-xl border border-gray-200 p-3 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand" /> 历史提炼记录
                  </h3>
                  <div className="flex-1 overflow-y-auto max-h-[200px] space-y-1.5">
                    {history.length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-4">暂无历史记录</p>
                    ) : (
                      history.map(h => (
                        <div key={h.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-medium text-gray-700 truncate flex-1">
                              {h.fileNames.slice(0, 2).join(', ')}{h.fileNames.length > 2 ? ` 等${h.fileNames.length}个文件` : ''}
                            </span>
                            <span className="text-[9px] text-gray-400 shrink-0 ml-1">
                              {new Date(h.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                            <span>{h.plotPointCount}条剧情点</span>
                            <span>·</span>
                            <span className="text-brand">{h.extractModeLabel}</span>
                            <span>·</span>
                            <span className="truncate">{h.moduleLabels.slice(0, 3).join('、')}{h.moduleLabels.length > 3 ? '...' : ''}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 上传文件（移到四列下方） */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" /> 上传 TXT 文件
                </h3>
                <input ref={fileInputRef} type="file" accept=".txt" multiple onChange={handleFileSelect} className="hidden" />
                <div ref={dropRef} onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`w-full flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingFile ? 'border-brand bg-brand-light/40' : 'border-gray-200 hover:border-brand hover:bg-brand-light/30'}`}>
                  <FileText className={`w-6 h-6 ${isDraggingFile ? 'text-brand' : 'text-gray-300'}`} />
                  <span className={`text-sm ${isDraggingFile ? 'text-brand font-medium' : 'text-gray-500'}`}>{isDraggingFile ? '松开上传' : '点击或拖拽 .txt 文件'}</span>
                  <span className="text-[10px] text-gray-400">内容自动保存，关闭后可继续</span>
                </div>
                {files.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-600">{files.length} 个文件，{selectedCount} 个待处理</span>
                      <div className="flex gap-2">
                        <button onClick={() => toggleAll(true)} className="text-[10px] text-brand hover:underline">全选</button>
                        <button onClick={() => toggleAll(false)} className="text-[10px] text-gray-400 hover:underline">取消</button>
                        <button onClick={clearFiles} className="text-[10px] text-red-400 hover:underline">清空</button>
                      </div>
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                      {files.map(file => (
                        <div key={file.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50">
                          <input type="checkbox" checked={file.selected} onChange={() => toggleFile(file.id)} className="w-3.5 h-3.5 rounded border-gray-300 text-brand focus:ring-brand" />
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="flex-1 text-xs text-gray-700 truncate">{file.name}</span>
                          <span className="text-[10px] text-gray-400">{file.content.length.toLocaleString()}字</span>
                          <button onClick={() => removeFile(file.id)} className="p-0.5 text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 开始提炼按钮 */}
              <div className="flex justify-end">
                <button onClick={() => setShowConfirm(true)} disabled={models.length === 0 || activeOutputKeys.length === 0 || selectedCount === 0}
                  className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">
                  <Play className="w-4 h-4" /> 开始提炼
                </button>
              </div>
            </>
          )}
        </div>

        {/* 右：组合预览（始终固定） */}
        <div className="w-[344px] bg-white border-l border-gray-200 overflow-y-auto shrink-0">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-gray-900 leading-[15px]">组合预览</h3>
            <span className="text-[11px] text-gray-400">所有激活模块的提示词组合效果</span>
          </div>
          <div className="p-3">
            <PreviewPanel systemKeys={activeSystemKeys} outputKeys={activeOutputKeys} allModules={allModules} />
          </div>
        </div>
      </div>

            {/* ═══════ 提炼历史弹窗 ═══════ */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[640px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                <h3 className="text-base font-bold text-gray-900">提炼历史</h3>
                <span className="text-xs text-gray-400">({history.length} 条 · 最多保存 20 条)</span>
              </div>
              <button onClick={() => setShowHistory(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mb-3 text-gray-200" />
                  <p className="text-sm">暂无提炼记录</p>
                </div>
              ) : (
                history.map((h, idx) => (
                  <div key={h.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    {/* 头部 */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand"># {idx + 1}</span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(h.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-gray-400">{h.fileNames.slice(0, 2).join(', ')}{h.fileNames.length > 2 ? ` 等${h.fileNames.length}个` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-brand font-medium">{h.extractModeLabel}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-500">{h.plotPointCount} 条剧情点</span>
                        <button
                          onClick={() => {
                            const content = h.plotPoints.map((p: ExtractedPlotPoint, i: number) => {
                              return `=== 剧情点 ${i + 1} ===\n${(p as any)._raw || ''}`;
                            }).join('\n\n---\n\n');
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `剧情点_历史_${idx + 1}_${h.plotPointCount}条.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="text-[10px] text-brand hover:underline"
                        >
                          导出
                        </button>
                      </div>
                    </div>
                    {/* 剧情点内容 */}
                    <div className="max-h-[200px] overflow-y-auto p-3 space-y-2">
                      {h.plotPoints.slice(0, 5).map((p: ExtractedPlotPoint, i: number) => {
                        return (
                          <div key={i} className="border border-gray-50 rounded overflow-hidden">
                            <div className="px-2 py-0.5 bg-brand-light/30 border-b border-gray-50">
                              <span className="text-[9px] font-bold text-brand">剧情点 {i + 1}</span>
                            </div>
                            <div className="p-2 text-[11px] text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                              {(p as any)._raw || ''}
                            </div>
                          </div>
                        );
                      })}
                      {h.plotPoints.length > 5 && (
                        <div className="text-center text-[10px] text-gray-400 py-1">
                          ... 还有 {h.plotPoints.length - 5} 条 ...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

            {/* ═══════ 确认提炼弹窗 ═══════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[420px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">确认提炼</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* 提炼配置摘要 */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand shrink-0" />
                  <span>待处理文件：<strong className="text-gray-900">{selectedCount} 个</strong>（{files.filter(f => f.selected).reduce((s, f) => s + f.content.length, 0).toLocaleString()} 字）</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-brand shrink-0" />
                  <span>AI 模型：<strong className="text-gray-900">{(() => {
                    const effId = selectedModel || getDefaultModelId();
                    const cfg = models.find(m => m.id === effId);
                    if (!cfg) return effId || '未配置';
                    return cfg.provider ? `${cfg.name}（${cfg.provider}）` : cfg.name;
                  })()}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand shrink-0" />
                  <span>提炼模式：<strong className="text-gray-900">{extractMode === 'chapter' ? '逐章提炼' : extractMode === 'multi' ? `每${chaptersPerBatch}章合并提炼` : '智能弹性提炼'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand shrink-0" />
                  <span>导出方式：<strong className="text-gray-900">{outputMode === 'single' ? '1点=1txt' : outputMode === 'multi' ? `${pointsPerFile}点=1txt` : '1本=1txt'}</strong></span>
                </div>
              </div>

              {/* 激活模块 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1.5">激活模块（{activeKeys.length}个）</div>
                <div className="flex flex-wrap gap-1.5">
                  {systemKeys.filter(k => activeKeys.includes(k)).map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{allModules[k]?.label}</span>
                  ))}
                  {outputKeys.filter(k => activeKeys.includes(k)).map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 bg-brand-light text-brand rounded">{allModules[k]?.label}</span>
                  ))}
                </div>
              </div>

              {/* 系统指令预览 */}
              {activeSystemKeys.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="text-[10px] font-bold text-red-600 mb-1">系统指令</div>
                  <div className="text-[11px] text-gray-600">
                    {activeSystemKeys.map(k => allModules[k]?.label).join('、')}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={() => { setShowConfirm(false); handleExtract(); }}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
                <Play className="w-4 h-4" /> 确认开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 删除确认弹窗 ═══════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[400px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">确认删除</h3>
                  <p className="text-[11px] text-gray-400">此操作不可撤销</p>
                </div>
              </div>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                确定要删除模块「<span className="font-medium text-gray-900">{allModules[deleteTargetId]?.label || '未知模块'}</span>」吗？删除后将无法恢复。
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={confirmDeleteModule}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                <Trash2 className="w-4 h-4" /> 确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 提炼结果弹层 ═══════ */}
      {showResult && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/30 backdrop-blur-sm">
          <div className="w-[720px] max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {isProcessing && <Loader2 className="w-4 h-4 text-brand animate-spin" />}
                <h3 className="text-sm font-bold text-gray-900">{isProcessing ? '提炼中...' : `完成（${plotPoints.length} 条）`}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{progress.current} / {progress.total}</span>
                {isProcessing ? (
                  <button onClick={handleAbort} disabled={isAborting}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
                    <Loader2 className={`w-3 h-3 ${isAborting ? 'animate-spin' : ''}`} /> {isAborting ? '中止中...' : '中止提炼'}
                  </button>
                ) : (
                  <button onClick={() => setShowResult(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="shrink-0 px-4 py-2 border-b border-gray-100">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
              {/* ═══ 模型预览（最上面一行，始终显示）═══ */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-100 rounded-md">
                <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] text-blue-600 font-medium">正在使用模型：</span>
                <span className="text-[11px] text-gray-800 font-semibold">{(() => {
                  const effectiveModelId = selectedModel || getDefaultModelId();
                  const cfg = getEnabledModels().find(m => m.id === effectiveModelId);
                  if (!cfg) return effectiveModelId;
                  return cfg.provider ? `${cfg.name}（${cfg.provider}）` : cfg.name;
                })()}</span>
                {isProcessing && <span className="text-[10px] text-blue-400 ml-1">· 提炼中</span>}
              </div>

              {/* 提炼状态指示器已删除：章节标题 + AI实时输出提示 */}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {plotPoints.length === 0 && !isProcessing && (
                <div className="text-center text-gray-400 py-8">暂无提炼结果</div>
              )}
              {plotPoints.map((point, idx) => {
                const content = (point as any)._raw || '';
                const chapter = (point as any)._chapter || '';
                // 最后一张卡片且正在提炼中 → 显示闪烁光标
                const isLast = idx === plotPoints.length - 1;
                const isStreaming = isProcessing && isLast;
                return (
                  <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="px-3 py-1.5 bg-brand-light border-b border-gray-100 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-brand">剧情点 {idx + 1}</span>
                      {chapter && <span className="text-[10px] text-gray-500 truncate">{chapter}</span>}
                      {isStreaming && (
                        <span className="ml-auto flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[9px] text-green-600">输出中</span>
                        </span>
                      )}
                    </div>
                    <div className="p-3 text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words min-h-[2em]">
                      {content}
                      {isStreaming && <span className="inline-block w-2 h-4 bg-brand ml-0.5 animate-pulse align-middle" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 px-4 py-3 border-t border-gray-200 flex justify-between">
              <button onClick={() => { setShowResult(false); setPlotPoints([]); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">关闭</button>
              {!isProcessing && plotPoints.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const fileNames = files.filter(f => f.selected).map(f => f.name).join(', ');
                      const count = importToPlotLibrary(plotPoints, fileNames);
                      alert(`成功导入 ${count} 条剧情点到剧情库`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand-light transition-colors"
                  >
                    <Library className="w-4 h-4" /> 导入剧情库
                  </button>
                  <button onClick={handleExport}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
                    <FileText className="w-4 h-4" /> 导出 TXT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

            {/* ═══════ 导入配置弹窗 ═══════ */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[520px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">导入配置</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">从之前导出的 JSON 文件恢复所有模块设置</p>
              </div>
              <button onClick={() => setShowImport(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {/* 方式一：粘贴 JSON */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">粘贴配置 JSON</label>
                <textarea
                  value={importText}
                  onChange={e => { setImportText(e.target.value); setImportResult(null); }}
                  placeholder='{"_exportVersion":1,...}'
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none font-mono"
                />
              </div>
              {/* 方式二：选择文件 */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">或</span>
                <button
                  onClick={() => fileImportRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand border border-brand rounded-lg hover:bg-brand-light transition-colors"
                >
                  <FileText className="w-3 h-3" /> 选择 .json 文件
                </button>
              </div>
              {/* 导入结果提示 */}
              {importResult && (
                <div className={`p-3 rounded-lg text-xs ${importResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {importResult.message}
                </div>
              )}
              {/* 说明 */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-[11px] text-amber-700">
                  <strong>提示：</strong>导入配置后会覆盖当前所有模块设置。建议先导出当前配置作为备份。
                  导入成功后需要<strong>刷新页面</strong>才能生效。
                </p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button
                onClick={() => {
                  if (!importText.trim()) return;
                  const result = importExtractConfig(importText.trim());
                  setImportResult(result);
                  if (result.success) {
                    setTimeout(() => {
                      if (confirm('配置导入成功！是否立即刷新页面以应用新配置？')) {
                        window.location.reload();
                      }
                    }, 300);
                  }
                }}
                disabled={!importText.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" /> 确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}