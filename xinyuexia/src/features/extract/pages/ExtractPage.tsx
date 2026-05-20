import { BookMarked, ChevronDown, ChevronRight, Download, FileText, Play, RotateCcw, Settings, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SortableExtractModule } from '@/features/extract/components/SortableExtractModule';
import { useExtractModules } from '@/features/extract/hooks/useExtractModules';
import { useExtractNovels } from '@/features/extract/hooks/useExtractNovels';
import type { ExtractModule, ExtractResult } from '@/features/extract/model/extractTypes';
import { readModelSnapshot } from '@/features/models/hooks/useModels';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { callModel } from '@/features/models/services/callModel';

type ExtractMode = 'chapter' | 'multi' | 'smart';
type OutputMode = 'single' | 'book' | 'multi';

interface UploadFileItem {
  id: string;
  name: string;
  content: string;
  selected: boolean;
}

interface ExtractHistoryItem {
  id: string;
  timestamp: number;
  fileNames: string[];
  extractModeLabel: string;
  resultCount: number;
}

const HISTORY_KEY = 'xinyuexia_extract_history_v1';
const EXTRACT_MODEL_KEY = 'xinyuexia_extract_selected_model';
const EXTRACT_PREVIEW_COLLAPSE_KEY = 'xinyuexia_extract_preview_collapsed';

function readEnabledModels() {
  return readModelSnapshot().filter((model) => model.enabled);
}

