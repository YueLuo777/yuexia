import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Link2, FileText, ChevronDown, ChevronRight, ChevronLeft,
  Plus, Trash2, PenLine,
  Menu,
} from 'lucide-react';
import { useNovelsContext, toChineseNumber } from '@/hooks/useNovels';
import { useMaterials } from '@/hooks/useMaterials';
import AIPanel from './AIPanel';
import SmartFormatModal, { applyFormat, defaultFormatOptions } from './SmartFormatModal';
import type { FormatOptions } from './SmartFormatModal';
import FontSettingsModal, { getStoredFontSettings, type FontSettings } from './FontSettingsModal';
import { loadNavConfig, getIconByName } from '@/utils/navConfig';
import type { NavGroupConfig } from '@/utils/navConfig';
import type { Volume, Chapter } from '@/hooks/useNovels';
import MaterialSidebar from './MaterialSidebar';
import MaterialPreviewArea from './MaterialPreviewArea';

const MIN_WIDTH = 150;
const STORAGE_KEYS: Record<EditorMode, string> = {
  dual: 'sev2_widths_dual',
  script: 'sev2_widths_script',
  browser: 'sev2_widths_browser',
};
const AI_COLLAPSED_KEYS: Record<EditorMode, string> = {
  dual: 'sev2_ai_collapsed_dual',
  script: 'sev2_ai_collapsed_script',
  browser: 'sev2_ai_collapsed_browser',
};

/* ═══════════════════════════════════════════
   工具组件
   ═══════════════════════════════════════════ */

/** 区域标题行 — 统一 40px 高度 */
function AreaHeader({ label, extra, color = 'blue' }: { label: string; extra?: React.ReactNode; color?: 'blue' | 'black' }) {
  return (
    <div className="flex items-center justify-between px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
      <span className={`text-sm font-bold ${color === 'black' ? 'text-gray-900' : 'text-blue-600'}`}>{label}</span>
      {extra}
    </div>
  );
}

