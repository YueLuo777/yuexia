import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Trash2, BookOpen, Image, Plus, Upload, X, AlertTriangle, RefreshCw, SlidersHorizontal,
} from 'lucide-react';
import CoverModal from './CoverModal';
import NewNovelModal from './NewNovelModal';
import ImportModal from './ImportModal';
import { useNovelsContext } from '@/hooks/useNovels';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';
import type { RecycledNovel, Novel } from '@/hooks/useNovels';

/* ─── 新增分类弹窗 ─── */
function AddCategoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addCategory, categories } = useNovelsContext();
  const [name, setName] = useState('');
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) { alert('该分类已存在'); return; }
    addCategory(trimmed);
    setName('');
    onClose();
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[360px] bg-white rounded-xl shadow-2xl p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">新增分类</h3>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="输入分类名称（如：都市、玄幻等）"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand mb-4"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
          <button onClick={handleAdd} className="px-4 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand">确定</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 确认删除弹窗 ─── */
function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);
  if (!isOpen) return null;
  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[420px] bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">确认删除</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">{title}</p>
        <p className="text-sm text-gray-500 mb-6">删除后将进入回收站，30 天内可恢复；到期后自动删除。</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onConfirm} className="px-5 py-2 text-sm text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors">移入回收站</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 彻底删除警告弹窗 ─── */
function PermanentDeleteModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);
  if (!isOpen) return null;
  return (
    <div ref={backdropRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[420px] bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">警告</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-6">彻底删除后将无法恢复，是否继续？</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onConfirm} className="px-5 py-2 text-sm text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors">彻底删除</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 回收站弹窗 ─── */
function RecycleBinModal({ isOpen, onClose, recycleBin, onRestore, onPermanentDelete, workType }: {
  isOpen: boolean; onClose: () => void; recycleBin: RecycledNovel[];
  onRestore: (id: number) => void; onPermanentDelete: (id: number) => void; workType: 'novel' | 'script';
}) {
  const [showPermanent, setShowPermanent] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  const typeLabel = workType === 'novel' ? '小说' : '剧本';
  const typeRecycleBin = recycleBin.filter((n) => (n.type || 'novel') === workType);

  const handlePermanentClick = (id: number) => { setPendingId(id); setShowPermanent(true); };
  const handleConfirm = () => { if (pendingId !== null) onPermanentDelete(pendingId); setShowPermanent(false); setPendingId(null); };

  return (
    <>
      <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="flex flex-col w-[640px] max-w-[90vw] h-[520px] max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-gray-900">{typeLabel}回收站</h3>
              <p className="text-sm text-gray-400 mt-0.5">已删除{typeLabel}将保留 30 天，可随时恢复；到期后自动删除。</p>
              <p className="text-xs text-gray-400 mt-0.5">总数：{typeRecycleBin.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"><RefreshCw className="w-3.5 h-3.5" /><span>刷新</span></button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {typeRecycleBin.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full border border-dashed border-gray-200 rounded-xl">
                <Trash2 className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-1">回收站为空</p>
                <p className="text-xs text-gray-400">删除的{typeLabel}会出现在这里，可在 30 天内恢复。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {typeRecycleBin.map((novel) => (
                  <div key={novel.id} className="p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{novel.title}</h4>
                      <span className="text-xs text-gray-400">{typeLabel}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">暂无简介</p>
                    <p className="text-xs text-gray-400 mb-3">删除于 {novel.deletedAt} · 到期 {novel.expireAt} · 剩余 {novel.remainingDays} 天</p>
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => onRestore(novel.id)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">恢复</button>
                      <button onClick={() => handlePermanentClick(novel.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /><span>彻底删除</span></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <PermanentDeleteModal isOpen={showPermanent} onClose={() => setShowPermanent(false)} onConfirm={handleConfirm} />
    </>
  );
}

/* ─── Toast ─── */
function ToastNotification() {
  const { toast } = useNovelsContext();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[70] w-[280px] bg-white rounded-lg shadow-lg border border-gray-100 p-4 animate-in slide-in-from-bottom-2 fade-in">
      <p className="text-sm font-medium text-gray-900">{toast.title}</p>
      {toast.message && <p className="text-xs text-gray-500 mt-1">{toast.message}</p>}
    </div>
  );
}

/* ─── 作品卡片设置类型 ─── */
type BtnColor = 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'amber' | 'pink' | 'teal' | 'indigo' | 'gray';

interface CardSettings {
  cardWidth: 'small' | 'medium' | 'large';
  cardHeight: 'small' | 'medium' | 'large';
  statFontSize: 'small' | 'medium' | 'large';
  buttonFontSize: 'small' | 'medium' | 'large';
  buttonFontWeight: 'normal' | 'medium' | 'bold';
  btnPerRow: 2 | 3;
  btnRows: 1 | 2 | 3;
  btnOrder: string[];
  btnColors: Record<string, BtnColor>;
}

const CARD_SETTINGS_KEY = 'novel_card_settings';

const defaultBtnOrder = ['重命名', '封面', '导出', '删除'];

const colorOptions: { value: BtnColor; label: string; bg: string; text: string }[] = [
  { value: 'blue', label: '蓝色', bg: 'bg-brand', text: 'text-white hover:bg-brand-dark' },
  { value: 'red', label: '红色', bg: 'bg-red-500', text: 'text-white hover:bg-red-600' },
  { value: 'gray', label: '灰色', bg: 'bg-gray-100', text: 'text-gray-600 hover:bg-gray-200' },
];

const defaultBtnColors: Record<string, BtnColor> = {
  '重命名': 'blue', '封面': 'blue', '导出': 'blue', '删除': 'red',
};

function getBtnColorClasses(color: BtnColor): string {
  const opt = colorOptions.find((c) => c.value === color);
  return opt ? `${opt.bg} ${opt.text}` : 'bg-gray-50 text-gray-600';
}

const defaultCardSettings: CardSettings = {
  cardWidth: 'small',
  cardHeight: 'medium',
  statFontSize: 'large',
  buttonFontSize: 'large',
  buttonFontWeight: 'medium',
  btnPerRow: 3,
  btnRows: 2,
  btnOrder: [...defaultBtnOrder],
  btnColors: { ...defaultBtnColors },
};

function loadCardSettings(): CardSettings {
  try {
    const saved = localStorage.getItem(CARD_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 校验 btnPerRow
      if (!parsed.btnPerRow || ![2, 3].includes(parsed.btnPerRow)) {
        parsed.btnPerRow = 3;
      }
      // 校验 btnRows（关键修复：旧版本可能保存了非法值）
      if (!parsed.btnRows || ![1, 2, 3].includes(parsed.btnRows)) {
        parsed.btnRows = 3;
      }
      if (!parsed.buttonFontWeight) {
        parsed.buttonFontWeight = 'medium';
      }
      // 清理 btnOrder：去重、过滤空字符串、补全缺失按钮、限制长度
      if (!parsed.btnOrder || !Array.isArray(parsed.btnOrder)) {
        parsed.btnOrder = [...defaultBtnOrder];
      } else {
        // 过滤空字符串并去重（保留第一次出现）
        const seen = new Set<string>();
        parsed.btnOrder = parsed.btnOrder.filter((item: string) => {
          if (!item || seen.has(item)) return false;
          seen.add(item);
          return true;
        });
        // 补充缺失的按钮到末尾
        for (const btn of defaultBtnOrder) {
          if (!seen.has(btn)) parsed.btnOrder.push(btn);
        }
        // 限制最多9个（3×3最大值）
        if (parsed.btnOrder.length > 9) parsed.btnOrder = parsed.btnOrder.slice(0, 9);
      }
      if (!parsed.btnColors || typeof parsed.btnColors !== 'object') {
        parsed.btnColors = { ...defaultBtnColors };
      }
      return parsed;
    }
  } catch {}
  return defaultCardSettings;
}

function saveCardSettings(settings: CardSettings) {
  try { localStorage.setItem(CARD_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

const cardWidthMap = { small: '200px', medium: '240px', large: '280px' };
const cardHeightMap = { small: '380px', medium: '420px', large: '460px' };
const statFontMap = { small: 'text-[10px]', medium: 'text-xs', large: 'text-sm' };
const btnFontMap = { small: 'text-[10px]', medium: 'text-xs', large: 'text-sm' };
const btnWeightMap = { normal: 'font-normal', medium: 'font-medium', bold: 'font-bold' };

/* ─── 主组件 ─── */
export default function MyNovels() {
  const navigate = useNavigate();
  const location = useLocation();
  const { novels, recycleBin, categories, updateNovelCover, deleteNovel, restoreNovel, permanentDelete, volumes, getNovelWordCount, setCurrentNovel, renameNovel, getNovelsByType } = useNovelsContext();
  
  // 根据路由路径自动设置作品类型
  const pathType = location.pathname === '/scripts' ? 'script' : 'novel';
  const [activeTab, setActiveTab] = useState<'novel' | 'script'>(pathType);
  
  // 当路由变化时同步更新 activeTab
  useEffect(() => {
    setActiveTab(pathType);
  }, [location.pathname]);
  
  const [activeFilter, setActiveFilter] = useState('全部');
  // 作品卡片设置
  const [cardSettings, setCardSettings] = useState<CardSettings>(loadCardSettings);
  const [showCardSettings, setShowCardSettings] = useState(false);
  // 1. 标签拖动排序状态
  const [tagOrder, setTagOrder] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('novel_category_order'); return saved ? JSON.parse(saved) : categories; } catch { return categories; }
  });
  const [tagDragIdx, setTagDragIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [selectedNovelForCover, setSelectedNovelForCover] = useState<Novel | null>(null);
  const [isNewNovelModalOpen, setIsNewNovelModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 从 localStorage 加载章节正文
  const loadChapterContent = (chapterId: number): string => {
    try { return localStorage.getItem(`chapter_content_${chapterId}`) || ''; } catch { return ''; }
  };

  const openRenameModal = (novelId: number, currentTitle: string) => {
    setRenameTargetId(novelId);
    setRenameValue(currentTitle);
    setIsRenameModalOpen(true);
  };

  const confirmRename = () => {
    if (renameTargetId !== null && renameValue.trim()) {
      renameNovel(renameTargetId, renameValue.trim());
    }
    setIsRenameModalOpen(false);
    setRenameTargetId(null);
  };

  // 导出功能
  const handleExport = (_novelId: number) => {
    setIsExportModalOpen(true);
  };

  const confirmExport = () => {
    const lines: string[] = [];
    volumes.forEach((vol) => {
      lines.push(`\n===== ${vol.name} =====\n`);
      vol.chapters.forEach((ch, cIdx) => {
        const content = loadChapterContent(ch.id);
        const title = ch.title || '未命名';
        lines.push(`\n--- 第${cIdx + 1}章：${title} ---\n`);
        lines.push(content);
        lines.push('\n');
      });
    });

    const blob = new Blob([lines.join('')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novels[0]?.title || '作品'}_导出.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const openDeleteModal = (id: number) => { setDeleteTargetId(id); setIsDeleteModalOpen(true); };
  const handleMoveToRecycleBin = () => {
    if (deleteTargetId === null) return;
    deleteNovel(deleteTargetId);
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  // 按当前 Tab 类型筛选 + 分类筛选 + 搜索
  const typeFilteredNovels = getNovelsByType(activeTab);
  const filteredNovels = typeFilteredNovels.filter((novel) => {
    const matchCategory = activeFilter === '全部' || novel.category === activeFilter;
    const matchSearch = !searchQuery.trim() || novel.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto p-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className={`text-2xl font-bold ${activeTab === 'novel' ? 'text-blue-600' : 'text-orange-500'}`}>{activeTab === 'novel' ? '我的小说' : '我的剧本'}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'novel' ? `共 ${getNovelsByType('novel').length} 部小说` : `共 ${getNovelsByType('script').length} 部剧本`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCardSettings(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-[#08B3D9] rounded-md hover:bg-[#07a0c2] transition-colors shadow-sm">
              <SlidersHorizontal className="w-4 h-4" /><span>作品卡片设置</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-[#08B3D9] rounded-md hover:bg-[#07a0c2] transition-colors shadow-sm">
              <Upload className="w-4 h-4" /><span>导入</span>
            </button>
            <button onClick={() => setIsRecycleBinOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors shadow-sm">
              <Trash2 className="w-4 h-4" /><span>回收站</span>
            </button>
            <button onClick={() => setIsNewNovelModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-[#08B3D9] rounded-md hover:bg-[#07a0c2] transition-colors shadow-sm">
              <Plus className="w-4 h-4" /><span>{activeTab === 'novel' ? '新建小说' : '新建剧本'}</span>
            </button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveFilter('全部')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-full transition-colors ${activeFilter === '全部' ? 'text-white bg-brand' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}>
              <span className="novel-tag-font">全部</span><span className={`text-xs ${activeFilter === '全部' ? 'text-white/70' : 'text-gray-400'}`}>{typeFilteredNovels.length}</span>
            </button>
            {tagOrder.map((cat, tIdx) => (
              <button
                key={cat}
                draggable
                onClick={() => setActiveFilter(cat)}
                onDragStart={() => setTagDragIdx(tIdx)}
                onDragOver={(e) => { e.preventDefault(); if (tagDragIdx === null || tagDragIdx === tIdx) return; setTagOrder((prev) => { const arr = [...prev]; const [m] = arr.splice(tagDragIdx, 1); arr.splice(tIdx, 0, m); return arr; }); setTagDragIdx(tIdx); }}
                onDragEnd={() => { setTagDragIdx(null); try { localStorage.setItem('novel_category_order', JSON.stringify(tagOrder)); } catch {} }}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-full transition-colors ${activeFilter === cat ? 'text-white bg-brand' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'} ${tagDragIdx === tIdx ? 'opacity-50' : ''}`}
                title="按住拖动可排序"
              >
                <span className="pointer-events-none novel-tag-font">{cat}</span><span className={`text-xs pointer-events-none ${activeFilter === cat ? 'text-white/70' : 'text-gray-400'}`}>{typeFilteredNovels.filter((n) => n.category === cat).length}</span>
              </button>
            ))}
            <button onClick={() => setIsAddCategoryOpen(true)} className="flex items-center justify-center w-9 h-9 text-gray-400 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索作品..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand placeholder:text-gray-400" />
          </div>
        </div>

        {/* 内容区 */}
        {filteredNovels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 rounded-xl bg-white">
            <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-base text-gray-500 mb-2">{searchQuery ? '未找到匹配的作品' : '还没有开始创作'}</p>
            <p className="text-sm text-gray-400 mb-6">{searchQuery ? '请尝试其他关键词' : '点击"新建作品"即可快速生成空白作品。'}</p>
            {!searchQuery && <button onClick={() => setIsNewNovelModalOpen(true)} className="flex items-center gap-1.5 px-5 py-2.5 text-sm text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"><Plus className="w-4 h-4" /><span>新建作品</span></button>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {filteredNovels.map((novel) => (
              <div
                key={novel.id}
                onClick={() => { setCurrentNovel(novel.id); navigate('/workbench'); }}
                className="group bg-white rounded-[24px] border border-gray-100 p-3 hover:shadow-xl transition-shadow flex flex-col cursor-pointer"
                style={{ width: cardWidthMap[cardSettings.cardWidth], minHeight: cardHeightMap[cardSettings.cardHeight] }}
              >
                {/* 封面区域 - 淡绿渐变圆角 */}
                <div className="relative rounded-[20px] flex flex-col items-center justify-center shrink-0 overflow-hidden" style={{ height: cardSettings.cardHeight === 'small' ? '210px' : cardSettings.cardHeight === 'medium' ? '250px' : '280px', background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)' }}>
                  {/* 分类标签已删除 */}
                  {novel.cover ? (
                    <img src={novel.cover} alt="封面" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center mb-2">
                        <Image className="w-5 h-5 text-teal-600" />
                      </div>
                      <p className="text-xs font-medium text-teal-700 mb-3">暂无封面</p>
                    </div>
                  )}
                </div>
                {/* 信息区域 */}
                <div className="flex flex-col flex-1 px-1 pt-3 pb-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 truncate">{novel.title}</h3>
                  <div className={`flex items-center justify-between text-gray-400 mb-3 ${statFontMap[cardSettings.statFontSize]}`}>
                    <span>{getNovelWordCount(novel.id)}字</span>
                    <span>{novel.lastModifiedAt ? `修改：${novel.lastModifiedAt}` : `创建：${novel.createdAt}`}</span>
                  </div>
                  {/* 按钮区域 - 纯文字弹性网格 */}
                  {(() => {
                    const allActions: Record<string, (e: React.MouseEvent) => void> = {
                      '重命名': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); openRenameModal(novel.id, novel.title); },
                      '封面': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); setSelectedNovelForCover(novel); setIsCoverModalOpen(true); },
                      '导出': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleExport(novel.id); },
                      '删除': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); openDeleteModal(novel.id); },
                      '预留': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); },
                      '预留2': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); },
                      '预留3': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); },
                      '预留4': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); },
                      '预留5': (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); },
                    };
                    const maxCount = cardSettings.btnPerRow * cardSettings.btnRows;
                    const ordered = cardSettings.btnOrder.slice(0, maxCount);
                    return (
                      <div className="grid gap-1 mt-auto" style={{ gridTemplateColumns: `repeat(${cardSettings.btnPerRow}, 1fr)` }}>
                        {ordered.map((label, bi) => {
                          const color = cardSettings.btnColors[label] || 'gray';
                          const isCursor = label.startsWith('预留') ? 'cursor-default' : '';
                          return (
                            <button key={bi} onClick={allActions[label]} className={`py-1.5 rounded-lg transition-colors ${getBtnColorClasses(color as BtnColor)} hover:opacity-80 ${isCursor} ${btnFontMap[cardSettings.buttonFontSize]} ${btnWeightMap[cardSettings.buttonFontWeight]}`}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 py-4 text-center text-xs text-gray-400 border-t border-gray-100">
          <p>© 2025 月下写作</p>
        </div>

        <CoverModal isOpen={isCoverModalOpen} onClose={() => setIsCoverModalOpen(false)} novelTitle={selectedNovelForCover?.title || ''} onCoverSelected={(dataUrl) => {
          if (selectedNovelForCover) {
            updateNovelCover(selectedNovelForCover.id, dataUrl);
          }
          setIsCoverModalOpen(false);
        }}
        onResetCover={() => {
          if (selectedNovelForCover) {
            updateNovelCover(selectedNovelForCover.id, '');
          }
        }} />
        <NewNovelModal isOpen={isNewNovelModalOpen} onClose={() => setIsNewNovelModalOpen(false)} defaultType={activeTab} />
        <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} defaultType={activeTab} />
        <AddCategoryModal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} />
        <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); }} onConfirm={handleMoveToRecycleBin} title={novels.find((n) => n.id === deleteTargetId)?.title || ''} />
        <RecycleBinModal isOpen={isRecycleBinOpen} onClose={() => setIsRecycleBinOpen(false)} recycleBin={recycleBin} onRestore={restoreNovel} onPermanentDelete={permanentDelete} workType={activeTab} />

        {/* 重命名弹窗 */}
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setIsRenameModalOpen(false)}>
            <div className="w-[360px] bg-white rounded-xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-900 mb-4">修改作品名称</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); }}
                placeholder="请输入作品名称"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand mb-5"
                autoFocus
              />
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setIsRenameModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                <button onClick={confirmRename} className="px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">确认</button>
              </div>
            </div>
          </div>
        )}

        {/* 导出弹窗 */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setIsExportModalOpen(false)}>
            <div className="w-[400px] bg-white rounded-xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-900 mb-2">导出作品</h3>
              <p className="text-sm text-gray-500 mb-5">将导出作品下所有卷和章节（含章节正文），保存为 .txt 文件。</p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                <button onClick={confirmExport} className="px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">确认导出</button>
              </div>
            </div>
          </div>
        )}

        {/* 作品卡片设置弹窗 */}
        {showCardSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-[720px] h-[580px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-gray-900">作品卡片设置</h2>
                  <p className="text-xs text-gray-400 mt-0.5">调整尺寸、文字、按钮排列，实时预览效果</p>
                </div>
                <button onClick={() => setShowCardSettings(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 弹窗内容 - 左右两列（固定高度，内部滚动） */}
              <div className="flex gap-0 flex-1 overflow-hidden">
                {/* 左列：设置选项（分类展示） */}
                <div className="flex-1 p-5 space-y-4 border-r border-gray-100 overflow-y-auto">
                  {/* ── 卡片尺寸 ── */}
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">卡片尺寸</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 卡片宽度 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">卡片宽度</label>
                        <div className="flex gap-1">
                          {(['小','中','大'] as const).map((label, i) => {
                            const vals: Array<'small'|'medium'|'large'> = ['small','medium','large'];
                            const v = vals[i];
                            return (
                              <button key={v} onClick={() => { const next = { ...cardSettings, cardWidth: v }; setCardSettings(next); saveCardSettings(next); }}
                                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.cardWidth===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 卡片高度 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">卡片高度</label>
                        <div className="flex gap-1">
                          {(['小','中','大'] as const).map((label, i) => {
                            const vals: Array<'small'|'medium'|'large'> = ['small','medium','large'];
                            const v = vals[i];
                            return (
                              <button key={v} onClick={() => { const next = { ...cardSettings, cardHeight: v }; setCardSettings(next); saveCardSettings(next); }}
                                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.cardHeight===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 文字设置 ── */}
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">文字设置</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 统计文字 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">统计文字</label>
                        <div className="flex gap-1">
                          {(['小','中','大'] as const).map((label, i) => {
                            const vals: Array<'small'|'medium'|'large'> = ['small','medium','large'];
                            const v = vals[i];
                            return (
                              <button key={v} onClick={() => { const next = { ...cardSettings, statFontSize: v }; setCardSettings(next); saveCardSettings(next); }}
                                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.statFontSize===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 按钮文字 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">按钮文字</label>
                        <div className="flex gap-1">
                          {(['小','中','大'] as const).map((label, i) => {
                            const vals: Array<'small'|'medium'|'large'> = ['small','medium','large'];
                            const v = vals[i];
                            return (
                              <button key={v} onClick={() => { const next = { ...cardSettings, buttonFontSize: v }; setCardSettings(next); saveCardSettings(next); }}
                                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.buttonFontSize===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 按钮字重 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">按钮字重</label>
                        <div className="flex gap-1">
                          {(['常规','中等','粗体'] as const).map((label, i) => {
                            const vals: Array<'normal'|'medium'|'bold'> = ['normal','medium','bold'];
                            const v = vals[i];
                            return (
                              <button key={v} onClick={() => { const next = { ...cardSettings, buttonFontWeight: v }; setCardSettings(next); saveCardSettings(next); }}
                                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.buttonFontWeight===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 按钮设置 ── */}
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">按钮设置</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 每行按钮数 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">每行按钮</label>
                        <div className="flex gap-1">
                          {([2,3] as const).map((v) => (
                            <button key={v} onClick={() => { const next = { ...cardSettings, btnPerRow: v }; setCardSettings(next); saveCardSettings(next); }}
                              className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.btnPerRow===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                              {v}个
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 按钮行数 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">按钮行数</label>
                        <div className="flex gap-1">
                          {([1,2,3] as const).map((v) => (
                            <button key={v} onClick={() => { const next = { ...cardSettings, btnRows: v }; setCardSettings(next); saveCardSettings(next); }}
                              className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-colors ${cardSettings.btnRows===v?'border-brand bg-brand-light text-brand font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                              {v}行
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右列：实时预览 + 拖拽填空 */}
                <div className="w-[280px] p-4 bg-gray-50/50 flex flex-col gap-3 overflow-y-auto">
                  {/* 迷你卡片预览：空槽位（固定3×3尺寸） */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      拖拽填空（{cardSettings.btnRows}行×{cardSettings.btnPerRow}个）
                    </label>
                    <div
                      className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col mx-auto"
                      style={{ width: '240px', height: 'auto' }}
                    >
                      {/* 空槽位网格 - 动态列数(2/3)和行数(1/2/3)，与用户设置一致 */}
                      <div
                        className="grid gap-1.5"
                        style={{
                          gridTemplateColumns: `repeat(${cardSettings.btnPerRow}, 1fr)`,
                          gridTemplateRows: `repeat(${cardSettings.btnRows}, 1fr)`,
                        }}
                      >
                        {(() => {
                          const totalSlots = cardSettings.btnPerRow * cardSettings.btnRows;
                          const slots = cardSettings.btnOrder.slice(0, totalSlots);
                          while (slots.length < totalSlots) slots.push('');
                          return slots.map((label, idx) => (
                            <div
                              key={idx}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const dragLabel = e.dataTransfer.getData('text/plain');
                                if (!dragLabel) return;
                                const newOrder = [...cardSettings.btnOrder];
                                while (newOrder.length < totalSlots) newOrder.push('');
                                // 交换位置：把原位置设为当前槽位的旧值
                                const oldLabel = newOrder[idx];
                                const dragIdx = newOrder.indexOf(dragLabel);
                                if (dragIdx >= 0) {
                                  newOrder[dragIdx] = oldLabel;
                                }
                                newOrder[idx] = dragLabel;
                                // 清理尾部空字符串
                                while (newOrder.length > 0 && newOrder[newOrder.length - 1] === '') newOrder.pop();
                                const next = { ...cardSettings, btnOrder: newOrder };
                                setCardSettings(next); saveCardSettings(next);
                              }}
                              className={`py-2 rounded text-center text-xs transition-all ${
                                label
                                  ? `${getBtnColorClasses(cardSettings.btnColors[label] || 'gray')} cursor-move`
                                  : 'border border-dashed border-gray-300 bg-gray-50 text-gray-300'
                              }`}
                              draggable={!!label}
                              onDragStart={(e) => {
                                if (label) e.dataTransfer.setData('text/plain', label);
                              }}
                            >
                              {label || '空'}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 按钮池：可拖拽 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">按钮池（拖拽到上方）</label>
                    <div className="grid grid-cols-3 gap-1">
                      {defaultBtnOrder.map((label) => (
                        <div
                          key={label}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', label);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className={`py-2 rounded text-center text-xs cursor-grab active:cursor-grabbing ${getBtnColorClasses(cardSettings.btnColors[label] || 'gray')} hover:opacity-80 transition-opacity select-none`}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 按钮颜色 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">颜色</label>
                    <div className="space-y-1">
                      {cardSettings.btnOrder.slice(0, cardSettings.btnPerRow * cardSettings.btnRows).map((label) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-500 w-8 truncate">{label}</span>
                          <div className="flex gap-0.5 flex-1">
                            {colorOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  const next = { ...cardSettings, btnColors: { ...cardSettings.btnColors, [label]: opt.value } };
                                  setCardSettings(next); saveCardSettings(next);
                                }}
                                className={`w-3.5 h-3.5 rounded-full border transition-all ${(cardSettings.btnColors[label] || 'gray') === opt.value ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: opt.bg.replace('bg-', '').includes('green') ? '#dcfce7' : opt.bg.includes('orange') ? '#fff7ed' : opt.bg.includes('blue') ? '#eff6ff' : opt.bg.includes('red') ? '#fef2f2' : opt.bg.includes('purple') ? '#faf5ff' : opt.bg.includes('amber') ? '#fffbeb' : opt.bg.includes('pink') ? '#fdf2f8' : opt.bg.includes('teal') ? '#f0fdfa' : opt.bg.includes('indigo') ? '#eef2ff' : '#f9fafb' }}
                                title={opt.label}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => { const reset = { ...defaultCardSettings, btnOrder: [...defaultBtnOrder], btnColors: { ...defaultBtnColors } }; setCardSettings(reset); saveCardSettings(reset); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  恢复默认
                </button>
                <button
                  onClick={() => setShowCardSettings(false)}
                  className="px-6 py-2 text-xs text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastNotification />
      </main>
    </div>
  );
}