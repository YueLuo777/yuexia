import { Download, Library, Play, Settings, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChapterSelectPanel } from '@/features/extract/components/ChapterSelectPanel';
import { ExtractDropZone } from '@/features/extract/components/ExtractDropZone';
import { useExtractModules } from '@/features/extract/hooks/useExtractModules';
import { useExtractNovels } from '@/features/extract/hooks/useExtractNovels';
import type { ExtractChapter, ExtractResult, ExtractZone } from '@/features/extract/model/extractTypes';
import { readModelSnapshot } from '@/features/models/hooks/useModels';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { callModel } from '@/features/models/services/callModel';
import { savePlotItems } from '@/features/plot-library/hooks/usePlotLibrary';

function createExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return '暂无正文，建议先在工作台补充章节内容。';
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readEnabledModels() {
  return readModelSnapshot().filter((model) => model.enabled);
}

function buildSystemPrompt(modules: { label: string; instruction: string }[]) {
  return modules
    .map((module) => `【${module.label}】\n${module.instruction.trim()}`)
    .filter(Boolean)
    .join('\n\n');
}

function buildExtractRequest(chapter: ExtractChapter, modules: { label: string; instruction: string }[]) {
  const moduleText = modules.map((module) => `【${module.label}】\n${module.instruction.trim()}`).join('\n\n');
  return [
    `请提炼以下章节的剧情信息。`,
    `章节：第${chapter.serialNumber}章 ${chapter.title || '未命名章节'}`,
    '',
    '【输出要求】',
    moduleText,
    '',
    '【章节正文】',
    chapter.content.trim() || '暂无正文。',
  ].join('\n');
}

function buildLocalPreview(chapter: ExtractChapter, modules: { label: string; instruction: string }[]) {
  return modules
    .map((module) => `【${module.label}】\n${module.instruction}\n章节摘录：${createExcerpt(chapter.content)}`)
    .join('\n\n');
}

