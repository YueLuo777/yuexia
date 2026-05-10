import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import Editor from './Editor';
import WorkbenchInfo from './WorkbenchInfo';
import SettingsData from './SettingsData';
import Outline from './Outline';
import WritingNotes from './WritingNotes';
import AIPanel from './AIPanel';
import PublishedSidebar from './PublishedSidebar';
import ScriptEditorV2 from './ScriptEditorV2';
import ExtractPlotModal from './ExtractPlotModal';
import { useNovelsContext } from '@/hooks/useNovels';

/* ─── 通用弹窗组件 ─── */
function CenterModal({ title, isOpen, onClose, headerRight, headerFarRight, children, widthClass = 'w-[600px]' }: { title: string; isOpen: boolean; onClose: () => void; headerRight?: React.ReactNode; headerFarRight?: React.ReactNode; children: React.ReactNode; widthClass?: string }) {
  if (!isOpen) return null;

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [isOpen, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className={`flex flex-col ${widthClass} max-w-[98vw] h-[85vh] max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {headerRight}
          </div>
          <div className="flex items-center gap-2">
            {headerFarRight}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="关闭 (Esc)">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function WorkbenchLayout() {
  const { toast, novels, currentNovelId } = useNovelsContext();
  
  // 获取当前作品类型
  const currentNovel = novels.find((n) => n.id === currentNovelId);
  const workType: 'novel' | 'script' = currentNovel?.type || 'novel';
  
  // 已发布导航展开状态：从 localStorage 恢复（按作品类型隔离）
  const [showPublished, setShowPublished] = useState(() => {
    try {
      const saved = localStorage.getItem(`workbench_show_published_${workType}`);
      return saved ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [aiPanelWidth, setAiPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_panel_width');
      return saved ? parseInt(saved, 10) : 290;
    } catch {
      return 290;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(290);

  // 弹窗状态
  const [modals, setModals] = useState({
    workinfo: false,
    settings: false,
    outline: false,
    notes: false,
    extractPlot: false,
  });

  // 设定库标签状态（从 localStorage 恢复）
  const [settingsTab, setSettingsTab] = useState<'角色' | '设定' | '伏笔'>(() => {
    try { return (localStorage.getItem('settings_last_tab') as '角色' | '设定' | '伏笔') || '角色'; } catch { return '角色'; }
  });
  // 概要库标签状态
  const [outlineTab, setOutlineTab] = useState<'章节概要' | '卷概要'>('章节概要');

  // 标签切换时持久化
  useEffect(() => { localStorage.setItem('settings_last_tab', settingsTab); }, [settingsTab]);

  const openModal = (key: keyof typeof modals) => {
    if (key === 'settings') setSettingsTab('角色');
    if (key === 'outline') setOutlineTab('章节概要');
    setModals((prev) => ({ ...prev, [key]: true }));
  };
  const closeModal = (key: keyof typeof modals) => setModals((prev) => ({ ...prev, [key]: false }));

  const handleSelectChapter = () => {};

  // 当作品切换时：剧本强制隐藏已发布，小说保持上次状态
  useEffect(() => {
    if (workType === 'script') {
      setShowPublished(false);
    }
  }, [workType]);

  // showPublished 变化时持久化到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`workbench_show_published_${workType}`, String(showPublished));
    } catch { /* ignore */ }
  }, [showPublished, workType]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = aiPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [aiPanelWidth]);

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = dragStartX.current - e.clientX;
      const newWidth = Math.max(200, Math.min(600, dragStartWidth.current + deltaX));
      setAiPanelWidth(newWidth);
    };
    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('ai_panel_width', String(aiPanelWidth));
      } catch { /* ignore */ }
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, aiPanelWidth]);

  // 剧本类型使用新剧本编辑器V2
  if (workType === 'script') {
    return <ScriptEditorV2 />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        onOpenWorkInfo={() => openModal('workinfo')}
        onOpenSettings={() => openModal('settings')}
        onOpenOutline={() => openModal('outline')}
        onOpenNotes={() => openModal('notes')}
        onOpenExtractPlot={() => openModal('extractPlot')}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSelectChapter={handleSelectChapter} onTogglePublished={() => setShowPublished((p) => !p)} showPublished={showPublished} />
        {showPublished && <PublishedSidebar />}
        <Editor onSwitchToWorkInfo={() => openModal('workinfo')} onSwitchToWorkbench={() => {}} />
        {/* 拖拽手柄 */}
        <div
          className="w-[4px] bg-transparent hover:bg-brand/30 cursor-ew-resize shrink-0 z-10 transition-colors flex items-center justify-center group"
          onMouseDown={handleDragStart}
          title="拖拽调整宽度"
        >
          <div className="w-[2px] h-8 bg-gray-300 rounded-full group-hover:bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <AIPanel width={aiPanelWidth} />
      </div>

      {/* 弹窗 */}
      <CenterModal title="作品信息" isOpen={modals.workinfo} onClose={() => closeModal('workinfo')}>
        <WorkbenchInfo />
      </CenterModal>
      <CenterModal
        title="设定库"
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        widthClass="w-[1050px]"
        headerRight={(
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-2">
            {(['角色', '设定', '伏笔'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSettingsTab(tab)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  settingsTab === tab
                    ? 'text-white bg-brand font-medium shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      >
        <SettingsData activeTab={settingsTab} />
      </CenterModal>
      <CenterModal
        title="概要库"
        isOpen={modals.outline}
        onClose={() => closeModal('outline')}
        widthClass="w-[1050px]"
        headerRight={(
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-2">
            {(['章节概要', '卷概要'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setOutlineTab(tab)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  outlineTab === tab
                    ? 'text-white bg-brand font-medium shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      >
        <Outline activeTab={outlineTab} />
      </CenterModal>
      <CenterModal title="备忘录" isOpen={modals.notes} onClose={() => closeModal('notes')} widthClass="w-[1050px]"
        headerFarRight={(
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open_memo_trash'))}
            className="flex items-center gap-1 text-xs text-red-500 border border-red-300 hover:border-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            回收站
          </button>
        )}
      >
        <WritingNotes />
      </CenterModal>

      {/* 提炼剧情弹窗 */}
      <ExtractPlotModal
        isOpen={modals.extractPlot}
        onClose={() => closeModal('extractPlot')}
      />

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] px-5 py-3 bg-white rounded-lg shadow-lg border border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
          <p className="text-sm font-bold text-gray-900">{toast.title}</p>
          <p className="text-sm text-gray-700">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