/** 导航菜单按钮 — 点击向下弹出完整导航面板 */
function NavigationMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [navConfig] = useState<NavGroupConfig[]>(() => loadNavConfig());
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Menu className="w-4 h-4" />
        <span>导航</span>
      </button>

      {/* 向下弹出的导航面板 — 1:1复刻主页左侧导航栏 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[180px] bg-white border border-gray-200 rounded-lg shadow-xl z-[70] py-1 max-h-[70vh] overflow-y-auto">
          {navConfig.filter((g) => !g.hidden).map((group) => {
            const isCollapsed = collapsedSections[group.title] || false;
            const GroupIcon = getIconByName(group.iconName);
            return (
              <div key={group.title}>
                {/* 专区标题 */}
                <button
                  onClick={() => toggleSection(group.title)}
                  className="flex items-center justify-between w-full px-3 py-1.5 mx-1 mt-1 font-medium rounded-md bg-brand-light text-brand-dark hover:bg-brand/10 transition-colors"
                  style={{ width: 'calc(100% - 8px)', fontSize: '12px' }}
                >
                  <div className="flex items-center gap-1.5">
                    <GroupIcon className="w-3.5 h-3.5" />
                    <span>{group.title}</span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {/* 导航项 */}
                {!isCollapsed &&
                  group.items
                    .filter((item) => !item.hidden)
                    .map((item, ii) => {
                      const ItemIcon = getIconByName(item.iconName);
                      const isActive = item.to ? currentPath === item.to : false;
                      return (
                        <button
                          key={ii}
                          onClick={() => {
                            if (item.to) {
                              navigate(item.to);
                              setIsOpen(false);
                            }
                          }}
                          className={`flex items-center gap-2.5 w-full px-4 py-2 text-left transition-colors ${
                            isActive
                              ? 'text-orange-500 font-medium bg-orange-50 border-l-[3px] border-orange-500'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </button>
                      );
                    })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 编辑器模式 ── */
type EditorMode = 'script' | 'dual' | 'browser';
const EDITOR_MODE_KEY = 'sev2_editor_mode';
const MODE_LABELS: Record<EditorMode, string> = {
  script: '纯剧本编辑',
  dual: '小说对照编辑',
  browser: '浏览器编辑',
};

function EditorModeSelector({ mode, onChange }: { mode: EditorMode; onChange: (m: EditorMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
      >
        <span>编辑器版本</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[140px] bg-white border border-gray-200 rounded-lg shadow-xl z-[70] py-1">
          {(Object.keys(MODE_LABELS) as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                mode === m ? 'text-brand bg-brand-light font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 拖拽分隔线 */
function DragHandle({ onDragStart }: { onDragStart: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onDragStart}
      className="w-[3px] shrink-0 bg-gray-200 hover:bg-brand cursor-col-resize transition-colors relative z-10"
    />
  );
}

/** 关联选择弹窗 — 支持关联小说和资料库 */
function LinkNovelModal({ isOpen, novels, onLink, onClose }: {
  isOpen: boolean;
  novels: { id: number; title: string }[];
  onLink: (novelId: number) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'novel' | 'material'>('novel');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[420px] max-h-[60vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">关联内容</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
        {/* 标签切换 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('novel')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'novel'
                ? 'text-brand border-b-2 border-brand'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            关联小说
          </button>
          <button
            onClick={() => setActiveTab('material')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'material'
                ? 'text-brand border-b-2 border-brand'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            关联资料库
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'novel' ? (
            novels.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暂无可关联的小说</p>
            ) : (
              <div className="space-y-1">
                {novels.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { onLink(n.id); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-brand shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{n.title}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">资料库功能开发中</p>
              <p className="text-xs mt-1">敬请期待</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   剧本目录区
   ═══════════════════════════════════════════ */

function ScriptSidebar({
  volumes,
  selectedChapterId,
  onSelectChapter,
  onAddVolume,
  onAddChapter,
  onDeleteChapter,
  onToggleVolume,
  width,
}: {
  volumes: Volume[];
  selectedChapterId: number | null;
  onSelectChapter: (chapterId: number) => void;
  onAddVolume: () => void;
  onAddChapter: (volumeId: number) => void;
  onDeleteChapter: (volumeId: number, chapterId: number) => void;
  onToggleVolume: (volumeId: number) => void;
  width: number;
}) {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; volumeId: number; chapterId?: number;
  }>({ visible: false, x: 0, y: 0, volumeId: 0 });

  return (
    <div className="flex flex-col bg-white border-r border-gray-200 h-full shrink-0 overflow-hidden" style={{ width }}>
      <AreaHeader
        label="剧本目录"
        extra={
          <button
            onClick={onAddVolume}
            className="p-1 text-gray-400 hover:text-brand hover:bg-brand-light rounded transition-colors"
            title="新增卡"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {volumes.map((vol) => (
          <div key={vol.id}>
            <button
              onClick={() => onToggleVolume(vol.id)}
              className="w-full flex items-center gap-1 px-2 text-xs font-bold text-[#08B3D9] bg-[#E6F7FB] rounded-md hover:bg-[#D5F0F7] transition-colors mb-1"
              style={{ height: '36px', minHeight: '36px', maxHeight: '36px' }}
            >
              {vol.isExpanded ? (
                <ChevronDown className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
              )}
              <span className="flex-1 text-left truncate">{vol.name}</span>
              <span className="text-[#08B3D9]/70 text-[10px]">{vol.chapters.length}集</span>
              <button
                onClick={(e) => { e.stopPropagation(); onAddChapter(vol.id); }}
                className="p-0.5 text-[#08B3D9]/70 hover:text-[#08B3D9] rounded transition-colors"
                title="新增集"
              >
                <Plus className="w-3 h-3" />
              </button>
            </button>
            {vol.isExpanded && (
              <div className="ml-2 space-y-0.5">
                {vol.chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChapter(ch.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true, x: e.clientX, y: e.clientY, volumeId: vol.id, chapterId: ch.id,
                      });
                    }}
                    className={`w-full flex items-center px-2 py-1.5 text-xs rounded transition-colors ${
                      selectedChapterId === ch.id
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex-1 text-left truncate">
                      {vol.name === '集纲' ? `${ch.title || `第${ch.serialNumber}集`}` : `第${ch.serialNumber}集${ch.title ? ` ${ch.title}` : ''}`}
                    </span>
                    <span className={`text-[10px] shrink-0 ml-1 ${selectedChapterId === ch.id ? 'text-orange-400' : 'text-gray-400'}`}>
                      {ch.wordCount || 0}字
                    </span>
                  </button>
                ))}
                {vol.chapters.length === 0 && (
                  <p className="text-xs text-gray-300 px-2 py-1">空</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {contextMenu.visible && (
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.chapterId && (
            <button
              onClick={() => {
                if (contextMenu.chapterId) onDeleteChapter(contextMenu.volumeId, contextMenu.chapterId);
                setContextMenu((p) => ({ ...p, visible: false }));
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 删除
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const GROUP_SIZE = 50;

/** 将章节列表按50章分组 */
function groupChapters(chapters: { id: number; serialNumber: number; title: string }[]) {
  const groups: { index: number; label: string; chapters: typeof chapters }[] = [];
  for (let i = 0; i < chapters.length; i += GROUP_SIZE) {
    const slice = chapters.slice(i, i + GROUP_SIZE);
    const start = slice[0].serialNumber;
    const end = slice[slice.length - 1].serialNumber;
    groups.push({
      index: groups.length + 1,
      label: `第${start}章-第${end}章`,
      chapters: slice,
    });
  }
  return groups;
}

/* ═══════════════════════════════════════════
   小说目录区 — 50章分组 + 纯数字序号
   ═══════════════════════════════════════════ */

function NovelSidebar({
  linkedNovelId,
  volumesMap,
  novels,
  selectedChapterId,
  onSelectChapter,
}: {
  linkedNovelId: number | null;
  volumesMap: Record<number, Volume[]>;
  novels: { id: number; title: string }[];
  selectedChapterId: number | null;
  onSelectChapter: (chapterId: number) => void;
}) {
  const linkedNovel = novels.find((n) => n.id === linkedNovelId);
  const novelVolumes = linkedNovelId ? (volumesMap[linkedNovelId] || []) : [];

  // 所有章节平铺
  const allChapters = useMemo(() => {
    const chapters: { id: number; serialNumber: number; title: string }[] = [];
    for (const vol of novelVolumes) {
      for (const ch of vol.chapters) {
        chapters.push({ id: ch.id, serialNumber: ch.serialNumber, title: ch.title || '' });
      }
    }
    return chapters;
  }, [novelVolumes]);

  // 50章分组
  const groups = useMemo(() => groupChapters(allChapters), [allChapters]);

  // 展开状态
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([1]));

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIndex)) next.delete(groupIndex);
      else next.add(groupIndex);
      return next;
    });
  };

  return (
    <div className="flex flex-col bg-white border-l border-gray-200 h-full flex-1 min-w-[150px] overflow-hidden">
      <AreaHeader
        label="小说目录"
        extra={!linkedNovel && <span className="text-xs text-gray-400">未关联小说</span>}
      />
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!linkedNovel ? (
          <div className="flex-1" />
        ) : allChapters.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">暂无章节</p>
        ) : (
          groups.map((group) => (
            <div key={group.index}>
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group.index)}
                className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-[#08B3D9] bg-[#E6F7FB] rounded-md hover:bg-[#D5F0F7] transition-colors mb-1"
              >
                {expandedGroups.has(group.index) ? (
                  <ChevronDown className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
                )}
                <span className="flex-1 text-left truncate">{group.label}</span>
                <span className="text-[#08B3D9]/70 text-[10px]">{group.chapters.length}章</span>
              </button>
              {/* 序号网格 */}
              {expandedGroups.has(group.index) && (
                <div className="flex flex-wrap gap-1 p-1">
                  {group.chapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => onSelectChapter(ch.id)}
                      title={ch.title || `第${ch.serialNumber}章`}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] rounded-md transition-colors ${
                        selectedChapterId === ch.id
                          ? 'bg-brand text-white font-medium'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {ch.serialNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   剧本编辑区
   ═══════════════════════════════════════════ */

function ScriptEditorArea({
  chapterId,
  novelId,
  volumes,
  width,
  onDeleteChapter,
  aiCollapsed,
  onToggleAI,
}: {
  chapterId: number | null;
  novelId: number;
  volumes: Volume[];
  width: number;
  onDeleteChapter?: (chapterId: number) => void;
  aiCollapsed?: boolean;
  onToggleAI?: () => void;
}) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setVolumesMap, showToast } = useNovelsContext();

  // 弹窗状态
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [fontSettings, setFontSettings] = useState<FontSettings>(getStoredFontSettings);
  const [formatSettings, setFormatSettings] = useState<FormatOptions>(() => {
    try {
      const saved = localStorage.getItem('smart_format_settings');
      return saved ? JSON.parse(saved) : defaultFormatOptions;
    } catch { return defaultFormatOptions; }
  });

  // 撤销/恢复历史栈
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoingRef = useRef(false);

  const selectedInfo = useMemo(() => {
    for (const vol of volumes) {
      const ch = vol.chapters.find((c) => c.id === chapterId);
      if (ch) return { volumeName: vol.name, chapter: ch, volumeId: vol.id };
    }
    return null;
  }, [volumes, chapterId]);

  useEffect(() => {
    if (!chapterId) {
      setContent('');
      setWordCount(0);
      historyRef.current = [];
      historyIndexRef.current = -1;
      return;
    }
    try {
      const saved = localStorage.getItem(`novel_${novelId}_chapter_${chapterId}`);
      if (saved) {
        setContent(saved);
        setWordCount(saved.replace(/\s/g, '').length);
        historyRef.current = [saved];
        historyIndexRef.current = 0;
      } else {
        setContent('\u3000\u3000');
        setWordCount(0);
        historyRef.current = ['\u3000\u3000'];
        historyIndexRef.current = 0;
      }
    } catch {
      setContent('');
      setWordCount(0);
      historyRef.current = [''];
      historyIndexRef.current = 0;
    }
  }, [chapterId, novelId, volumes]);

  const pushHistory = (text: string) => {
    if (isUndoingRef.current) return;
    const hist = historyRef.current;
    const idx = historyIndexRef.current;
    // 如果当前内容跟历史栈顶相同，不重复入栈
    if (hist.length > 0 && hist[idx] === text) return;
    // 截断当前索引之后的历史
    const newHist = hist.slice(0, idx + 1);
    newHist.push(text);
    // 限制历史栈大小为50
    if (newHist.length > 50) newHist.shift();
    historyRef.current = newHist;
    historyIndexRef.current = newHist.length - 1;
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setWordCount(text.replace(/\s/g, '').length);
    pushHistory(text);
    if (chapterId !== null) {
      try { localStorage.setItem(`novel_${novelId}_chapter_${chapterId}`, text); } catch {}
      setVolumesMap((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        for (const vol of copy[novelId] || []) {
          for (const ch of vol.chapters) {
            if (ch.id === chapterId) { ch.wordCount = text.replace(/\s/g, '').length; break; }
          }
        }
        return copy;
      });

    }
  };

  // 排版：使用SmartFormatModal的applyFormat
  const handleFormat = () => {
    if (!content.trim()) { showToast('提示', '内容为空，无法排版'); return; }
    const formatted = applyFormat(content, formatSettings);
    handleContentChange(formatted);
    showToast('排版完成', '内容已格式化');
  };
  const handleFormatApply = (formatted: string, settings?: FormatOptions) => {
    handleContentChange(formatted);
    if (settings) {
      setFormatSettings(settings);
      try { localStorage.setItem('smart_format_settings', JSON.stringify(settings)); } catch {}
    }
  };

  // 复制正文
  const handleCopyBody = () => {
    navigator.clipboard.writeText(content).then(() => {
      showToast('复制成功', '正文已复制到剪贴板');
    });
  };

  // 删除当前章节
  const handleDelete = () => {
    if (!chapterId || !selectedInfo) return;
    if (window.confirm('确定要删除当前集吗？此操作不可撤销。')) {
      onDeleteChapter?.(chapterId);
    }
  };

  // 键盘事件 — 回车自动添加首行缩进
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = content;
      const before = val.substring(0, start);
      const after = val.substring(end);
      // 新行自动添加首行缩进
      handleContentChange(before + '\n\u3000\u3000' + after);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 3;
      });
    }
  };

  // 粘贴事件 — 自动为首行添加缩进
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = content;
    const before = val.substring(0, start);
    const after = val.substring(end);
    // 处理多行粘贴，每行首行自动缩进
    const lines = pasted.split('\n');
    const isFirstLineEmpty = !before.trim() || before.endsWith('\n');
    if (isFirstLineEmpty && lines.length > 0) {
      lines[0] = '\u3000\u3000' + lines[0];
    }
    handleContentChange(before + lines.join('\n') + after);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + pasted.length + (isFirstLineEmpty ? 2 : 0);
    });
  };

  if (!chapterId) {
    return (
      <div className="flex flex-col bg-white h-full min-w-0 overflow-hidden" style={{ width }}>
        <AreaHeader label="剧本编辑区" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <PenLine className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">请选择一个剧集开始编辑</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-full min-w-0 overflow-hidden" style={{ width }}>
      {/* 区域标题 */}
      <AreaHeader
        label="剧本编辑区"
        extra={
          onToggleAI && (
            <button
              onClick={onToggleAI}
              className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm"
            >
              {aiCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              <span>{aiCollapsed ? '展开AI' : '收起AI'}</span>
            </button>
          )
        }
      />

      {/* 章节信息行 */}
      <div className="flex items-center gap-2 px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
        <span className="text-xs font-medium text-gray-500 shrink-0 bg-gray-100 px-2 py-0.5 rounded">
          {selectedInfo?.volumeName || '-'}
        </span>
        <span className="text-xs font-medium text-gray-500 shrink-0 bg-gray-100 px-2 py-0.5 rounded">
          第{selectedInfo?.chapter?.serialNumber || '-'}集
        </span>
        <span className="text-xs text-gray-400 shrink-0 ml-auto">{wordCount}/20</span>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 h-[32px] border-b border-gray-100 shrink-0">
        <button onClick={() => setIsFontModalOpen(true)} className="px-2 py-0.5 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors">字体</button>
        <button onClick={handleFormat} className="flex items-center gap-0.5 px-2 py-0.5 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors">
          排版 <ChevronDown className="w-3 h-3" />
        </button>
        <button onClick={() => setIsFormatModalOpen(true)} className="px-2 py-0.5 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors">智能排版</button>
        <button onClick={handleCopyBody} className="px-2 py-0.5 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors">一键复制</button>
        <button onClick={() => showToast('提示', '历史版本功能开发中')} className="px-2 py-0.5 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors">历史</button>
        <button onClick={handleDelete} className="px-2 py-0.5 text-xs text-red-500 border border-red-500 rounded hover:bg-red-50 transition-colors">删除</button>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 overflow-hidden relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="开始编写剧本..."
          className="w-full h-full p-4 outline-none resize-none"
          spellCheck={false}
          style={{
            fontFamily: fontSettings.fontFamily,
            color: fontSettings.fontColor,
            fontSize: `${fontSettings.fontSize}px`,
            lineHeight: fontSettings.lineHeight,
          }}
        />
      </div>

      {/* 底部栏 */}
      <div className="flex items-center px-3 h-[36px] border-t border-gray-100 shrink-0 bg-white">
        <span className="text-xs text-gray-400">
          字数 <span className="text-brand font-medium">{wordCount}</span>
        </span>
      </div>

      {/* 弹窗 */}
      <SmartFormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        onApply={handleFormatApply}
        currentText={content}
        settings={formatSettings}
      />
      <FontSettingsModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        settings={fontSettings}
        onChange={(s) => { setFontSettings(s); }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   小说预览区 — 显示章节信息行 + 正文
   ═══════════════════════════════════════════ */

function NovelPreviewArea({
  linkedNovelId,
  novels,
  volumesMap,
  width,
  selectedChapterId,
}: {
  linkedNovelId: number | null;
  novels: { id: number; title: string }[];
  volumesMap: Record<number, Volume[]>;
  width: number;
  selectedChapterId: number | null;
}) {
  const [previewContent, setPreviewContent] = useState('');

  const linkedNovel = novels.find((n) => n.id === linkedNovelId);
  const novelVolumes = linkedNovelId ? (volumesMap[linkedNovelId] || []) : [];

  // 所有章节平铺，带全局索引
  const allChapters = useMemo(() => {
    const chapters: { id: number; serialNumber: number; title: string }[] = [];
    for (const vol of novelVolumes) {
      for (const ch of vol.chapters) {
        chapters.push({ id: ch.id, serialNumber: ch.serialNumber, title: ch.title || '' });
      }
    }
    return chapters;
  }, [novelVolumes]);

  // 计算章节所在组
  const selectedChapterInfo = useMemo(() => {
    if (!selectedChapterId) return null;
    const ch = allChapters.find((c) => c.id === selectedChapterId);
    if (!ch) return null;
    const groupIndex = Math.floor((allChapters.indexOf(ch)) / GROUP_SIZE) + 1;
    return { ...ch, groupIndex };
  }, [selectedChapterId, allChapters]);

  const previewWordCount = useMemo(() => previewContent.replace(/\s/g, '').length, [previewContent]);

  // 加载选中章节的正文
  useEffect(() => {
    if (!selectedChapterId || !linkedNovelId) {
      setPreviewContent('');
      return;
    }
    try {
      const content = localStorage.getItem(`novel_${linkedNovelId}_chapter_${selectedChapterId}`) || '';
      setPreviewContent(content);
    } catch { setPreviewContent(''); }
  }, [selectedChapterId, linkedNovelId]);

  return (
    <div className="flex flex-col bg-white border-l border-gray-200 h-full shrink-0 overflow-hidden" style={{ width }}>
      <AreaHeader label="小说预览区" />

      {!linkedNovelId || !linkedNovel ? (
        <div className="flex-1" />
      ) : (
        <>
          {/* 章节信息行 */}
          <div className="flex items-center gap-2 px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
            {selectedChapterInfo ? (
              <>
                <span className="text-xs font-medium text-gray-500 shrink-0 bg-gray-100 px-2 py-0.5 rounded">
                  第{selectedChapterInfo.serialNumber}章
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">
                  {selectedChapterInfo.title || '无标题'}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">请从右侧小说目录选择章节</span>
            )}
          </div>

          {/* 正文预览 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-3">
              {previewContent ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{previewContent}</p>
              ) : (
                <p className="text-xs text-gray-300 text-center py-8">
                  {selectedChapterInfo ? '暂无正文内容' : '点击右侧章节序号查看正文'}
                </p>
              )}
            </div>
          </div>
          {/* 底部栏 */}
          <div className="flex items-center px-3 h-[36px] border-t border-gray-100 shrink-0 bg-white">
            <span className="text-xs text-gray-400">
              字数 <span className="text-brand font-medium">{previewWordCount}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   主组件 — ScriptEditorV2
   ═══════════════════════════════════════════ */

export default function ScriptEditorV2() {
  const navigate = useNavigate();
  const {
    novels, currentNovelId, volumesMap, setVolumesMap, setCurrentNovel, showToast,
  } = useNovelsContext();

  // 获取当前剧本
  const currentNovel = novels.find((n) => n.id === currentNovelId);
  const scriptVolumes = currentNovelId ? (volumesMap[currentNovelId] || []) : [];

  // 选中的剧本章节
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  // 选中的小说章节（用于预览）
  const [selectedNovelChapterId, setSelectedNovelChapterId] = useState<number | null>(null);

  // 选中的资料ID（资料库预览）
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  // 资料库数据
  const { materials } = useMaterials();
  const selectedMaterial = useMemo(() => materials.find((m) => m.id === selectedMaterialId) || null, [materials, selectedMaterialId]);

  // 编辑器模式（默认小说对照编辑）
  const [editorMode, setEditorMode] = useState<EditorMode>(() => {
    try { return (localStorage.getItem(EDITOR_MODE_KEY) as EditorMode) || 'dual'; } catch { return 'dual'; }
  });

  // AI助手折叠状态（按模式独立）
  const [aiCollapsed, setAiCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AI_COLLAPSED_KEYS[editorMode]) || 'false'); } catch { return false; }
  });

  // 关联的小说ID
  const [linkedNovelId, setLinkedNovelId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('sev2_linked_novel') || localStorage.getItem('script_editor_linked_novel');
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  });

  // 关联小说弹窗
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // 各栏宽度（按模式独立，localStorage 持久化）
  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS[editorMode]) || '{}'); } catch { return {}; }
  });

  // 切换模式时加载对应模式的设置
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS[editorMode]) || '{}');
      setColWidths(saved);
      const aiSaved = JSON.parse(localStorage.getItem(AI_COLLAPSED_KEYS[editorMode]) || 'false');
      setAiCollapsed(aiSaved);
    } catch {}
  }, [editorMode]);

  const handleModeChange = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
    try { localStorage.setItem(EDITOR_MODE_KEY, mode); } catch {}
  }, []);

  const widths = useMemo(() => {
    const base = {
      sDir: Math.max(MIN_WIDTH, colWidths.sDir ?? 200),
      sEdit: Math.max(MIN_WIDTH, colWidths.sEdit ?? 400),
      ai: Math.max(MIN_WIDTH, colWidths.ai ?? 260),
      nPreview: Math.max(MIN_WIDTH, colWidths.nPreview ?? 400),
      mPreview: Math.max(MIN_WIDTH, colWidths.mPreview ?? 300),
      mSidebar: Math.max(MIN_WIDTH, colWidths.mSidebar ?? 220),
    };
    if (aiCollapsed) {
      // 收起AI时，将AI区域宽度平分给编辑区和预览区
      const half = Math.floor(base.ai / 2);
      return {
        ...base,
        sEdit: base.sEdit + half,
        nPreview: base.nPreview + (base.ai - half), // 确保整数不丢失
        ai: 0,
      };
    }
    return base;
  }, [colWidths, aiCollapsed]);

  // 拖拽状态
  const dragRef = useRef<{
    leftKey: string;
    rightKey: string;
    startX: number;
    startWidths: Record<string, number>;
  } | null>(null);

  const doResize = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { leftKey, rightKey, startX, startWidths } = dragRef.current;
    const delta = e.clientX - startX;
    const newLeft = Math.max(MIN_WIDTH, startWidths[leftKey] + delta);
    if (rightKey === '__flex') {
      // 右边是 flex:1 自动填充，只调整左边栏宽度
      setColWidths((prev: Record<string, number>) => ({
        ...prev, [leftKey]: newLeft,
      }));
    } else {
      const newRight = Math.max(MIN_WIDTH, startWidths[rightKey] - delta);
      setColWidths((prev: Record<string, number>) => ({
        ...prev, [leftKey]: newLeft, [rightKey]: newRight,
      }));
    }
  }, []);

  const stopResize = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
    setColWidths((prev: Record<string, number>) => {
      try { localStorage.setItem(STORAGE_KEYS[editorMode], JSON.stringify(prev)); } catch {}
      return prev;
    });
  }, [doResize, editorMode]);

  const startResize = useCallback((leftKey: string, rightKey: string, e: React.MouseEvent) => {
    dragRef.current = { leftKey, rightKey, startX: e.clientX, startWidths: { ...widths } };
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  }, [widths, doResize, stopResize]);

  // 切换AI折叠
  const toggleAI = useCallback(() => {
    setAiCollapsed((prev: boolean) => {
      const next = !prev;
      try { localStorage.setItem(AI_COLLAPSED_KEYS[editorMode], JSON.stringify(next)); } catch {}
      return next;
    });
  }, [editorMode]);

  // 如果当前没有选中剧本作品，自动切换到第一个剧本
  useEffect(() => {
    if (!currentNovel || currentNovel.type !== 'script') {
      const firstScript = novels.find((n) => n.type === 'script');
      if (firstScript) setCurrentNovel(firstScript.id);
    }
  }, [currentNovel, novels, setCurrentNovel]);

  // 监听关联事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.novelId) setLinkedNovelId(detail.novelId);
    };
    window.addEventListener('sev2_link_novel', handler);
    return () => window.removeEventListener('sev2_link_novel', handler);
  }, []);

  // 自动选中第一个章节
  useEffect(() => {
    if (selectedChapterId === null && scriptVolumes.length > 0) {
      for (const vol of scriptVolumes) {
        if (vol.chapters.length > 0) {
          setSelectedChapterId(vol.chapters[0].id);
          break;
        }
      }
    }
  }, [scriptVolumes, selectedChapterId]);

  // 同步当前章节和小说ID到localStorage，供AIPanel读取
  useEffect(() => {
    if (currentNovelId) {
      try { localStorage.setItem('current_novel_id', String(currentNovelId)); } catch {}
    }
  }, [currentNovelId]);
  useEffect(() => {
    if (selectedChapterId) {
      try { localStorage.setItem('current_chapter_id', String(selectedChapterId)); } catch {}
    }
  }, [selectedChapterId]);
  // 同步关联小说ID到localStorage，供AIPanel读取
  useEffect(() => {
    if (linkedNovelId) {
      try { localStorage.setItem('sev2_linked_novel', String(linkedNovelId)); } catch {}
    }
  }, [linkedNovelId]);

  const handleSelectChapter = useCallback((chapterId: number) => {
    setSelectedChapterId(chapterId);
    if (currentNovelId) {
      setVolumesMap((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        for (const vol of copy[currentNovelId] || []) {
          for (const ch of vol.chapters) {
            ch.isSelected = ch.id === chapterId;
          }
        }
        return copy;
      });
    }
  }, [currentNovelId, setVolumesMap]);

  const handleAddVolume = useCallback(() => {
    if (!currentNovelId) return;
    // 计算已有卷的数量（排除集纲），从第五卷开始命名
    const existingVolCount = scriptVolumes.filter((v: Volume) => v.name !== '集纲').length;
    const newVol: Volume = {
      id: Date.now(),
      name: `第${toChineseNumber(existingVolCount + 1)}卷`,
      isExpanded: true,
      chapters: [],
    };
    setVolumesMap((prev) => ({
      ...prev,
      [currentNovelId]: [...(prev[currentNovelId] || []), newVol],
    }));
    showToast('新增成功', '新卡已创建');
  }, [currentNovelId, scriptVolumes.length, setVolumesMap, showToast]);

  const handleAddChapter = useCallback((volumeId: number) => {
    if (!currentNovelId) return;
    setVolumesMap((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      for (const vol of copy[currentNovelId] || []) {
        if (vol.id === volumeId) {
          const isJigang = vol.name === '集纲';
          let nextNum: number;
          let defaultTitle: string;
          if (isJigang) {
            // 集纲卷：只统计集纲卷内的章节序号
            const existingNums = new Set<number>();
            vol.chapters.forEach((c: Chapter) => existingNums.add(c.serialNumber));
            nextNum = 1;
            while (existingNums.has(nextNum)) nextNum++;
            defaultTitle = `集纲${nextNum}`;
          } else {
            // 普通卷：只统计所有普通卷（非集纲）的章节序号，与集纲互不干扰
            const existingNums = new Set<number>();
            (copy[currentNovelId] || []).forEach((v: Volume) => {
              if (v.name !== '集纲') {
                v.chapters.forEach((c: Chapter) => existingNums.add(c.serialNumber));
              }
            });
            nextNum = 1;
            while (existingNums.has(nextNum)) nextNum++;
            defaultTitle = '';
          }
          const newCh: Chapter = {
            id: Date.now(),
            title: defaultTitle,
            serialNumber: nextNum,
            wordCount: 0,
            isSelected: true,
            isPublished: false,
          };
          vol.chapters.push(newCh);
          vol.chapters.forEach((c: Chapter) => { c.isSelected = c.id === newCh.id; });
          break;
        }
      }
      return copy;
    });
    showToast('新增成功', '新集已创建');
  }, [currentNovelId, setVolumesMap, showToast]);

  const handleDeleteChapter = useCallback((volumeId: number, chapterId: number) => {
    if (!currentNovelId) return;
    setVolumesMap((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      for (const vol of copy[currentNovelId] || []) {
        if (vol.id === volumeId) {
          vol.chapters = vol.chapters.filter((c: Chapter) => c.id !== chapterId);
          break;
        }
      }
      return copy;
    });
    if (selectedChapterId === chapterId) setSelectedChapterId(null);
    showToast('删除成功', '集已删除');
  }, [currentNovelId, setVolumesMap, selectedChapterId, showToast]);

  const handleToggleVolume = useCallback((volumeId: number) => {
    if (!currentNovelId) return;
    setVolumesMap((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      for (const vol of copy[currentNovelId] || []) {
        if (vol.id === volumeId) { vol.isExpanded = !vol.isExpanded; break; }
      }
      return copy;
    });
  }, [currentNovelId, setVolumesMap]);

  const handleUnlink = useCallback(() => {
    setLinkedNovelId(null);
    try {
      localStorage.removeItem('sev2_linked_novel');
      localStorage.removeItem('script_editor_linked_novel');
    } catch {}
  }, []);

  const handleLink = useCallback((novelId: number) => {
    setLinkedNovelId(novelId);
    try { localStorage.setItem('sev2_linked_novel', String(novelId)); } catch {}
  }, []);

  const handleExit = () => navigate('/scripts');

  const novelOptions = useMemo(() => novels.filter((n) => n.id !== linkedNovelId && n.type === 'novel'), [novels, linkedNovelId]);
  const linkedNovel = novels.find((n) => n.id === linkedNovelId);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 px-4 h-[44px] bg-white border-b border-gray-200 shrink-0">
        {/* 导航按钮 — 暂时隐藏 */}
        <div className="hidden"><NavigationMenuButton /></div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>退出</span>
        </button>
        <div className="w-px h-4 bg-gray-200" />
        {currentNovel && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 shrink-0">剧本名：</span>
            <span className="px-2 py-1 text-xs font-bold text-brand border border-brand rounded truncate max-w-[200px]">
              {currentNovel.title}
            </span>
          </div>
        )}

        {/* 中间 — 编辑器模式切换按钮 */}
        <div className="flex-1 flex items-center justify-center gap-2"
        >
          {(['dual', 'browser', 'script'] as EditorMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                editorMode === mode
                  ? 'text-white bg-brand font-medium'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* 右侧 — 关联小说 */}
        {linkedNovel ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">关联书名：</span>
            <span className="px-2 py-1 text-xs font-bold text-brand border border-brand rounded truncate" style={{ maxWidth: 280 }}>{linkedNovel.title}</span>
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="px-3 py-1 text-xs text-brand border border-brand rounded hover:bg-brand-light transition-colors"
            >
              更换关联
            </button>
            <button
              onClick={handleUnlink}
              className="px-2 py-1 text-xs text-red-500 border border-red-500 rounded hover:bg-red-50 transition-colors"
            >
              断开关联
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> 关联小说
          </button>
        )}
      </div>

      {/* 主体 — 根据模式渲染不同布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========== 小说对照编辑（完整五栏）========== */}
        {editorMode === 'dual' && (
          <>
            {/* 1. 剧本目录 */}
            <ScriptSidebar
              volumes={scriptVolumes}
              selectedChapterId={selectedChapterId}
              onSelectChapter={handleSelectChapter}
              onAddVolume={handleAddVolume}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
              onToggleVolume={handleToggleVolume}
              width={widths.sDir}
            />
            <DragHandle onDragStart={(e) => startResize('sDir', 'sEdit', e)} />
            {/* 2. 剧本编辑区 */}
            <ScriptEditorArea
              chapterId={selectedChapterId}
              novelId={currentNovelId || 0}
              volumes={scriptVolumes}
              width={widths.sEdit}
              aiCollapsed={aiCollapsed}
              onToggleAI={toggleAI}
              onDeleteChapter={(chId) => {
                if (!currentNovelId) return;
                for (const vol of scriptVolumes) {
                  if (vol.chapters.find((c) => c.id === chId)) {
                    handleDeleteChapter(vol.id, chId);
                    break;
                  }
                }
              }}
            />
            {/* 分隔线2 */}
            {aiCollapsed ? (
              <DragHandle onDragStart={(e) => startResize('sEdit', 'nPreview', e)} />
            ) : (
              <DragHandle onDragStart={(e) => startResize('sEdit', 'ai', e)} />
            )}
            {/* 3. AI助手区 */}
            {!aiCollapsed && (
              <>
                <div className="flex flex-col bg-white h-full shrink-0 overflow-hidden" style={{ width: widths.ai }}>
                  <AreaHeader label="AI 助手" />
                  <div className="flex-1 overflow-hidden">
                    <AIPanel width={widths.ai} className="border-l-0" selectedNovelChapterId={selectedNovelChapterId} />
                  </div>
                </div>
                <DragHandle onDragStart={(e) => startResize('ai', 'nPreview', e)} />
              </>
            )}
            {/* 4. 小说预览区 */}
            <NovelPreviewArea
              linkedNovelId={linkedNovelId}
              novels={novels}
              volumesMap={volumesMap}
              width={widths.nPreview}
              selectedChapterId={selectedNovelChapterId}
            />
            <DragHandle onDragStart={(e) => startResize('nPreview', '__flex', e)} />
            {/* 5. 小说目录区 */}
            <NovelSidebar
              linkedNovelId={linkedNovelId}
              volumesMap={volumesMap}
              novels={novels}
              selectedChapterId={selectedNovelChapterId}
              onSelectChapter={setSelectedNovelChapterId}
            />
          </>
        )}

        {/* ========== 纯剧本编辑（五栏：目录+编辑+AI+资料预览+资料库侧边栏）========== */}
        {editorMode === 'script' && (
          <>
            <ScriptSidebar
              volumes={scriptVolumes}
              selectedChapterId={selectedChapterId}
              onSelectChapter={handleSelectChapter}
              onAddVolume={handleAddVolume}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
              onToggleVolume={handleToggleVolume}
              width={widths.sDir}
            />
            <DragHandle onDragStart={(e) => startResize('sDir', 'sEdit', e)} />
            <ScriptEditorArea
              chapterId={selectedChapterId}
              novelId={currentNovelId || 0}
              volumes={scriptVolumes}
              width={widths.sEdit}
              aiCollapsed={aiCollapsed}
              onToggleAI={toggleAI}
              onDeleteChapter={(chId) => {
                if (!currentNovelId) return;
                for (const vol of scriptVolumes) {
                  if (vol.chapters.find((c) => c.id === chId)) {
                    handleDeleteChapter(vol.id, chId);
                    break;
                  }
                }
              }}
            />
            {!aiCollapsed && (
              <>
                <DragHandle onDragStart={(e) => startResize('sEdit', 'ai', e)} />
                <div className="flex flex-col bg-white h-full shrink-0 overflow-hidden" style={{ width: widths.ai }}>
                  <AreaHeader label="AI 助手" />
                  <div className="flex-1 overflow-hidden">
                    <AIPanel width={widths.ai} className="border-l-0" selectedNovelChapterId={selectedNovelChapterId} />
                  </div>
                </div>
              </>
            )}
            {/* 资料预览区 */}
            {aiCollapsed ? (
              <DragHandle onDragStart={(e) => startResize('sEdit', 'mPreview', e)} />
            ) : (
              <DragHandle onDragStart={(e) => startResize('ai', 'mPreview', e)} />
            )}
            <MaterialPreviewArea material={selectedMaterial} width={widths.mPreview} />
            <DragHandle onDragStart={(e) => startResize('mPreview', 'mSidebar', e)} />
            <MaterialSidebar
              onSelectMaterial={setSelectedMaterialId}
              width={widths.mSidebar}
              selectedMaterialId={selectedMaterialId}
            />
          </>
        )}

        {/* ========== 浏览器编辑（两栏：目录+编辑区最大化）========== */}
        {editorMode === 'browser' && (
          <>
            <ScriptSidebar
              volumes={scriptVolumes}
              selectedChapterId={selectedChapterId}
              onSelectChapter={handleSelectChapter}
              onAddVolume={handleAddVolume}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
              onToggleVolume={handleToggleVolume}
              width={widths.sDir}
            />
            <DragHandle onDragStart={(e) => startResize('sDir', 'sEdit', e)} />
            <ScriptEditorArea
              chapterId={selectedChapterId}
              novelId={currentNovelId || 0}
              volumes={scriptVolumes}
              width={widths.sEdit}
              aiCollapsed={true}
              onToggleAI={() => {}}
              onDeleteChapter={(chId) => {
                if (!currentNovelId) return;
                for (const vol of scriptVolumes) {
                  if (vol.chapters.find((c) => c.id === chId)) {
                    handleDeleteChapter(vol.id, chId);
                    break;
                  }
                }
              }}
            />
          </>
        )}
      </div>

      {/* 关联小说弹窗 */}
      <LinkNovelModal
        isOpen={isLinkModalOpen}
        novels={novelOptions}
        onLink={(novelId) => { handleLink(novelId); setIsLinkModalOpen(false); }}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </div>
  );
}
