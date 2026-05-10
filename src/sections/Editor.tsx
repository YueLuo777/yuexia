import { useState, useEffect, useRef } from 'react';
import AIGenerateModal from './AIGenerateModal';
import AIEraseModal from './AIEraseModal';
import SmartFormatModal from './SmartFormatModal';
import { useNovelsContext } from '@/hooks/useNovels';
import type { FormatOptions } from './SmartFormatModal';
import { applyFormat, defaultFormatOptions } from './SmartFormatModal';
import HighFreqModal from './HighFreqModal';
import FontSettingsModal, { getStoredFontSettings } from './FontSettingsModal';
import type { FontSettings } from './FontSettingsModal';
import ChapterAssociateModal from './ChapterAssociateModal';
import type { GenerateMode } from './AIGenerateModal';
import HistoryModal, { saveSnapshot } from './HistoryModal';
import TitleOptimizeModal from './TitleOptimizeModal';
import {
  Undo2, Redo2, Copy, Wand2, BarChart3, History, Trash2, Settings, ChevronDown,
  Sparkles as SparklesIcon, AlertTriangle,
} from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface EditorProps {
  onSwitchToWorkInfo?: () => void;
  onSwitchToWorkbench?: () => void;
}

interface AIButtonItem {
  id: string;
  label: string;
  mode?: GenerateMode;
  onClick?: () => void;
}

/* ─── 4. 高频词高亮 Overlay 组件 ─── */
function HighlightOverlay({ content, fontFamily, fontSize, lineHeight }: {
  content: string; fontFamily: string; fontSize: number; lineHeight: number;
}) {
  const [words, setWords] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('high_freq_words');
      const en = localStorage.getItem('high_freq_enabled');
      if (saved) setWords(JSON.parse(saved));
      if (en) setEnabled(JSON.parse(en));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('high_freq_words');
        const en = localStorage.getItem('high_freq_enabled');
        if (saved) setWords(JSON.parse(saved));
        if (en) setEnabled(JSON.parse(en));
      } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!enabled || words.length === 0 || !content) return null;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const lines = content.split('\n');

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words p-6"
      style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight }}
    >
      {lines.map((line, li) => {
        const parts = line.split(regex);
        return (
          <span key={li}>
            {parts.map((part, pi) => {
              if (words.includes(part)) {
                // 高亮词：只显示黄色背景（无padding避免超出），文字透明（由textarea显示）
                return (
                  <span key={pi} className="bg-amber-100 text-transparent rounded-sm">{part}</span>
                );
              }
              // 非高亮词：完全透明
              return <span key={pi} className="text-transparent">{part}</span>;
            })}
            {li < lines.length - 1 ? '\n' : null}
          </span>
        );
      })}
    </div>
  );
}

/* ─── 3. 高频词高亮开关按钮 ─── */
function HighFreqToggle() {
  const [enabled, setEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('high_freq_enabled') || 'false'); } catch { return false; }
  });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem('high_freq_enabled', JSON.stringify(next)); } catch {}
    // 触发storage事件通知overlay更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'high_freq_enabled' }));
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center justify-center px-2 py-1.5 text-xs transition-colors ${
        enabled ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'
      }`}
      title={enabled ? '高亮已启用，点击关闭' : '高亮未启用，点击开启'}
    >
      <div className={`w-7 h-4 rounded-full relative transition-colors ${enabled ? 'bg-amber-400' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}


/* ─── 删除章节确认弹窗 ─── */
function DeleteConfirmModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);
  if (!isOpen) return null;
  return (
    <div ref={backdropRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[380px] bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">确认删除</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">是否将该章节删除到回收站？删除后可在回收站中恢复。</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onConfirm} className="px-5 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">确认删除</button>
        </div>
      </div>
    </div>
  );
}

