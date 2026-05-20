import { AlertTriangle, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ImportModal } from '@/features/novels/components/ImportModal';
import { NewNovelModal } from '@/features/novels/components/NewNovelModal';
import { NovelCard, type NovelCardSettings } from '@/features/novels/components/NovelCard';
import { RecycleBinModal } from '@/features/novels/components/RecycleBinModal';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import type { Novel, WorkType } from '@/features/novels/model/novelTypes';

type BtnColor = 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'amber' | 'pink' | 'teal' | 'indigo' | 'gray';

interface FullCardSettings extends NovelCardSettings {
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
const defaultBtnColors: Record<string, BtnColor> = {
  重命名: 'blue',
  封面: 'blue',
  导出: 'blue',
  删除: 'red',
};

const defaultCardSettings: FullCardSettings = {
  cardWidth: 'small',
  coverHeight: 'medium',
  cardHeight: 'medium',
  statFontSize: 'large',
  buttonFontSize: 'large',
  buttonFontWeight: 'medium',
  btnPerRow: 3,
  btnRows: 2,
  btnOrder: [...defaultBtnOrder],
  btnColors: { ...defaultBtnColors },
};

const colorOptions: { value: BtnColor; label: string }[] = [
  { value: 'blue', label: '蓝色' },
  { value: 'red', label: '红色' },
  { value: 'gray', label: '灰色' },
];

function loadCardSettings(): FullCardSettings {
  try {
    const saved = localStorage.getItem(CARD_SETTINGS_KEY);
    if (!saved) return { ...defaultCardSettings };
    const parsed = JSON.parse(saved);
    let savedOrder: string[] = [];
    if (Array.isArray(parsed.btnOrder) && parsed.btnOrder.length > 0) {
      savedOrder = parsed.btnOrder.filter(
        (label: string) => !!label && label !== '' && !label.startsWith('预留') && !label.startsWith('空'),
      );
    }
    if (savedOrder.length === 0) savedOrder = [...defaultBtnOrder];
    return {
      cardWidth: ['small', 'medium', 'large'].includes(parsed.cardWidth) ? parsed.cardWidth : defaultCardSettings.cardWidth,
      coverHeight: ['small', 'medium', 'large'].includes(parsed.coverHeight) ? parsed.coverHeight : defaultCardSettings.coverHeight,
      cardHeight: ['small', 'medium', 'large'].includes(parsed.cardHeight) ? parsed.cardHeight : defaultCardSettings.cardHeight,
      statFontSize: ['small', 'medium', 'large'].includes(parsed.statFontSize) ? parsed.statFontSize : defaultCardSettings.statFontSize,
      buttonFontSize: ['small', 'medium', 'large'].includes(parsed.buttonFontSize) ? parsed.buttonFontSize : defaultCardSettings.buttonFontSize,
      buttonFontWeight: ['normal', 'medium', 'bold'].includes(parsed.buttonFontWeight) ? parsed.buttonFontWeight : defaultCardSettings.buttonFontWeight,
      btnPerRow: [2, 3].includes(parsed.btnPerRow) ? parsed.btnPerRow : defaultCardSettings.btnPerRow,
      btnRows: [1, 2, 3].includes(parsed.btnRows) ? parsed.btnRows : defaultCardSettings.btnRows,
      btnOrder: savedOrder,
      btnColors: parsed.btnColors && typeof parsed.btnColors === 'object' ? parsed.btnColors : { ...defaultBtnColors },
    };
  } catch {
    return { ...defaultCardSettings };
  }
}

function saveCardSettings(settings: FullCardSettings) {
  localStorage.setItem(CARD_SETTINGS_KEY, JSON.stringify(settings));
}

function CardSettingsModal({
  isOpen,
  settings,
  onClose,
  onChange,
}: {
  isOpen: boolean;
  settings: FullCardSettings;
  onClose: () => void;
  onChange: (next: FullCardSettings) => void;
}) {
  if (!isOpen) return null;

  const totalSlots = settings.btnPerRow * settings.btnRows;
  const slots = settings.btnOrder.slice(0, totalSlots);
  while (slots.length < totalSlots) slots.push('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[580px] w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">作品卡片设置</h2>
            <p className="mt-0.5 text-xs text-gray-400">调整尺寸、文字、按钮排列，实时预览效果</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto border-r border-gray-100 p-5">
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">卡片尺寸</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">卡片宽度</label>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((value, index) => (
                      <button
                        key={value}
                        onClick={() => onChange({ ...settings, cardWidth: value })}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.cardWidth === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {['小', '中', '大'][index]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">封面高度</label>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((value, index) => (
                      <button
                        key={value}
                        onClick={() => onChange({ ...settings, coverHeight: value })}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.coverHeight === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {['小', '中', '大'][index]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">文字设置</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">统计文字</label>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((value, index) => (
                      <button key={value} onClick={() => onChange({ ...settings, statFontSize: value })} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.statFontSize === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {['小', '中', '大'][index]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">按钮文字</label>
                  <div className="flex gap-1">
                    {(['small', 'medium', 'large'] as const).map((value, index) => (
                      <button key={value} onClick={() => onChange({ ...settings, buttonFontSize: value })} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.buttonFontSize === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {['小', '中', '大'][index]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">按钮字重</label>
                  <div className="flex gap-1">
                    {(['normal', 'medium', 'bold'] as const).map((value, index) => (
                      <button key={value} onClick={() => onChange({ ...settings, buttonFontWeight: value })} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.buttonFontWeight === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {['常规', '中等', '粗体'][index]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">按钮设置</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">每行按钮</label>
                  <div className="flex gap-1">
                    {[2, 3].map((value) => (
                      <button key={value} onClick={() => onChange({ ...settings, btnPerRow: value as 2 | 3 })} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.btnPerRow === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {value}个
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">按钮行数</label>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((value) => (
                      <button key={value} onClick={() => onChange({ ...settings, btnRows: value as 1 | 2 | 3 })} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${settings.btnRows === value ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {value}行
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-[280px] flex-col gap-3 overflow-y-auto bg-gray-50/50 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">拖拽填空（{settings.btnRows}行×{settings.btnPerRow}个）</label>
              <div className="mx-auto flex w-[240px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${settings.btnPerRow}, 1fr)` }}>
                  {slots.map((label, index) => (
                    <div
                      key={index}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const dragLabel = event.dataTransfer.getData('text/plain');
                        if (!dragLabel) return;
                        const newOrder = [...settings.btnOrder];
                        while (newOrder.length < totalSlots) newOrder.push('');
                        const oldLabel = newOrder[index];
                        const dragIndex = newOrder.indexOf(dragLabel);
                        if (dragIndex >= 0) newOrder[dragIndex] = oldLabel;
                        newOrder[index] = dragLabel;
                        while (newOrder.length > 0 && newOrder[newOrder.length - 1] === '') newOrder.pop();
                        onChange({ ...settings, btnOrder: newOrder });
                      }}
                      className={`rounded py-2 text-center text-xs transition-all ${
                        label
                          ? `${label === '删除' ? 'bg-red-500 text-white' : 'bg-brand text-white'} cursor-move`
                          : 'border border-dashed border-gray-300 bg-gray-50 text-gray-300'
                      }`}
                      draggable={!!label}
                      onDragStart={(event) => {
                        if (label) event.dataTransfer.setData('text/plain', label);
                      }}
                    >
                      {label || '空'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">按钮池（拖拽到上方）</label>
              <div className="grid grid-cols-3 gap-1">
                {defaultBtnOrder.map((label) => (
                  <div
                    key={label}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', label);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`cursor-grab select-none rounded py-2 text-center text-xs transition-opacity hover:opacity-80 active:cursor-grabbing ${label === '删除' ? 'bg-red-500 text-white' : 'bg-brand text-white'}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">颜色</label>
              <div className="space-y-1">
                {settings.btnOrder.slice(0, settings.btnPerRow * settings.btnRows).filter(Boolean).map((label) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-8 truncate text-[9px] text-gray-500">{label}</span>
                    <div className="flex flex-1 gap-0.5">
                      {colorOptions.map((option) => (
                        <button
                          key={`${label}-${option.value}`}
                          onClick={() => onChange({ ...settings, btnColors: { ...settings.btnColors, [label]: option.value } })}
                          className={`h-3.5 w-3.5 rounded-full border transition-all ${(settings.btnColors[label] || 'gray') === option.value ? 'scale-110 border-gray-800' : 'border-transparent hover:scale-110'}`}
                          style={{ backgroundColor: option.value === 'blue' ? '#3B82F6' : option.value === 'red' ? '#EF4444' : '#9CA3AF' }}
                          title={option.label}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
          <button
            onClick={() => onChange({ ...defaultCardSettings, btnOrder: [...defaultBtnOrder], btnColors: { ...defaultBtnColors } })}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-500 transition-colors hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            恢复默认
          </button>
          <button onClick={onClose} className="rounded-lg bg-brand px-6 py-2 text-xs text-white hover:bg-brand-dark">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">确认删除</h3>
        </div>
        <p className="mb-3 text-xs text-gray-400">{title}</p>
        <p className="mb-6 text-sm text-gray-500">删除后将进入回收站，30 天内可恢复；到期后自动删除。</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onConfirm} className="rounded-md bg-amber-500 px-5 py-2 text-sm text-white hover:bg-amber-600 transition-colors">移入回收站</button>
        </div>
      </div>
    </div>
  );
}

function CoverModal({
  isOpen,
  novel,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  novel: Novel | null;
  onClose: () => void;
  onSave: (cover?: string) => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(novel?.cover ?? '');
  }, [novel]);

  if (!isOpen || !novel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[460px] rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">设置封面</h2>
          <p className="mt-0.5 text-xs text-gray-400">{novel.title}</p>
        </div>
        <div className="space-y-4 p-6">
          <label className="block text-xs font-medium text-gray-600">封面地址</label>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="输入图片 URL 或 data URL"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex justify-between border-t border-gray-100 px-6 py-4">
          <button onClick={() => onSave(undefined)} className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-600 hover:bg-red-50">
            清空封面
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button onClick={() => onSave(value.trim() || undefined)} className="rounded-lg bg-brand px-5 py-2 text-xs text-white hover:bg-brand-dark">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NovelLibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workType: WorkType = location.pathname === '/scripts' ? 'script' : 'novel';
  const typeLabel = workType === 'novel' ? '小说' : '剧本';
  const title = workType === 'novel' ? '我的小说' : '我的剧本';

  const {
    novels,
    categories,
    currentNovelId,
    recycledNovels,
    getNovelsByType,
    createNovel,
    renameNovel,
    moveToRecycle,
    restoreNovel,
    permanentDelete,
    selectNovel,
    updateCover,
  } = useNovelLibrary();

  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: number; title: string } | null>(null);
  const [coverTargetId, setCoverTargetId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [cardSettings, setCardSettings] = useState<FullCardSettings>(loadCardSettings);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setIsNewOpen(false);
    setIsImportOpen(false);
    setIsRecycleOpen(false);
    setRenameTarget(null);
    setCoverTargetId(null);
    setDeleteTargetId(null);
    setNotice('');
  }, [workType]);

  const sourceNovels = getNovelsByType(workType);
  const filters = ['全部', ...categories];
  const filteredNovels = useMemo(() => sourceNovels.filter((novel) => {
    const matchFilter = activeFilter === '全部' || novel.category === activeFilter;
    const matchSearch = !searchQuery.trim() || novel.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchFilter && matchSearch;
  }), [activeFilter, searchQuery, sourceNovels]);

  const coverTarget = novels.find((novel) => novel.id === coverTargetId) ?? null;

  const handleOpen = (id: number) => {
    const novel = novels.find((item) => item.id === id);
    if (!novel) return;
    selectNovel(id);
    navigate(novel.type === 'script' ? '/script-editor-v2' : '/workbench');
  };

  const confirmRename = () => {
    if (!renameTarget?.title.trim()) return;
    renameNovel(renameTarget.id, renameTarget.title);
    setRenameTarget(null);
  };

  const handleExportNovel = (id: number) => {
    const novel = novels.find((item) => item.id === id);
    if (!novel) return;
    const blob = new Blob([JSON.stringify(novel, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${novel.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`已导出 ${novel.title}`);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${workType === 'novel' ? 'text-blue-600' : 'text-orange-500'}`}>{title}</h1>
            <p className="mt-1 text-sm text-gray-400">共 {sourceNovels.length} 部{typeLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCardSettings(true)} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <SlidersHorizontal className="h-4 w-4" />
              <span>作品卡片设置</span>
            </button>
            <button onClick={() => setIsImportOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <Upload className="h-4 w-4" />
              <span>导入</span>
            </button>
            <button onClick={() => setIsRecycleOpen(true)} className="flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-red-600">
              <Trash2 className="h-4 w-4" />
              <span>回收站</span>
            </button>
            <button onClick={() => setIsNewOpen(true)} className="flex items-center gap-1.5 rounded-md bg-[#08B3D9] px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#07a0c2]">
              <Plus className="h-4 w-4" />
              <span>新建{typeLabel}</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {notice}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
                  activeFilter === filter
                    ? 'bg-brand text-white'
                    : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{filter}</span>
                <span className={`text-xs ${activeFilter === filter ? 'text-white/70' : 'text-gray-400'}`}>
                  {filter === '全部' ? sourceNovels.length : sourceNovels.filter((novel) => novel.category === filter).length}
                </span>
              </button>
            ))}
          </div>

          <label className="relative w-[200px] shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-colors focus:border-brand"
              placeholder={`搜索${typeLabel}`}
            />
          </label>
        </div>

        {filteredNovels.length === 0 ? (
          <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
            <p className="text-sm text-gray-500">暂无{typeLabel}</p>
            <button onClick={() => setIsNewOpen(true)} className="mt-3 rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
              新建{typeLabel}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {filteredNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                isSelected={currentNovelId === novel.id}
                settings={cardSettings}
                onOpen={handleOpen}
                onRename={(id, currentTitle) => setRenameTarget({ id, title: currentTitle })}
                onCover={(id) => setCoverTargetId(id)}
                onExport={handleExportNovel}
                onDelete={(id) => setDeleteTargetId(id)}
              />
            ))}
          </div>
        )}
      </main>

      <NewNovelModal
        isOpen={isNewOpen}
        type={workType}
        categories={categories}
        onClose={() => setIsNewOpen(false)}
        onCreate={createNovel}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        defaultType={workType}
      />

      <RecycleBinModal
        isOpen={isRecycleOpen}
        type={workType}
        items={recycledNovels}
        onClose={() => setIsRecycleOpen(false)}
        onRestore={restoreNovel}
        onPermanentDelete={permanentDelete}
      />

      <CardSettingsModal
        isOpen={showCardSettings}
        settings={cardSettings}
        onClose={() => setShowCardSettings(false)}
        onChange={(next) => {
          setCardSettings(next);
          saveCardSettings(next);
        }}
      />

      <CoverModal
        isOpen={coverTargetId !== null}
        novel={coverTarget}
        onClose={() => setCoverTargetId(null)}
        onSave={(cover) => {
          if (coverTargetId !== null) updateCover(coverTargetId, cover);
          setCoverTargetId(null);
          setNotice('封面已更新');
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteTargetId !== null}
        title={novels.find((novel) => novel.id === deleteTargetId)?.title || ''}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId !== null) moveToRecycle(deleteTargetId);
          setDeleteTargetId(null);
        }}
      />

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRenameTarget(null)}>
          <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-gray-900">修改作品名称</h3>
            <input
              value={renameTarget.title}
              onChange={(event) => setRenameTarget({ ...renameTarget, title: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') confirmRename(); }}
              className="mb-5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm transition-colors focus:border-brand"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setRenameTarget(null)} className="px-4 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700">
                取消
              </button>
              <button onClick={confirmRename} className="rounded-lg bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
