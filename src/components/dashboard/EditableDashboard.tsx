import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Settings, Plus, Save, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';
import DraggableDashboardCard, { type CardSize, type CardHeight, type DashboardCardConfig } from './DraggableDashboardCard';
import WelcomeCard from './WelcomeCard';
import StatsOverviewCard from './StatsOverviewCard';
import RecentEditsCard from './RecentEditsCard';
import PlaceholderCard from './PlaceholderCard';
import ConfigBackupCard from './ConfigBackupCard';

const STORAGE_KEY_LAYOUT = 'dashboard_layout';
const LAYOUT_VERSION = 5;

const defaultLayout: DashboardCardConfig[] = [
  { id: 'welcome', type: 'welcome', size: 'third', height: 'auto' },
  { id: 'config-backup', type: 'config-backup', size: 'third', height: 'auto' },
  { id: 'recent', type: 'recent', size: 'third', height: 'auto' },
];

function loadLayout(): DashboardCardConfig[] {
  try {
    const storedVersion = localStorage.getItem('dashboard_layout_version');
    if (storedVersion && Number(storedVersion) === LAYOUT_VERSION) {
      const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((c: DashboardCardConfig) => ({
          ...c,
          height: c.height || 'auto',
        }));
      }
    }
  } catch {}
  return defaultLayout;
}

function saveLayout(layout: DashboardCardConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layout));
    localStorage.setItem('dashboard_layout_version', String(LAYOUT_VERSION));
  } catch {}
}

interface EditableDashboardProps {
  onNewNovel: () => void;
}

const availableCardTypes = [
  { type: 'welcome', label: '欢迎区', desc: '用户名 + 快捷按钮' },
  { type: 'config-backup', label: '配置备份', desc: '导出/导入所有配置' },
  { type: 'invite', label: '推广数据', desc: '邀请统计 + 奖励' },
  { type: 'recent', label: '最近编辑', desc: '最近编辑的作品' },
  { type: 'placeholder', label: '预留位', desc: '空白占位' },
];

const cardTypeLabels: Record<string, string> = {
  welcome: '欢迎区',
  'config-backup': '配置备份',
  invite: '推广数据',
  recent: '最近编辑',
  placeholder: '预留位',
};

const sizeOptions: { value: CardSize; label: string }[] = [
  { value: 'small', label: '小 (20%)' },
  { value: 'medium', label: '中 (50%)' },
  { value: 'large', label: '大 (75%)' },
  { value: 'full', label: '全宽 (100%)' },
];

const heightOptions: { value: CardHeight; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'small', label: '小 (200px)' },
  { value: 'medium', label: '中 (300px)' },
  { value: 'large', label: '大 (400px)' },
];

export default function EditableDashboard({ onNewNovel }: EditableDashboardProps) {
  const { novels, totalWordCount } = useNovelsContext();
  const [layout, setLayout] = useState<DashboardCardConfig[]>(loadLayout);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleSizeChange = useCallback((id: string, size: CardSize) => {
    setLayout((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, size } : c);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleHeightChange = useCallback((id: string, height: CardHeight) => {
    setLayout((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, height } : c);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setLayout((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleAdd = useCallback((type: string) => {
    const existing = layout.filter((c) => c.type === type);
    const newId = `${type}-${existing.length + 1}`;
    const newCard: DashboardCardConfig = {
      id: newId,
      type,
      size: type === 'stats' || type === 'placeholder' ? 'small' : 'medium',
      height: 'auto',
    };
    setLayout((prev) => {
      const next = [...prev, newCard];
      saveLayout(next);
      return next;
    });
    setShowAddPanel(false);
  }, [layout]);

  const handleReset = useCallback(() => {
    setLayout(defaultLayout);
    saveLayout(defaultLayout);
  }, []);

  const renderCardContent = (card: DashboardCardConfig) => {
    switch (card.type) {
      case 'welcome':
        return <WelcomeCard username="月落" onNewNovel={onNewNovel} wordCount={totalWordCount} novelCount={novels.length} />;
      case 'stats':
        return <StatsOverviewCard wordCount={totalWordCount} novelCount={novels.length} />;
      case 'invite':
        return <PlaceholderCard />;
      case 'recent':
        return <RecentEditsCard novels={novels} maxCount={4} />;
      case 'config-backup':
        return <ConfigBackupCard />;
      case 'placeholder':
        return <PlaceholderCard />;
      default:
        return null;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 relative">
      {/* 编辑模式切换按钮 */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand border border-brand rounded-md hover:bg-brand-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加卡片
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                恢复默认
              </button>
              <button
                onClick={() => { setIsEditMode(false); setShowAddPanel(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                完成
              </button>
            </>
          )}
          {!isEditMode && (
            <>
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                编辑工作台
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                卡片设置
              </button>
            </>
          )}
        </div>
      </div>

      {/* 编辑模式提示 */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          拖拽手柄排序，点击放大图标切换宽度，点击垃圾桶删除卡片。完成后点击"完成"保存。
        </div>
      )}

      {/* 添加卡片面板 */}
      {isEditMode && showAddPanel && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">选择要添加的卡片</p>
          <div className="flex flex-wrap gap-2">
            {availableCardTypes.map((card) => (
              <button
                key={card.type}
                onClick={() => handleAdd(card.type)}
                className="flex flex-col items-start px-4 py-3 text-left border border-gray-200 rounded-lg hover:border-brand hover:bg-brand-light transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">{card.label}</span>
                <span className="text-xs text-gray-400">{card.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ 卡片设置面板（弹窗） ═══════ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">卡片设置</h2>
                <p className="text-xs text-gray-400 mt-0.5">调整每个卡片的宽度和高度</p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {layout.map((card, index) => (
                <div
                  key={card.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  {/* 序号 */}
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold shrink-0">
                    {index + 1}
                  </div>

                  {/* 卡片名称 */}
                  <div className="w-24 shrink-0">
                    <span className="text-sm font-medium text-gray-800">
                      {cardTypeLabels[card.type] || card.type}
                    </span>
                  </div>

                  {/* 宽度设置 */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">宽度</label>
                    <select
                      value={card.size}
                      onChange={(e) => handleSizeChange(card.id, e.target.value as CardSize)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                    >
                      {sizeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 高度设置 */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">高度</label>
                    <select
                      value={card.height || 'auto'}
                      onChange={(e) => handleHeightChange(card.id, e.target.value as CardHeight)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                    >
                      {heightOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => {
                  handleReset();
                  setShowSettings(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                恢复默认
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 text-xs text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 可拖拽的卡片列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layout.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="flex flex-wrap gap-4">
            {layout.map((card) => (
              <DraggableDashboardCard
                key={card.id}
                id={card.id}
                size={card.size}
                height={card.height}
                isEditMode={isEditMode}
                onSizeChange={handleSizeChange}
                onRemove={handleRemove}
                borderless={card.type === 'welcome' || card.type === 'recent'}
              >
                {renderCardContent(card)}
              </DraggableDashboardCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}