export function ExtractPage() {
  const navigate = useNavigate();
  const novels = useExtractNovels();
  const {
    modules,
    systemModules,
    outputModules,
    activeModules,
    toggleActive,
    updateModule,
    moveModule,
  } = useExtractModules();

  const [models, setModels] = useState<ModelItem[]>(readEnabledModels);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedNovelId, setSelectedNovelId] = useState<number | null>(null);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(modules[0]?.id ?? null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<ExtractZone | null>(null);
  const [results, setResults] = useState<ExtractResult[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState('');

  useEffect(() => {
    if (selectedNovelId === null && novels.length > 0) {
      setSelectedNovelId(novels[0].id);
    }
  }, [novels, selectedNovelId]);

  useEffect(() => {
    const syncModels = () => setModels(readEnabledModels());
    window.addEventListener('xinyuexia_models_updated', syncModels);
    return () => window.removeEventListener('xinyuexia_models_updated', syncModels);
  }, []);

  useEffect(() => {
    if (!selectedModelId && models[0]) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  const selectedNovel = novels.find((novel) => novel.id === selectedNovelId) ?? novels[0] ?? null;
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0] ?? null;
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;

  const selectedChapters = useMemo<ExtractChapter[]>(() => {
    if (!selectedNovel) return [];
    return selectedNovel.chapters.filter((chapter) => selectedChapterIds.has(chapter.id));
  }, [selectedChapterIds, selectedNovel]);

  const activeSystemModules = useMemo(() => activeModules.filter((module) => module.zone === 'system'), [activeModules]);
  const activeOutputModules = useMemo(() => activeModules.filter((module) => module.zone === 'output'), [activeModules]);
  const canExtract = selectedChapters.length > 0 && activeOutputModules.length > 0 && !isExtracting;

  const handleSelectNovel = (id: number) => {
    setSelectedNovelId(id);
    setSelectedChapterIds(new Set());
    setResults([]);
    setSaveMessage('');
    setExtractProgress('');
  };

  const handleToggleChapter = (id: number) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectFirst = (count: number) => {
    if (!selectedNovel) return;
    setSelectedChapterIds(new Set(selectedNovel.chapters.slice(0, count).map((chapter) => chapter.id)));
  };

  const handleSelectAll = () => {
    if (!selectedNovel) return;
    setSelectedChapterIds(new Set(selectedNovel.chapters.map((chapter) => chapter.id)));
  };

  const resetDragState = () => {
    setActiveDragId(null);
    setDragOverId(null);
    setDragOverZone(null);
  };

  const handleDropTarget = (overId: string | ExtractZone) => {
    if (activeDragId && activeDragId !== overId) {
      moveModule(activeDragId, overId);
    }
    resetDragState();
  };

  const handleExtract = async () => {
    if (!canExtract) return;

    setIsExtracting(true);
    setResults([]);
    setSaveMessage('');
    setExtractProgress(selectedModel ? '准备调用模型...' : '未配置模型，生成本地预览...');

    const systemPrompt = buildSystemPrompt(activeSystemModules);
    const nextResults: ExtractResult[] = [];

    for (let index = 0; index < selectedChapters.length; index += 1) {
      const chapter = selectedChapters[index];
      const chapterTitle = `第${chapter.serialNumber}章 ${chapter.title || '未命名章节'}`;
      setExtractProgress(`正在处理 ${index + 1}/${selectedChapters.length}：${chapterTitle}`);

      let content = '';
      if (!selectedModel) {
        content = buildLocalPreview(chapter, activeOutputModules);
      } else {
        try {
          content = await callModel({
            model: selectedModel,
            prompt: systemPrompt,
            userContent: buildExtractRequest(chapter, activeOutputModules),
          });
        } catch (error) {
          content = error instanceof Error ? `【错误】${error.message}` : '【错误】模型请求失败';
        }
      }

      nextResults.push({
        id: `${chapter.id}-${Date.now()}-${index}`,
        chapterTitle,
        content,
      });
      setResults([...nextResults]);
    }

    setExtractProgress(selectedModel ? `提炼完成：${nextResults.length} 章` : `本地预览完成：${nextResults.length} 章`);
    setIsExtracting(false);
  };

  const handleExport = () => {
    const text = results.map((result) => `${result.chapterTitle}\n\n${result.content}`).join('\n\n---\n\n');
    downloadText(`提炼剧情-${selectedNovel?.title ?? '未命名'}.txt`, text);
  };

  const handleSaveToLibrary = () => {
    if (!selectedNovel || results.length === 0) return;
    savePlotItems(results.map((result) => ({
      title: result.chapterTitle,
      chapter: result.chapterTitle,
      novelTitle: selectedNovel.title,
      content: result.content,
      tags: activeOutputModules.map((module) => module.label),
    })));
    setSaveMessage(`已保存 ${results.length} 条到剧情库`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Sparkles className="h-5 w-5 text-brand" />
            提炼剧情
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">长按模块可拖拽排序，系统指令和输出模块支持跨区移动。</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel?.id ?? ''}
            onChange={(event) => setSelectedModelId(event.target.value)}
            className="h-9 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 outline-none focus:border-brand"
          >
            {models.length === 0 ? (
              <option value="">无启用模型</option>
            ) : models.map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          <button
            onClick={() => navigate('/model-manage')}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            模型设置
          </button>
          <button
            onClick={() => void handleExtract()}
            disabled={!canExtract}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Play className="h-4 w-4" />
            {isExtracting ? '提炼中' : '开始提炼'}
          </button>
          <button
            onClick={handleExport}
            disabled={results.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            <Download className="h-4 w-4" />
            导出
          </button>
          <button
            onClick={handleSaveToLibrary}
            disabled={results.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-light px-4 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white disabled:text-gray-300"
          >
            <Library className="h-4 w-4" />
            保存到剧情库
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[260px_minmax(420px,1fr)_320px] xl:overflow-hidden">
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm xl:min-h-0">
          <ExtractDropZone
            id="system"
            title="系统指令"
            modules={systemModules}
            selectedId={selectedModuleId}
            activeDragId={activeDragId}
            dragOverId={dragOverId}
            dragOverZone={dragOverZone}
            onSelect={setSelectedModuleId}
            onToggleActive={toggleActive}
            onDragStart={setActiveDragId}
            onDragEnd={resetDragState}
            onDragOverModule={(id) => {
              setDragOverId(id);
              setDragOverZone('system');
            }}
            onDragOverZone={(zone) => {
              setDragOverZone(zone);
              setDragOverId(null);
            }}
            onDropModule={handleDropTarget}
            onDropZone={handleDropTarget}
          />
          <ExtractDropZone
            id="output"
            title="输出模块"
            modules={outputModules}
            selectedId={selectedModuleId}
            activeDragId={activeDragId}
            dragOverId={dragOverId}
            dragOverZone={dragOverZone}
            onSelect={setSelectedModuleId}
            onToggleActive={toggleActive}
            onDragStart={setActiveDragId}
            onDragEnd={resetDragState}
            onDragOverModule={(id) => {
              setDragOverId(id);
              setDragOverZone('output');
            }}
            onDragOverZone={(zone) => {
              setDragOverZone(zone);
              setDragOverId(null);
            }}
            onDropModule={handleDropTarget}
            onDropZone={handleDropTarget}
          />
        </aside>

        <section className="flex min-h-0 flex-col gap-4">
          <ChapterSelectPanel
            novels={novels}
            selectedNovelId={selectedNovel?.id ?? null}
            selectedChapterIds={selectedChapterIds}
            onSelectNovel={handleSelectNovel}
            onToggleChapter={handleToggleChapter}
            onSelectFirst={handleSelectFirst}
            onSelectAll={handleSelectAll}
            onClear={() => {
              setSelectedChapterIds(new Set());
              setResults([]);
              setSaveMessage('');
              setExtractProgress('');
            }}
          />

          <section className="min-h-[220px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">提炼结果</h2>
              <span className="text-xs text-gray-400">{saveMessage || extractProgress || `${results.length} 条`}</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-4">
              {results.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 px-4 text-center text-sm text-gray-400">
                  选择章节后点击“开始提炼”。未配置模型时生成本地预览；配置模型后会逐章调用模型。
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <article key={result.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <h3 className="mb-2 text-xs font-bold text-gray-800">{result.chapterTitle}</h3>
                      <pre className="whitespace-pre-wrap text-xs leading-6 text-gray-600">{result.content}</pre>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="flex min-h-0 flex-col rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">模块编辑</h2>
            <p className="mt-1 text-xs text-gray-400">点击卡片编辑，拖拽只绑定在左侧把手上。</p>
          </div>
          {selectedModule ? (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-500">模块名称</span>
                <input
                  value={selectedModule.label}
                  disabled={selectedModule.locked}
                  onChange={(event) => updateModule(selectedModule.id, { label: event.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-brand disabled:bg-gray-50 disabled:text-gray-400"
                />
              </label>
              <label className="flex min-h-0 flex-1 flex-col space-y-1.5">
                <span className="text-xs font-medium text-gray-500">指令内容</span>
                <textarea
                  value={selectedModule.instruction}
                  onChange={(event) => updateModule(selectedModule.id, { instruction: event.target.value })}
                  className="min-h-[220px] flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 text-gray-700 outline-none transition-colors focus:border-brand"
                />
              </label>
              <div className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                当前区域：{selectedModule.zone === 'system' ? '系统指令' : '输出模块'}。锁定模块不能关闭和改名，但可以跨区拖动调整顺序。
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">请选择一个模块</div>
          )}
        </aside>
      </main>
    </div>
  );
}
