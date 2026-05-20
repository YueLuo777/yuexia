import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Library,
  Link2,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react';

import { useMaterials } from '@/features/materials/hooks/useMaterials';
import type { MaterialItem } from '@/features/materials/model/materialTypes';
import { savePlotItems } from '@/features/plot-library/hooks/usePlotLibrary';
import { WorkbenchAIPanel } from '@/features/workbench/components/WorkbenchAIPanel';
import { readChapterContent, useWorkbenchData } from '@/features/workbench/hooks/useWorkbenchData';
import { addWorkbenchLibraryEntry } from '@/features/workbench/model/workbenchLibraryStorage';
import type { Chapter, Volume, WorkbenchNovel } from '@/features/workbench/model/workbenchTypes';

type EditorMode = 'dual' | 'script' | 'browser';
type AIResultAction = 'replace' | 'append' | 'setting' | 'outline' | 'plot';
type MaterialFilterType = 'novel' | 'script' | 'all';

const MIN_WIDTH = 150;
const GROUP_SIZE = 50;
const FULL_WIDTH = 9999;
const EDITOR_MODE_KEY = 'xinyuexia_script_editor_mode';
const LINKED_NOVEL_KEY = 'xinyuexia_script_editor_linked_novel';
const LEGACY_LINKED_KEYS = ['sev2_linked_novel', 'script_editor_linked_novel'];
const WIDTH_STORAGE_KEYS: Record<EditorMode, string> = {
  dual: 'xinyuexia_script_editor_widths_dual',
  script: 'xinyuexia_script_editor_widths_script',
  browser: 'xinyuexia_script_editor_widths_browser',
};
const AI_COLLAPSED_KEYS: Record<EditorMode, string> = {
  dual: 'xinyuexia_script_editor_ai_collapsed_dual',
  script: 'xinyuexia_script_editor_ai_collapsed_script',
  browser: 'xinyuexia_script_editor_ai_collapsed_browser',
};
const MODE_LABELS: Record<EditorMode, string> = {
  dual: '小说对照编辑',
  script: '纯剧本编辑',
  browser: '浏览器编辑',
};

function countText(text: string) {
  return text.replace(/\s/g, '').length;
}

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getVolumeChapterLabel(volumeName: string, chapter: Pick<Chapter, 'serialNumber' | 'title'>) {
  if (volumeName === '集纲') {
    return chapter.title || `集纲${chapter.serialNumber}`;
  }
  return `第${chapter.serialNumber}集${chapter.title ? ` ${chapter.title}` : ''}`;
}

function normalizeEditorContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (index === 0 || lines[index - 1].trim() === '') {
      return line.startsWith('　　') ? line : `　　${trimmed}`;
    }
    return trimmed;
  }).join('\n');
}