export default function Editor({ onSwitchToWorkInfo: _, onSwitchToWorkbench: _onSwitchToWorkbench }: EditorProps) {
  const { volumes, saveChapterContent, loadChapterContent, updateChapterTitle, updateChapterSerialNumber, getChapterWordCount, currentNovelId, deleteChapter } = useNovelsContext();
  const [modalMode, setModalMode] = useState<GenerateMode | null>(null);
  const [isSmartFormatOpen, setIsSmartFormatOpen] = useState(false);
  const [isHighFreqOpen, setIsHighFreqOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTitleOptimizeModalOpen, setIsTitleOptimizeModalOpen] = useState(false);
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);

  // 4. 智能排版设置（所有作品默认启用）
  const [smartFormatSettings, setSmartFormatSettings] = useState<FormatOptions>(() => {
    const defaults = { indent: true, mergeParagraphs: true, smartBreak: false, sentencesPerLine: 3 };
    try { const s = localStorage.getItem('smart_format_settings'); return s ? JSON.parse(s) : { ...defaults }; } catch { return { ...defaults }; }
  });

  // AI按钮列表
  const [aiButtons] = useState<AIButtonItem[]>([
    { id: 'ai-continue', label: '续写', mode: 'continue' },
  ]);

  const selectedVol = volumes.find((v) => v.chapters.some((c) => c.isSelected));
  const selectedChapter = selectedVol?.chapters.find((c) => c.isSelected);

  const [chapterTitle, setChapterTitle] = useState(selectedChapter?.title || '');
  const [content, setContent] = useState('');
  const prevContentRef = useRef('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 4. 实时保存状态
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 智能排版开关状态（从 localStorage 读取，激活开关已移除）
  const smartFormatEnabled = (() => {
    try { return JSON.parse(localStorage.getItem('smart_format_enabled') || 'false'); } catch { return false; }
  })();

  useEffect(() => { if (selectedChapter) setChapterTitle(selectedChapter.title); }, [selectedChapter?.id]);

  // 监听章节删除事件，清空编辑器内容
  useEffect(() => {
    const handleChapterDeleted = () => {
      setContent('');
      setChapterTitle('');
    };
    window.addEventListener('chapter_deleted', handleChapterDeleted);
    return () => window.removeEventListener('chapter_deleted', handleChapterDeleted);
  }, []);

  // 从 chapter 对象或 localStorage 加载保存的内容
  useEffect(() => {
    if (selectedChapter) {
      // 保存当前章节ID到localStorage，供AIPanel使用
      try {
        localStorage.setItem('current_novel_id', String(currentNovelId));
        localStorage.setItem('current_chapter_id', String(selectedChapter.id));
      } catch { /* ignore */ }
      // 优先从 chapter 对象读取（智能导入时直接嵌入）
      let saved = selectedChapter.content || null;
      // 如果没有嵌入内容，从 localStorage 读取
      if (!saved) {
        saved = loadChapterContent(selectedChapter.id);
      }
      if (saved) {
        setContent(saved);
      } else {
        // 空白章节默认自动首行缩进
        const initText = '\u3000\u3000';
        setContent(initText);
        saveChapterContent(selectedChapter.id, initText);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(initText.length, initText.length);
          }
        });
      }
    }
  }, [selectedChapter?.id]);

  // 自动排版工具函数
  const autoFormatIfEnabled = (text: string, cursorPos: number): { text: string; cursorPos: number } => {
    try {
      if (smartFormatEnabled) {
        const settings = { ...defaultFormatOptions, ...smartFormatSettings };
        const formatted = applyFormat(text, settings);
        if (formatted !== text) {
          // 用光标前的文本特征来恢复光标位置
          const anchor = text.slice(Math.max(0, cursorPos - 10), cursorPos);
          const newPos = formatted.indexOf(anchor);
          if (newPos >= 0) {
            return { text: formatted, cursorPos: newPos + anchor.length };
          }
          // fallback: 按比例估算
          const ratio = cursorPos / text.length;
          return { text: formatted, cursorPos: Math.round(ratio * formatted.length) };
        }
      }
    } catch {}
    return { text, cursorPos };
  };

  // 执行保存（提取为共用函数）
  const doSave = (newText: string) => {
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (selectedChapter) {
      const oldContent = loadChapterContent(selectedChapter.id) || '';
      if (oldContent && oldContent !== newText) {
        saveSnapshot(selectedChapter.id, oldContent);
      }
      saveChapterContent(selectedChapter.id, newText);
      window.dispatchEvent(new CustomEvent('chapter_content_saved', { detail: { chapterId: selectedChapter.id } }));
    }
    saveTimerRef.current = setTimeout(() => setSaveState('saved'), 500);
  };

  // 内容变化时直接保存到localStorage
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursorPos = e.target.selectionStart;
    let newText = e.target.value;

    // 智能排版：激活时自动排版并恢复光标
    const result = autoFormatIfEnabled(newText, cursorPos);
    if (result.text !== newText) {
      newText = result.text;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
        }
      });
    }

    setContent(newText);
    prevContentRef.current = content;
    doSave(newText);
  };

  // 粘贴处理：自动为首行缩进
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentText = content;

    // 插入粘贴内容
    let newText = currentText.substring(0, start) + pastedText + currentText.substring(end);

    // 自动首行缩进：给没有缩进的非空段落添加两个全角空格
    const lines = newText.split('\n');
    const indentedLines = lines.map((line) => {
      if (line.trim() && !line.startsWith('\u3000\u3000')) {
        return '\u3000\u3000' + line;
      }
      return line;
    });
    newText = indentedLines.join('\n');

    const newCursorPos = start + pastedText.length + (indentedLines.length - lines.length) * 2;

    setContent(newText);
    prevContentRef.current = currentText;
    doSave(newText);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const [copyToast, setCopyToast] = useState<{show: boolean; msg: string}>({ show: false, msg: '' });
  const [isFontSettingsOpen, setIsFontSettingsOpen] = useState(false);
  const [fontSettings, setFontSettings] = useState<FontSettings>(getStoredFontSettings);
  const [isChapterAssociateOpen, setIsChapterAssociateOpen] = useState(false);
  const [associatedChapters, setAssociatedChapters] = useState<number[]>([]);

  // 监听AIPanel发出的打开关联弹窗事件
  useEffect(() => {
    const handler = () => setIsChapterAssociateOpen(true);
    window.addEventListener('open_chapter_associate', handler);
    return () => window.removeEventListener('open_chapter_associate', handler);
  }, []);

  const showCopyToast = (msg: string) => {
    setCopyToast({ show: true, msg });
  };
  const hideCopyToast = () => setCopyToast({ show: false, msg: '' });

  const handleUndo = () => { setContent(prevContentRef.current || ''); };
  const handleRedo = () => {}; // redo 暂不可用
  const handleCopyTitle = async () => { try { await navigator.clipboard.writeText(chapterTitle); showCopyToast('已复制标题'); } catch {} };
  const handleCopyContent = async () => {
    try {
      // 去掉第一段的首行缩进（四个全角空格或制表符或普通空格）
      const lines = content.split('\n');
      if (lines.length > 0) {
        lines[0] = lines[0].replace(/^[\s\t\u3000]+/, '');
      }
      await navigator.clipboard.writeText(lines.join('\n'));
      showCopyToast('已复制正文');
    } catch {}
  };
  const handleSmartFormat = (formatted: string, settings?: FormatOptions) => {
    setContent(formatted);
    if (selectedChapter) saveChapterContent(selectedChapter.id, formatted);
    if (settings) {
      setSmartFormatSettings(settings);
      try { localStorage.setItem('smart_format_settings', JSON.stringify(settings)); } catch {}
    }
  };

  const handleClear = () => setIsClearConfirmOpen(true);

  // focus时不做自动排版，光标位置保持正常
  const handleFocus = (_e: React.FocusEvent<HTMLTextAreaElement>) => {};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      // 换行后自动添加首行缩进（两个全角空格）
      const indent = '\u3000\u3000';
      let newText = content.substring(0, start) + '\n' + indent + content.substring(end);
      const newCursorPos = start + 1 + indent.length;

      // 智能排版：激活时自动排版并恢复光标
      const result = autoFormatIfEnabled(newText, newCursorPos);
      if (result.text !== newText) {
        newText = result.text;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
          }
        });
      } else {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        });
      }

      setContent(newText);
      prevContentRef.current = content;
      if (selectedChapter) {
        saveChapterContent(selectedChapter.id, newText);
        window.dispatchEvent(new CustomEvent('chapter_content_saved', { detail: { chapterId: selectedChapter.id } }));
      }
    }
  };
  const confirmClear = () => {
    if (selectedVol && selectedChapter) {
      deleteChapter(selectedVol.id, selectedChapter.id);
    }
    setIsClearConfirmOpen(false);
  };

  const openModal = (mode: GenerateMode) => setModalMode(mode);
  const closeModal = () => setModalMode(null);

  const volDisplay = selectedVol ? `${selectedVol.name}` : '第一卷';
  const chapterNum = selectedChapter?.serialNumber || 1;

  return (
    <main className="flex-1 flex flex-col bg-gray-50 min-w-0">
      {/* 顶部行：编辑章节 + AI功能按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="px-3 py-1 text-sm font-bold text-gray-900">编辑章节</span>
        <div className="flex items-center gap-2">
          {aiButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => { if (btn.mode) openModal(btn.mode); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-brand rounded-full hover:bg-brand-dark transition-colors shrink-0"
            >
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200">
        {/* 第一卷 - 带边框和dropdown */}
        <div className="flex items-center gap-0.5 px-2 py-1 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <span className="font-medium text-gray-700">{volDisplay}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <span className="text-gray-300">·</span>
        {/* 第X章 - 可编辑序号 */}
        <div className="flex items-center gap-0.5 px-2 py-1 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <span className="font-medium text-gray-700">第</span>
          <input
            type="text"
            inputMode="numeric"
            value={chapterNum}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val > 0 && selectedChapter) {
                updateChapterSerialNumber(selectedChapter.id, val);
              }
            }}
            className="w-8 text-center font-medium text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
          />
          <span className="font-medium text-gray-700">章</span>
        </div>
        <span className="text-gray-300">·</span>
        {/* 章节标题输入框 - 加边框，320px宽度 */}
        <input
          type="text"
          value={chapterTitle}
          onChange={(e) => { const v = e.target.value.slice(0, 20); setChapterTitle(v); if (selectedChapter) updateChapterTitle(selectedChapter.id, v); }}
          maxLength={20}
          placeholder="请输入章节标题"
          className="px-3 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand bg-white"
          style={{ width: '320px' }}
        />
        {/* 字数统计 */}
        <span className="text-xs text-gray-400">{chapterTitle.length}/20</span>
        {/* 复制标题 - brand 色 */}
        <button
          onClick={handleCopyTitle}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-brand text-brand hover:bg-brand-light transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>复制标题</span>
        </button>
        {/* 标题优化 */}
        <button
          onClick={() => setIsTitleOptimizeModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shrink-0"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>标题优化</span>
        </button>
      </div>

      {/* 编辑器工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        {/* 撤销 */}
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-gray-300 cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>撤销</span>
        </button>
        {/* 恢复 */}
        <button
          onClick={handleRedo}
          disabled={true}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors text-gray-300 cursor-not-allowed"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>恢复</span>
        </button>

        {/* 分隔 */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* 字体设置 */}
        <button
          onClick={() => setIsFontSettingsOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-brand text-brand hover:bg-brand-light transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>字体设置</span>
        </button>

        {/* 智能排版 - brand 色，带下拉箭头 + 开关 */}
        <div className="flex items-center rounded-md border border-brand overflow-hidden">
          <button
            onClick={() => handleSmartFormat(applyFormat(content, { ...defaultFormatOptions, ...smartFormatSettings }), smartFormatSettings)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand hover:bg-brand-light transition-colors"
            title="立即执行排版"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>一键排版</span>
          </button>
          <div className="w-px h-4 bg-brand/30" />
          <button
            onClick={() => setIsSmartFormatOpen(true)}
            className="flex items-center justify-center px-1.5 py-1.5 text-brand hover:bg-brand-light transition-colors"
            title="打开排版设置"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 高频词 - brand色 + 开关 */}
        <div className="flex items-center rounded-md border border-brand overflow-hidden">
          <button
            onClick={() => setIsHighFreqOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand hover:bg-brand-light transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>高频词</span>
          </button>
          <div className="w-px h-4 bg-brand/30" />
          <HighFreqToggle />
        </div>

        {/* 分隔 */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* 复制正文 - brand 色 */}
        <button
          onClick={handleCopyContent}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-brand text-brand hover:bg-brand-light transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>复制正文</span>
        </button>

        {/* 历史 - brand色 */}
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-brand text-brand hover:bg-brand-light transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>历史</span>
        </button>

        {/* 删除 - 红色 */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除</span>
        </button>

        {/* 分隔 */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* 发布 */}
        <div className="ml-auto">
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-orange-400 text-orange-500 hover:bg-orange-50 transition-colors"
          >
            <span>发布</span>
          </button>
        </div>
      </div>
      {/* 正文编辑区 - 最大的白色区域，顶部浅灰线，带高亮overlay */}
      <div className="flex-1 bg-white border-t border-gray-100 relative">
        <div className="w-full h-full relative">
          {/* 4. 高亮overlay层 - 与textarea完全重合 */}
          <HighlightOverlay
            content={content}
            fontFamily={fontSettings.fontFamily}
            fontSize={fontSettings.fontSize}
            lineHeight={fontSettings.lineHeight}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            className="w-full h-full resize-none outline-none bg-transparent relative z-10 p-6 overflow-y-auto editor-scrollbar"
            style={{
              fontFamily: fontSettings.fontFamily,
              color: fontSettings.fontColor,
              caretColor: fontSettings.fontColor,
              fontSize: `${fontSettings.fontSize}px`,
              lineHeight: fontSettings.lineHeight,
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* 底部信息栏 - 截图格式 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-100">
        <span className="text-xs text-gray-400">
          字数 <span className="text-brand font-medium">{selectedChapter ? getChapterWordCount(selectedChapter.id) : 0}</span> · {saveState === 'saving' ? <span className="text-green-600 font-medium">保存中</span> : saveState === 'saved' ? <span className="text-green-600">已保存</span> : <span>已保存</span>}
        </span>
        {associatedChapters.length > 0 && (
          <span className="text-xs text-gray-500">
            已关联 <span className="text-brand font-medium">{associatedChapters.length}</span> 章
          </span>
        )}
      </div>

      {/* 弹窗 */}
      {modalMode && <AIGenerateModal isOpen={true} onClose={closeModal} mode={modalMode} />}
      <AIEraseModal isOpen={isEraseModalOpen} onClose={() => setIsEraseModalOpen(false)} />
      <SmartFormatModal isOpen={isSmartFormatOpen} onClose={() => setIsSmartFormatOpen(false)} onApply={handleSmartFormat} currentText={content} settings={smartFormatSettings} />
      <HighFreqModal isOpen={isHighFreqOpen} onClose={() => setIsHighFreqOpen(false)} />
      <DeleteConfirmModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={confirmClear} />

      {/* 字体设置弹窗 */}
      <FontSettingsModal
        isOpen={isFontSettingsOpen}
        onClose={() => setIsFontSettingsOpen(false)}
        settings={fontSettings}
        onChange={setFontSettings}
      />

      {/* 关联章节弹窗 */}
      <ChapterAssociateModal
        isOpen={isChapterAssociateOpen}
        onClose={() => setIsChapterAssociateOpen(false)}
        chapters={volumes.flatMap((v) => v.chapters).map((ch) => ({
          id: ch.id,
          serialNumber: ch.serialNumber,
          wordCount: ch.wordCount,
        }))}
        onAssociate={(ids) => {
          setAssociatedChapters(ids);
          // 保存关联章节ID到localStorage，供AIPanel使用
          try {
            localStorage.setItem('associated_chapters', JSON.stringify(ids));
            localStorage.setItem('associated_chapters_novelId', String(currentNovelId));
          } catch {}
          window.dispatchEvent(new CustomEvent('chapter_associate_updated'));
        }}
      />

      {/* 2. 历史版本弹窗 */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        chapterId={selectedChapter?.id || 0}
        onRestore={(content) => { setContent(content); if (selectedChapter) saveChapterContent(selectedChapter.id, content); }}
      />

      {/* 3. AI 标题优化弹窗 */}
      <TitleOptimizeModal
        isOpen={isTitleOptimizeModalOpen}
        onClose={() => setIsTitleOptimizeModalOpen(false)}
        currentChapterSerial={chapterNum}
      />

      {/* 复制提示 Toast */}
      {copyToast.show && (
        <div
          onClick={hideCopyToast}
          className="fixed bottom-6 right-6 z-[70] px-4 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg cursor-pointer animate-in slide-in-from-bottom-2 fade-in"
        >
          {copyToast.msg}
        </div>
      )}
    </main>
  );
}