function readHistory(): ExtractHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ExtractHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(history: ExtractHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function buildSystemPrompt(modules: ExtractModule[]) {
  return modules
    .filter((module) => module.active && module.zone === 'system')
    .map((module) => `【${module.label}】\n${module.instruction.trim()}`)
    .join('\n\n');
}

function buildExtractRequest(file: UploadFileItem, modules: ExtractModule[]) {
  const outputModules = modules.filter((module) => module.active && module.zone === 'output');
  return [
    '请阅读以下章节正文，并按要求输出提炼结果。',
    `文件名：${file.name}`,
    '',
    '【输出模块】',
    ...outputModules.map((module) => `【${module.label}】\n${module.instruction.trim()}`),
    '',
    '【正文】',
    file.content.trim() || '暂无正文',
  ].join('\n');
}

function LinkNovelModal({
  isOpen,
  novels,
  selectedNovelId,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  novels: ReturnType<typeof useExtractNovels>;
  selectedNovelId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="flex max-h-[70vh] w-[520px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">关联小说</h3>
          <p className="mt-1 text-xs text-gray-400">选择当前提炼任务要关联的小说。</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {novels.filter((novel) => novel.type === 'novel').map((novel) => (
              <button
                key={novel.id}
                onClick={() => {
                  onSelect(novel.id);
                  onClose();
                }}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedNovelId === novel.id ? 'border-brand bg-brand-light/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-800">{novel.title}</div>
                <div className="mt-1 text-[11px] text-gray-400">{novel.chapters.length} 章</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExtractPage() {
  const navigate = useNavigate();
  const novels = useExtractNovels();
  const {
    modules,
    activeModules,
    updateModule,
    toggleActive,
    moveModule,
    exportExtractConfig,
    importExtractConfig,
    resetExtractModules,
  } = useExtractModules();

  const [models, setModels] = useState<ModelItem[]>(readEnabledModels);
  const [selectedModelId, setSelectedModelId] = useState(() => localStorage.getItem(EXTRACT_MODEL_KEY) ?? '');
  const [selectedNovelId, setSelectedNovelId] = useState<number | null>(novels.find((novel) => novel.type === 'novel')?.id ?? null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(modules[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [extractMode, setExtractMode] = useState<ExtractMode>('chapter');
  const [outputMode, setOutputMode] = useState<OutputMode>('single');
  const [chaptersPerBatch, setChaptersPerBatch] = useState(3);
  const [pointsPerFile, setPointsPerFile] = useState(2);
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [results, setResults] = useState<ExtractResult[]>([]);
  const [history, setHistory] = useState<ExtractHistoryItem[]>(readHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showImportConfig, setShowImportConfig] = useState(false);
  const [showLinkNovel, setShowLinkNovel] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [extractProgress, setExtractProgress] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [collapsedPreviewIds, setCollapsedPreviewIds] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(EXTRACT_PREVIEW_COLLAPSE_KEY) ?? '{}') as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncModels = () => setModels(readEnabledModels());
    window.addEventListener('xinyuexia_models_updated', syncModels);
    return () => window.removeEventListener('xinyuexia_models_updated', syncModels);
  }, []);

  useEffect(() => {
    if (!selectedModelId && models[0]) setSelectedModelId(models[0].id);
  }, [models, selectedModelId]);

  useEffect(() => {
    if (selectedModelId) localStorage.setItem(EXTRACT_MODEL_KEY, selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    localStorage.setItem(EXTRACT_PREVIEW_COLLAPSE_KEY, JSON.stringify(collapsedPreviewIds));
  }, [collapsedPreviewIds]);

  useEffect(() => {
    if (!selectedModuleId && modules[0]) setSelectedModuleId(modules[0].id);
  }, [modules, selectedModuleId]);

  const selectedModel = models.find((model) => model.id === selectedModelId) ?? null;
  const selectedNovel = novels.find((novel) => novel.id === selectedNovelId) ?? null;
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? null;
  const selectedFiles = files.filter((file) => file.selected);
  const canExtract = Boolean(selectedModel && selectedFiles.length > 0 && activeModules.some((module) => module.zone === 'output') && !isExtracting);

  const handleToggleZone = (id: string) => {
    const target = modules.find((module) => module.id === id);
    if (!target) return;
    updateModule(id, { zone: target.zone === 'system' ? 'output' : 'system' });
  };

  const handleDropModule = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    moveModule(draggingId, targetId);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const nextFiles: UploadFileItem[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.txt')) continue;
      const content = await file.text();
      nextFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        content,
        selected: true,
      });
    }
    if (nextFiles.length > 0) setFiles((prev) => [...prev, ...nextFiles]);
  };

  const handleExtract = async () => {
    if (!selectedModel) {
      setSaveMessage('请先在“模型管理”中配置并启用 AI 模型');
      return;
    }
    if (!canExtract) return;

    setIsExtracting(true);
    setResults([]);
    setSaveMessage('');
    const systemPrompt = buildSystemPrompt(modules);
    const nextResults: ExtractResult[] = [];

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      setExtractProgress(`正在处理 ${index + 1}/${selectedFiles.length}：${file.name}`);
      try {
        const content = await callModel({
          model: selectedModel,
          prompt: systemPrompt,
          userContent: buildExtractRequest(file, modules),
        });
        nextResults.push({ id: `${file.id}-${index}`, chapterTitle: file.name, content });
      } catch (error) {
        nextResults.push({
          id: `${file.id}-${index}`,
          chapterTitle: file.name,
          content: error instanceof Error ? `【错误】${error.message}` : '【错误】模型请求失败。',
        });
      }
      setResults([...nextResults]);
    }

    const extractModeLabel = extractMode === 'chapter' ? '逐章提炼' : extractMode === 'multi' ? `每 ${chaptersPerBatch} 章合并` : '智能提炼';
    const nextHistory: ExtractHistoryItem[] = [{
      id: `${Date.now()}`,
      timestamp: Date.now(),
      fileNames: selectedFiles.map((file) => file.name),
      extractModeLabel,
      resultCount: nextResults.length,
    }, ...history].slice(0, 20);
    setHistory(nextHistory);
    writeHistory(nextHistory);
    setExtractProgress(`提炼完成，共 ${nextResults.length} 条结果`);
    setIsExtracting(false);
  };

  const linkedNovelName = selectedNovel?.title ?? '';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-bold text-gray-900">提炼剧情</h1>
            </div>
            <p className="mt-1 text-xs text-gray-400">勾选模块 → 上传文件 → 配置 → AI 提炼 → 导出</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLinkNovel(true)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] transition-colors" style={linkedNovelName ? { color: '#0084ff', backgroundColor: 'rgba(0,132,255,0.05)', borderColor: 'rgba(0,132,255,0.15)' } : { color: '#6b7280', backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
              <BookMarked className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{linkedNovelName || '关联小说'}</span>
            </button>
            <button onClick={() => { const json = exportExtractConfig(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `新月下写作-提炼配置-${new Date().toLocaleDateString('zh-CN')}.json`; a.click(); URL.revokeObjectURL(url); }} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-200">
              <FileText className="h-3 w-3" /> 导出配置
            </button>
            <button onClick={() => { setShowImportConfig(true); setImportText(''); setImportMessage(''); }} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-200">
              <FileText className="h-3 w-3" /> 导入配置
            </button>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-200">
              <FileText className="h-3 w-3" /> 提炼历史
              {history.length > 0 && <span className="ml-0.5 text-[9px] text-gray-400">({history.length})</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[240px] shrink-0 border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-3 py-3">
            <div className="text-sm font-bold text-gray-900">模块列表</div>
            <div className="mt-1 text-[11px] leading-5 text-gray-400">锁图标表示系统指令效果：隐藏输入给 AI，不直接面向用户输出。</div>
          </div>
          <div className="h-[calc(100%-98px)] overflow-y-auto">
            {modules.map((module) => (
              <SortableExtractModule
                key={module.id}
                module={module}
                isSelected={selectedModuleId === module.id}
                isDragOver={dragOverId === module.id && draggingId !== module.id}
                onSelect={setSelectedModuleId}
                onToggleActive={toggleActive}
                onToggleZone={handleToggleZone}
                onDragStart={setDraggingId}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                onDragOver={setDragOverId}
                onDrop={handleDropModule}
              />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-bold text-gray-900">
                <Settings className="h-3.5 w-3.5 text-brand" /> AI 模型
              </h3>
              {models.length === 0 ? (
                <div className="space-y-1">
                  <p className="text-[11px] text-amber-500">未配置可用模型</p>
                  <button onClick={() => navigate('/model-manage')} className="text-[11px] text-brand hover:underline">去“模型管理”配置</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition-all ${selectedModel?.id === model.id ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{model.name}</span>
                        {selectedModel?.id === model.id && <span className="text-brand">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-2 text-xs font-bold text-gray-900">提炼模式</h3>
              <div className="space-y-2">
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${extractMode === 'chapter' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={extractMode === 'chapter'} onChange={() => setExtractMode('chapter')} className="h-3 w-3 text-brand" />
                  <div>
                    <div className={`text-xs font-medium ${extractMode === 'chapter' ? 'text-brand' : 'text-gray-700'}`}>逐章提炼</div>
                    <div className="text-[10px] text-gray-400">每章单独提炼</div>
                  </div>
                </label>
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${extractMode === 'multi' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={extractMode === 'multi'} onChange={() => setExtractMode('multi')} className="h-3 w-3 text-brand" />
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${extractMode === 'multi' ? 'text-brand' : 'text-gray-700'}`}>每 <input type="number" min={2} max={50} value={chaptersPerBatch} onChange={(event) => setChaptersPerBatch(Math.max(2, Math.min(50, Number(event.target.value))))} className="mx-1 w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-xs focus:border-brand focus:outline-none" /> 章合并</div>
                    <div className="text-[10px] text-gray-400">N 章合并为一组</div>
                  </div>
                </label>
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${extractMode === 'smart' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={extractMode === 'smart'} onChange={() => setExtractMode('smart')} className="h-3 w-3 text-brand" />
                  <div>
                    <div className={`text-xs font-medium ${extractMode === 'smart' ? 'text-brand' : 'text-gray-700'}`}>智能提炼</div>
                    <div className="text-[10px] text-gray-400">AI 智能弹性分组提炼</div>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-2 text-xs font-bold text-gray-900">导出设置</h3>
              <div className="space-y-2">
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${outputMode === 'single' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={outputMode === 'single'} onChange={() => setOutputMode('single')} className="h-3 w-3 text-brand" />
                  <span className={`text-xs font-medium ${outputMode === 'single' ? 'text-brand' : 'text-gray-700'}`}>1个剧情点 = 1个txt</span>
                </label>
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${outputMode === 'book' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={outputMode === 'book'} onChange={() => setOutputMode('book')} className="h-3 w-3 text-brand" />
                  <span className={`text-xs font-medium ${outputMode === 'book' ? 'text-brand' : 'text-gray-700'}`}>1本小说 = 1个txt</span>
                </label>
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${outputMode === 'multi' ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" checked={outputMode === 'multi'} onChange={() => setOutputMode('multi')} className="h-3 w-3 text-brand" />
                  <div className="flex items-center gap-1 text-xs">
                    <input type="number" min={1} max={1000} value={pointsPerFile} onChange={(event) => setPointsPerFile(Math.max(1, Math.min(1000, Number(event.target.value))))} className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-xs focus:border-brand focus:outline-none" />
                    <span className={`font-medium ${outputMode === 'multi' ? 'text-brand' : 'text-gray-700'}`}>个剧情点 = 1个txt</span>
                  </div>
                </label>
              </div>
            </section>

            <section className="col-span-3 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <FileText className="h-4 w-4 text-brand" /> 上传 TXT 文件
              </h3>
              <input ref={fileInputRef} type="file" accept=".txt" multiple onChange={(event) => { const list = event.target.files; if (list) void handleFiles(list); event.target.value = ''; }} className="hidden" />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                  void handleFiles(event.dataTransfer.files);
                }}
                className={`flex h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 transition-all ${isDraggingFile ? 'border-brand bg-brand-light/40' : 'border-gray-200 hover:border-brand hover:bg-brand-light/30'}`}
              >
                <FileText className={`h-8 w-8 ${isDraggingFile ? 'text-brand' : 'text-gray-300'}`} />
                <span className={`text-sm ${isDraggingFile ? 'font-medium text-brand' : 'text-gray-500'}`}>{isDraggingFile ? '松开上传' : '点击或拖拽 .txt 文件'}</span>
                <span className="text-[10px] text-gray-400">内容自动保存，关闭后可继续</span>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-gray-600">{files.length} 个文件，{selectedFiles.length} 个待处理</span>
                    <div className="flex gap-2">
                      <button onClick={() => setFiles((prev) => prev.map((file) => ({ ...file, selected: true })))} className="text-[10px] text-brand hover:underline">全选</button>
                      <button onClick={() => setFiles((prev) => prev.map((file) => ({ ...file, selected: false })))} className="text-[10px] text-gray-400 hover:underline">取消</button>
                      <button onClick={() => setFiles([])} className="text-[10px] text-red-400 hover:underline">清空</button>
                    </div>
                  </div>
                  <div className="max-h-[160px] divide-y divide-gray-50 overflow-y-auto rounded-lg border border-gray-100">
                    {[...files].reverse().map((file) => (
                      <div key={file.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50">
                        <input type="checkbox" checked={file.selected} onChange={() => setFiles((prev) => prev.map((item) => item.id === file.id ? { ...item, selected: !item.selected } : item))} className="h-3.5 w-3.5 rounded border-gray-300 text-brand focus:ring-brand" />
                        <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="flex-1 truncate text-xs text-gray-700">{file.name}</span>
                        <span className="text-[10px] text-gray-400">{file.content.length.toLocaleString()}字</span>
                        <button onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))} className="p-0.5 text-gray-300 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="col-span-3 flex items-center justify-between">
              <span className="rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-xs text-brand">
                {saveMessage || extractProgress || '准备就绪'}
              </span>
              <button
                onClick={() => void handleExtract()}
                disabled={!canExtract}
                className="flex w-[168px] items-center justify-center gap-1.5 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Play className="h-4 w-4" /> {isExtracting ? '提炼中' : '开始提炼'}
              </button>
            </div>
          </div>
        </main>

        <aside className="w-[420px] shrink-0 border-l border-gray-200 bg-white">
          <div className="h-full overflow-y-auto p-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-900">模块预览</h3>
              <div className="space-y-3">
                {activeModules.map((module) => {
                  const collapsed = collapsedPreviewIds[module.id] ?? false;
                  return (
                    <div key={module.id} className="overflow-hidden rounded-xl border border-gray-100">
                      <button
                        onClick={() => setCollapsedPreviewIds((prev) => ({ ...prev, [module.id]: !collapsed }))}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold ${module.zone === 'system' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600'}`}
                      >
                        <span>{module.label}</span>
                        {collapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {!collapsed && (
                        <div className="whitespace-pre-wrap p-3 text-xs leading-6 text-gray-600">{module.instruction}</div>
                      )}
                    </div>
                  );
                })}
                {!activeModules.length && <div className="py-8 text-center text-sm text-gray-400">暂无激活模块</div>}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-[640px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">提炼历史</h3>
              <button onClick={() => setShowHistory(false)} className="rounded p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">暂无提炼记录</div>
              ) : history.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-bold text-brand"># {index + 1}</div>
                  <div className="text-xs text-gray-700">{item.fileNames.join('、')}</div>
                  <div className="mt-1 text-[11px] text-gray-400">{item.extractModeLabel} · {item.resultCount} 条结果</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImportConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex w-[620px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">导入配置</h3>
              <p className="mt-1 text-xs text-gray-400">导入后会覆盖当前所有模块设置，建议先导出备份。</p>
            </div>
            <div className="space-y-3 p-5">
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                className="h-[220px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
                placeholder="粘贴配置 JSON，或点右下角选择配置文件"
              />
              {importMessage && <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{importMessage}</div>}
              <input
                ref={fileImportRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (loadEvent) => {
                    setImportText(String(loadEvent.target?.result || ''));
                    setImportMessage('');
                  };
                  reader.readAsText(file);
                  event.target.value = '';
                }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
              <button onClick={() => fileImportRef.current?.click()} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white">
                选择配置文件
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowImportConfig(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white">
                  取消
                </button>
                <button onClick={() => setImportMessage(importExtractConfig(importText).message)} className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LinkNovelModal
        isOpen={showLinkNovel}
        novels={novels}
        selectedNovelId={selectedNovelId}
        onSelect={setSelectedNovelId}
        onClose={() => setShowLinkNovel(false)}
      />
    </div>
  );
}