function AreaHeader({ label, extra }: { label: string; extra?: React.ReactNode }) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3">
      <span className="text-sm font-bold text-blue-600">{label}</span>
      {extra}
    </div>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (event: ReactMouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group z-10 flex w-[4px] shrink-0 cursor-ew-resize items-center justify-center bg-transparent transition-colors hover:bg-brand/30"
    >
      <div className="h-8 w-[2px] rounded-full bg-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function LinkNovelModal({
  isOpen,
  novels,
  onClose,
  onLink,
}: {
  isOpen: boolean;
  novels: WorkbenchNovel[];
  onClose: () => void;
  onLink: (novelId: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-[440px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-base font-bold text-gray-900">关联小说</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {novels.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">当前没有可关联的小说作品</p>
          ) : (
            <div className="space-y-1">
              {novels.map((novel) => (
                <button
                  key={novel.id}
                  onClick={() => onLink(novel.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{novel.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{novel.category || '未分类'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScriptSidebar({
  volumes,
  selectedChapterId,
  width,
  onToggleVolume,
  onSelectChapter,
  onAddVolume,
  onAddChapter,
  onDeleteChapter,
}: {
  volumes: Volume[];
  selectedChapterId: number | null;
  width: number;
  onToggleVolume: (volumeId: number) => void;
  onSelectChapter: (volumeId: number, chapterId: number) => void;
  onAddVolume: () => void;
  onAddChapter: (volumeId: number) => void;
  onDeleteChapter: (volumeId: number, chapterId: number) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; volumeId: number; chapterId: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <aside className="flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white" style={{ width }}>
      <AreaHeader
        label="剧本目录"
        extra={(
          <button
            onClick={onAddVolume}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-brand-light hover:text-brand"
            title="新增卷"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      />
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {volumes.map((volume) => (
          <div key={volume.id}>
            <button
              onClick={() => onToggleVolume(volume.id)}
              className="mb-1 flex h-9 w-full items-center gap-1 rounded-md bg-[#E6F7FB] px-2 text-xs font-bold text-[#08B3D9] transition-colors hover:bg-[#D5F0F7]"
            >
              {volume.isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
              )}
              <span className="flex-1 truncate text-left">{volume.name}</span>
              <span className="text-[10px] text-[#08B3D9]/70">{volume.chapters.length}集</span>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  onAddChapter(volume.id);
                }}
                className="rounded p-0.5 text-[#08B3D9]/70 transition-colors hover:text-[#08B3D9]"
              >
                <Plus className="h-3 w-3" />
              </span>
            </button>
            {volume.isExpanded && (
              <div className="ml-2 space-y-0.5">
                {volume.chapters.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-gray-300">空</p>
                ) : volume.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => onSelectChapter(volume.id, chapter.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, volumeId: volume.id, chapterId: chapter.id });
                    }}
                    className={`flex w-full items-center rounded px-2 py-1.5 text-xs transition-colors ${
                      selectedChapterId === chapter.id
                        ? 'bg-orange-50 font-medium text-orange-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex-1 truncate text-left">{getVolumeChapterLabel(volume.name, chapter)}</span>
                    <span className={`ml-1 shrink-0 text-[10px] ${selectedChapterId === chapter.id ? 'text-orange-400' : 'text-gray-400'}`}>
                      {chapter.wordCount || 0}字
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[90] min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              onDeleteChapter(contextMenu.volumeId, contextMenu.chapterId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            删除
          </button>
        </div>
      )}
    </aside>
  );
}

function groupChapters(chapters: Array<{ id: number; serialNumber: number; title: string }>) {
  const groups: Array<{ index: number; label: string; chapters: Array<{ id: number; serialNumber: number; title: string }> }> = [];
  for (let i = 0; i < chapters.length; i += GROUP_SIZE) {
    const slice = chapters.slice(i, i + GROUP_SIZE);
    groups.push({
      index: groups.length + 1,
      label: `第${slice[0].serialNumber}章 - 第${slice[slice.length - 1].serialNumber}章`,
      chapters: slice,
    });
  }
  return groups;
}

function NovelSidebar({
  linkedNovel,
  linkedVolumes,
  selectedChapterId,
  onSelectChapter,
}: {
  linkedNovel: WorkbenchNovel | null;
  linkedVolumes: Volume[];
  selectedChapterId: number | null;
  onSelectChapter: (chapterId: number) => void;
}) {
  const chapters = useMemo(() => linkedVolumes
    .flatMap((volume) => volume.chapters.map((chapter) => ({
      id: chapter.id,
      serialNumber: chapter.serialNumber,
      title: chapter.title,
    })))
    .sort((a, b) => a.serialNumber - b.serialNumber), [linkedVolumes]);
  const groups = useMemo(() => groupChapters(chapters), [chapters]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    setExpandedGroups(new Set([1]));
  }, [linkedNovel?.id]);

  return (
    <aside className="flex min-w-[150px] flex-1 flex-col overflow-hidden border-l border-gray-200 bg-white">
      <AreaHeader label="小说目录" extra={!linkedNovel ? <span className="text-xs text-gray-400">未关联小说</span> : undefined} />
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {!linkedNovel ? (
          <div className="h-full" />
        ) : chapters.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-300">当前小说暂无章节</p>
        ) : (
          groups.map((group) => (
            <div key={group.index}>
              <button
                onClick={() => {
                  setExpandedGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.index)) next.delete(group.index);
                    else next.add(group.index);
                    return next;
                  });
                }}
                className="mb-1 flex w-full items-center gap-1 rounded-md bg-[#E6F7FB] px-2 py-1.5 text-xs font-bold text-[#08B3D9] transition-colors hover:bg-[#D5F0F7]"
              >
                {expandedGroups.has(group.index) ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
                )}
                <span className="flex-1 truncate text-left">{group.label}</span>
                <span className="text-[10px] text-[#08B3D9]/70">{group.chapters.length}章</span>
              </button>
              {expandedGroups.has(group.index) && (
                <div className="flex flex-wrap gap-1 p-1">
                  {group.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => onSelectChapter(chapter.id)}
                      title={chapter.title || `第${chapter.serialNumber}章`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border text-[11px] transition-colors ${
                        selectedChapterId === chapter.id
                          ? 'border-brand bg-brand font-medium text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {chapter.serialNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function ScriptEditorArea({
  width,
  volumeName,
  chapter,
  content,
  aiCollapsed,
  showAiToggle,
  onToggleAI,
  onChangeContent,
  onRenameChapter,
  onDeleteChapter,
}: {
  width: number;
  volumeName: string | null;
  chapter: Chapter | null;
  content: string;
  aiCollapsed: boolean;
  showAiToggle: boolean;
  onToggleAI: () => void;
  onChangeContent: (content: string) => void;
  onRenameChapter: (title: string) => void;
  onDeleteChapter: () => void;
}) {
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('xinyuexia_script_editor_font_size') ?? 16));

  useEffect(() => {
    localStorage.setItem('xinyuexia_script_editor_font_size', String(fontSize));
  }, [fontSize]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${content.slice(0, start)}\n　　${content.slice(end)}`;
      onChangeContent(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 3;
      });
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const lines = pasted.split('\n');
    const shouldIndentFirstLine = !before.trim() || before.endsWith('\n');
    const nextLines = lines.map((line, index) => (shouldIndentFirstLine && index === 0 ? `　　${line}` : line));
    const next = `${before}${nextLines.join('\n')}${after}`;
    onChangeContent(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + nextLines.join('\n').length;
    });
  };

  if (!chapter) {
    return (
      <section className="flex min-w-0 flex-col overflow-hidden bg-white" style={{ width }}>
        <AreaHeader label="剧本编辑区" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-gray-400">
            <PenLine className="mx-auto mb-2 h-10 w-10 text-gray-200" />
            <p className="text-sm">请选择一个剧本章节开始编辑</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col overflow-hidden bg-white" style={{ width }}>
      <AreaHeader
        label="剧本编辑区"
        extra={showAiToggle ? (
          <button
            onClick={onToggleAI}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {aiCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            <span>{aiCollapsed ? '展开 AI' : '收起 AI'}</span>
          </button>
        ) : undefined}
      />
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{volumeName || '-'}</span>
        <input
          value={chapter.title}
          onChange={(event) => onRenameChapter(event.target.value)}
          placeholder={volumeName === '集纲' ? `集纲${chapter.serialNumber}` : `第${chapter.serialNumber}集标题`}
          className="min-w-0 flex-1 rounded border border-transparent px-2 py-1 text-sm font-medium text-gray-800 outline-none focus:border-brand focus:bg-brand-light/20"
        />
        <span className="text-xs text-gray-400">{countText(content)} 字</span>
      </div>
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-gray-100 px-3">
        <button
          onClick={() => setFontSize((prev) => Math.max(12, prev - 1))}
          className="rounded border border-brand px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand-light"
        >
          字号-
        </button>
        <button
          onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
          className="rounded border border-brand px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand-light"
        >
          字号+
        </button>
        <button
          onClick={() => onChangeContent(normalizeEditorContent(content))}
          className="rounded border border-brand px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand-light"
        >
          智能排版
        </button>
        <button
          onClick={() => void handleCopy()}
          className="rounded border border-brand px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand-light"
        >
          一键复制
        </button>
        <button
          onClick={onDeleteChapter}
          className="rounded border border-red-500 px-2 py-0.5 text-xs text-red-500 transition-colors hover:bg-red-50"
        >
          删除
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(event) => onChangeContent(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="开始编写剧本..."
          spellCheck={false}
          className="h-full w-full resize-none p-4 outline-none"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.85,
            color: '#1f2937',
          }}
        />
      </div>
      <div className="flex h-9 shrink-0 items-center border-t border-gray-100 bg-white px-3 text-xs text-gray-400">
        字数 <span className="ml-1 font-medium text-brand">{countText(content)}</span>
      </div>
    </section>
  );
}

function NovelPreviewArea({
  width,
  linkedNovelId,
  linkedNovel,
  linkedVolumes,
  selectedChapterId,
}: {
  width: number;
  linkedNovelId: number | null;
  linkedNovel: WorkbenchNovel | null;
  linkedVolumes: Volume[];
  selectedChapterId: number | null;
}) {
  const selectedChapter = useMemo(() => {
    for (const volume of linkedVolumes) {
      const chapter = volume.chapters.find((item) => item.id === selectedChapterId);
      if (chapter) {
        return { volumeName: volume.name, chapter };
      }
    }
    return null;
  }, [linkedVolumes, selectedChapterId]);

  const previewContent = useMemo(() => {
    if (!linkedNovelId || !selectedChapterId) return '';
    return readChapterContent(linkedNovelId, selectedChapterId);
  }, [linkedNovelId, selectedChapterId]);

  return (
    <section className="flex shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white" style={{ width }}>
      <AreaHeader label="小说预览区" />
      {!linkedNovel ? (
        <div className="flex-1" />
      ) : (
        <>
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3">
            {selectedChapter ? (
              <>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  第{selectedChapter.chapter.serialNumber}章
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                  {selectedChapter.chapter.title || selectedChapter.volumeName}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">请从右侧小说目录选择章节</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {previewContent ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{previewContent}</p>
            ) : (
              <p className="py-8 text-center text-xs text-gray-300">
                {selectedChapter ? '当前章节暂无正文内容' : '点击右侧章节编号查看正文'}
              </p>
            )}
          </div>
          <div className="flex h-9 shrink-0 items-center border-t border-gray-100 bg-white px-3 text-xs text-gray-400">
            字数 <span className="ml-1 font-medium text-brand">{countText(previewContent)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function MaterialPreviewArea({ material, width }: { material: MaterialItem | null; width: number }) {
  return (
    <section className="flex shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white" style={{ width }}>
      <AreaHeader label="资料预览区" />
      {!material ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-gray-400">请从右侧资料库选择资料</p>
        </div>
      ) : (
        <>
          <div className="shrink-0 space-y-1 border-b border-gray-100 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] text-gray-400">标题</span>
              <span className="truncate text-xs font-medium text-gray-800">{material.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] text-gray-400">作品</span>
              <span className="truncate text-xs text-gray-600">{material.novelTitle}</span>
              {material.chapterSerial ? (
                <span className="truncate text-xs text-gray-600">
                  第{material.chapterSerial}章{material.chapterName ? ` ${material.chapterName}` : ''}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{material.content}</p>
          </div>
          <div className="flex h-9 shrink-0 items-center border-t border-gray-100 bg-white px-3 text-xs text-gray-400">
            字数 <span className="ml-1 font-medium text-brand">{countText(material.content)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function MaterialSidebar({
  width,
  materials,
  selectedMaterialId,
  onSelectMaterial,
}: {
  width: number;
  materials: MaterialItem[];
  selectedMaterialId: string | null;
  onSelectMaterial: (id: string) => void;
}) {
  const [filterType, setFilterType] = useState<MaterialFilterType>('novel');
  const [expandedNovelIds, setExpandedNovelIds] = useState<Set<number>>(new Set());

  const filteredMaterials = useMemo(() => (
    filterType === 'all' ? materials : materials.filter((item) => item.type === filterType)
  ), [filterType, materials]);

  const groups = useMemo(() => {
    const grouped = new Map<number, { novelId: number; title: string; materials: MaterialItem[] }>();
    filteredMaterials.forEach((material) => {
      if (!grouped.has(material.novelId)) {
        grouped.set(material.novelId, {
          novelId: material.novelId,
          title: material.novelTitle,
          materials: [],
        });
      }
      grouped.get(material.novelId)?.materials.push(material);
    });
    return Array.from(grouped.values()).map((group) => ({
      ...group,
      materials: [...group.materials].sort((a, b) => (a.chapterSerial ?? Number.MAX_SAFE_INTEGER) - (b.chapterSerial ?? Number.MAX_SAFE_INTEGER)),
    }));
  }, [filteredMaterials]);

  const filterButtons: Array<{ key: MaterialFilterType; label: string; icon: React.ReactNode }> = [
    { key: 'novel', label: '小说', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: 'script', label: '剧本', icon: <PenLine className="h-3.5 w-3.5" /> },
    { key: 'all', label: '全部', icon: <Library className="h-3.5 w-3.5" /> },
  ];

  return (
    <aside className="flex shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white" style={{ width }}>
      <AreaHeader label="资料库侧边栏" />
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 px-2 py-2">
        {filterButtons.map((button) => (
          <button
            key={button.key}
            onClick={() => setFilterType(button.key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
              filterType === button.key
                ? 'bg-brand font-medium text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {button.icon}
            <span>{button.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">当前筛选下暂无资料</p>
        ) : (
          groups.map((group) => {
            const expanded = expandedNovelIds.has(group.novelId);
            return (
              <div key={group.novelId}>
                <button
                  onClick={() => {
                    setExpandedNovelIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.novelId)) next.delete(group.novelId);
                      else next.add(group.novelId);
                      return next;
                    });
                  }}
                  className="mb-1 flex w-full items-center gap-1 rounded-md bg-[#E6F7FB] px-2 py-1.5 text-xs font-bold text-[#08B3D9] transition-colors hover:bg-[#D5F0F7]"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#08B3D9]/80" />
                  )}
                  <span className="flex-1 truncate text-left">{group.title}</span>
                  <span className="text-[10px] text-[#08B3D9]/70">{group.materials.length}条</span>
                </button>
                {expanded && (
                  <div className="ml-1 space-y-2">
                    {group.materials.map((material) => (
                      <button
                        key={material.id}
                        onClick={() => onSelectMaterial(material.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedMaterialId === material.id
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <p className="line-clamp-2 text-xs leading-5 text-gray-700">{material.content}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                          <span>
                            {material.chapterSerial ? `第${material.chapterSerial}章` : material.type === 'script' ? '剧本资料' : '小说资料'}
                          </span>
                          <span>{new Date(material.updatedAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export function ScriptEditorPage() {
  const navigate = useNavigate();
  const {
    novels,
    currentNovel,
    currentNovelId,
    volumesMap,
    volumes,
    selectedChapter,
    editorContent,
    setCurrentNovel,
    selectChapter,
    toggleVolume,
    addVolume,
    addChapter,
    renameChapter,
    deleteChapter,
    saveContent,
  } = useWorkbenchData();
  const { items: materials } = useMaterials();

  const [editorMode, setEditorMode] = useState<EditorMode>(() => (
    (localStorage.getItem(EDITOR_MODE_KEY) as EditorMode) || 'dual'
  ));
  const [aiCollapsed, setAiCollapsed] = useState<boolean>(() => readStoredJson(AI_COLLAPSED_KEYS[editorMode], false));
  const [linkedNovelId, setLinkedNovelId] = useState<number | null>(() => {
    const raw = localStorage.getItem(LINKED_NOVEL_KEY)
      ?? LEGACY_LINKED_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
      ?? null;
    return raw ? Number(raw) : null;
  });
  const [selectedNovelChapterId, setSelectedNovelChapterId] = useState<number | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => readStoredJson(WIDTH_STORAGE_KEYS[editorMode], {}));

  const dragRef = useRef<{
    leftKey: string;
    rightKey: string;
    startX: number;
    startWidths: Record<string, number>;
  } | null>(null);

  const currentScript = currentNovel?.type === 'script' ? currentNovel : null;
  const selectedScriptChapter = selectedChapter?.chapter ?? null;
  const selectedVolumeName = selectedChapter?.volumeName ?? null;
  const linkedNovel = useMemo(
    () => novels.find((novel) => novel.id === linkedNovelId && novel.type === 'novel') ?? null,
    [linkedNovelId, novels],
  );
  const linkedNovelVolumes = linkedNovelId ? (volumesMap[linkedNovelId] ?? []) : [];
  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
  );

  useEffect(() => {
    if (currentScript) return;
    const firstScript = novels.find((novel) => novel.type === 'script');
    if (firstScript) setCurrentNovel(firstScript.id);
  }, [currentScript, novels, setCurrentNovel]);

  useEffect(() => {
    localStorage.setItem(EDITOR_MODE_KEY, editorMode);
    setColWidths(readStoredJson(WIDTH_STORAGE_KEYS[editorMode], {}));
    setAiCollapsed(readStoredJson(AI_COLLAPSED_KEYS[editorMode], false));
  }, [editorMode]);

  useEffect(() => {
    if (!linkedNovel) {
      setSelectedNovelChapterId(null);
      return;
    }
    const hasSelected = linkedNovelVolumes.some((volume) => volume.chapters.some((chapter) => chapter.id === selectedNovelChapterId));
    if (hasSelected) return;
    const firstChapter = linkedNovelVolumes.flatMap((volume) => volume.chapters).sort((a, b) => a.serialNumber - b.serialNumber)[0];
    setSelectedNovelChapterId(firstChapter?.id ?? null);
  }, [linkedNovel, linkedNovelVolumes, selectedNovelChapterId]);

  useEffect(() => {
    if (currentNovelId) {
      localStorage.setItem('current_novel_id', String(currentNovelId));
    }
  }, [currentNovelId]);

  useEffect(() => {
    if (selectedScriptChapter?.id) {
      localStorage.setItem('current_chapter_id', String(selectedScriptChapter.id));
    }
  }, [selectedScriptChapter?.id]);

  useEffect(() => {
    if (linkedNovelId === null) {
      localStorage.removeItem(LINKED_NOVEL_KEY);
      LEGACY_LINKED_KEYS.forEach((key) => localStorage.removeItem(key));
      return;
    }
    localStorage.setItem(LINKED_NOVEL_KEY, String(linkedNovelId));
    LEGACY_LINKED_KEYS.forEach((key) => localStorage.setItem(key, String(linkedNovelId)));
  }, [linkedNovelId]);

  const widths = useMemo(() => {
    const browserWidths = {
      sDir: Math.max(MIN_WIDTH, colWidths.sDir ?? 200),
      sEdit: FULL_WIDTH,
      ai: 0,
      nPreview: 0,
      mPreview: 0,
      mSidebar: 0,
    };
    if (editorMode === 'browser') return browserWidths;

    const base = {
      sDir: Math.max(MIN_WIDTH, colWidths.sDir ?? 200),
      sEdit: Math.max(MIN_WIDTH, colWidths.sEdit ?? 420),
      ai: Math.max(MIN_WIDTH, colWidths.ai ?? 300),
      nPreview: Math.max(MIN_WIDTH, colWidths.nPreview ?? 380),
      mPreview: Math.max(MIN_WIDTH, colWidths.mPreview ?? 320),
      mSidebar: Math.max(MIN_WIDTH, colWidths.mSidebar ?? 260),
    };

    if (!aiCollapsed) return base;

    if (editorMode === 'dual') {
      const extra = Math.floor(base.ai / 2);
      return {
        ...base,
        ai: 0,
        sEdit: base.sEdit + extra,
        nPreview: base.nPreview + (base.ai - extra),
      };
    }

    return {
      ...base,
      ai: 0,
      sEdit: base.sEdit + Math.floor(base.ai / 2),
      mPreview: base.mPreview + Math.ceil(base.ai / 2),
    };
  }, [aiCollapsed, colWidths, editorMode]);

  const persistWidths = useCallback((next: Record<string, number>) => {
    setColWidths(next);
    localStorage.setItem(WIDTH_STORAGE_KEYS[editorMode], JSON.stringify(next));
  }, [editorMode]);

  const startResize = useCallback((leftKey: string, rightKey: string, event: ReactMouseEvent) => {
    dragRef.current = {
      leftKey,
      rightKey,
      startX: event.clientX,
      startWidths: { ...widths },
    };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const { leftKey: currentLeftKey, rightKey: currentRightKey, startX, startWidths } = dragRef.current;
      const delta = moveEvent.clientX - startX;
      const nextLeft = Math.max(MIN_WIDTH, startWidths[currentLeftKey] + delta);
      if (currentRightKey === '__flex') {
        persistWidths({ ...startWidths, [currentLeftKey]: nextLeft });
        return;
      }
      const nextRight = Math.max(MIN_WIDTH, startWidths[currentRightKey] - delta);
      persistWidths({
        ...startWidths,
        [currentLeftKey]: nextLeft,
        [currentRightKey]: nextRight,
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [persistWidths, widths]);

  const handleToggleAI = useCallback(() => {
    setAiCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(AI_COLLAPSED_KEYS[editorMode], JSON.stringify(next));
      return next;
    });
  }, [editorMode]);

  const handleApplyAIResult = useCallback((action: AIResultAction, content: string) => {
    if (!currentScript) return;
    if (action === 'replace') {
      saveContent(content);
      return;
    }
    if (action === 'append') {
      saveContent(editorContent.trim() ? `${editorContent}\n\n${content}` : content);
      return;
    }
    if (action === 'setting') {
      addWorkbenchLibraryEntry(
        `xinyuexia_workbench_settings_${currentScript.id}`,
        '设定',
        `AI设定-${selectedScriptChapter?.title || currentScript.title}`,
        content,
      );
      return;
    }
    if (action === 'outline') {
      addWorkbenchLibraryEntry(
        `xinyuexia_workbench_outline_${currentScript.id}`,
        '章节概要',
        `AI概要-${selectedScriptChapter?.title || currentScript.title}`,
        content,
      );
      return;
    }
    savePlotItems([{
      title: `AI剧情-${selectedScriptChapter?.title || currentScript.title}`,
      chapter: selectedScriptChapter?.title || '未选择章节',
      novelTitle: currentScript.title,
      content,
      tags: ['AI助手'],
    }]);
  }, [currentScript, editorContent, saveContent, selectedScriptChapter]);

  if (!currentScript) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">未选择剧本</h1>
          <p className="mt-2 text-sm text-gray-500">请先从剧本列表选择一个剧本，再进入脚本编辑器。</p>
          <Link
            to="/scripts"
            className="mt-5 inline-flex rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark"
          >
            返回我的剧本
          </Link>
        </div>
      </div>
    );
  }

  const linkedNovelOptions = novels.filter((novel) => novel.type === 'novel');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => navigate('/scripts')}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>退出</span>
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-gray-500">剧本名：</span>
          <span className="max-w-[220px] truncate rounded border border-brand px-2 py-1 text-xs font-bold text-brand">
            {currentScript.title}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
          {(Object.keys(MODE_LABELS) as EditorMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                editorMode === mode
                  ? 'bg-brand font-medium text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {linkedNovel ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">关联书名：</span>
            <span className="max-w-[220px] truncate rounded border border-brand px-2 py-1 text-xs font-bold text-brand">
              {linkedNovel.title}
            </span>
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="rounded border border-brand px-3 py-1 text-xs text-brand transition-colors hover:bg-brand-light"
            >
              更换关联
            </button>
            <button
              onClick={() => {
                setLinkedNovelId(null);
                setSelectedNovelChapterId(null);
              }}
              className="rounded border border-red-500 px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
            >
              断开关联
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark"
          >
            <Link2 className="h-3.5 w-3.5" />
            关联小说
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ScriptSidebar
          volumes={volumes}
          selectedChapterId={selectedScriptChapter?.id ?? null}
          width={widths.sDir}
          onToggleVolume={toggleVolume}
          onSelectChapter={selectChapter}
          onAddVolume={addVolume}
          onAddChapter={addChapter}
          onDeleteChapter={deleteChapter}
        />
        <ResizeHandle onMouseDown={(event) => startResize('sDir', 'sEdit', event)} />

        <ScriptEditorArea
          width={widths.sEdit}
          volumeName={selectedVolumeName}
          chapter={selectedScriptChapter}
          content={editorContent}
          aiCollapsed={aiCollapsed}
          showAiToggle={editorMode !== 'browser'}
          onToggleAI={handleToggleAI}
          onChangeContent={saveContent}
          onRenameChapter={(title) => {
            if (selectedScriptChapter) renameChapter(selectedScriptChapter.id, title);
          }}
          onDeleteChapter={() => {
            if (!selectedChapter) return;
            if (!window.confirm('确定要删除当前章节吗？')) return;
            deleteChapter(selectedChapter.volumeId, selectedChapter.chapter.id);
          }}
        />

        {editorMode !== 'browser' && (
          <>
            <ResizeHandle onMouseDown={(event) => startResize('sEdit', aiCollapsed ? (editorMode === 'dual' ? 'nPreview' : 'mPreview') : 'ai', event)} />
            {!aiCollapsed && (
              <>
                <aside className="shrink-0 overflow-hidden border-l border-gray-200 bg-white" style={{ width: widths.ai }}>
                  <WorkbenchAIPanel
                    selectedChapterTitle={selectedScriptChapter?.title || null}
                    selectedWordCount={selectedScriptChapter?.wordCount ?? 0}
                    selectedChapterContent={editorContent}
                    onApplyResult={handleApplyAIResult}
                  />
                </aside>
                <ResizeHandle onMouseDown={(event) => startResize('ai', editorMode === 'dual' ? 'nPreview' : 'mPreview', event)} />
              </>
            )}
          </>
        )}

        {editorMode === 'dual' && (
          <>
            <NovelPreviewArea
              width={widths.nPreview}
              linkedNovelId={linkedNovelId}
              linkedNovel={linkedNovel}
              linkedVolumes={linkedNovelVolumes}
              selectedChapterId={selectedNovelChapterId}
            />
            <ResizeHandle onMouseDown={(event) => startResize('nPreview', '__flex', event)} />
            <NovelSidebar
              linkedNovel={linkedNovel}
              linkedVolumes={linkedNovelVolumes}
              selectedChapterId={selectedNovelChapterId}
              onSelectChapter={setSelectedNovelChapterId}
            />
          </>
        )}

        {editorMode === 'script' && (
          <>
            <MaterialPreviewArea material={selectedMaterial} width={widths.mPreview} />
            <ResizeHandle onMouseDown={(event) => startResize('mPreview', 'mSidebar', event)} />
            <MaterialSidebar
              width={widths.mSidebar}
              materials={materials}
              selectedMaterialId={selectedMaterialId}
              onSelectMaterial={setSelectedMaterialId}
            />
          </>
        )}
      </div>

      <LinkNovelModal
        isOpen={isLinkModalOpen}
        novels={linkedNovelOptions}
        onClose={() => setIsLinkModalOpen(false)}
        onLink={(novelId) => {
          setLinkedNovelId(novelId);
          setIsLinkModalOpen(false);
        }}
      />
    </div>
  );
}
