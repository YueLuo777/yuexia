import { useState, useEffect, useCallback } from 'react';
import { X, GripVertical, RotateCcw, Settings, Plus } from 'lucide-react';
import { getIconByName } from '@/utils/navConfig';
import type { NavGroupConfig, NavItemConfig } from '@/utils/navConfig';

interface NavSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NavGroupConfig[];
  onSave: (config: NavGroupConfig[]) => void;
  onReset: () => void;
}

export default function NavSettingsModal({ isOpen, onClose, config, onSave, onReset }: NavSettingsModalProps) {
  const [draft, setDraft] = useState<NavGroupConfig[]>([]);
  const [ready, setReady] = useState(false);
  const [editingIdx, setEditingIdx] = useState<{ gi: number; ii: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragSrc, setDragSrc] = useState<{ groupIdx: number; itemIdx: number } | null>(null);
  // 专区标题编辑状态
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');
  // 新增专区弹窗
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  // 实时保存封装：每次修改 draft 后自动持久化
  const saveDraft = useCallback((next: NavGroupConfig[]) => {
    setDraft(next);
    onSave(JSON.parse(JSON.stringify(next)));
  }, [onSave]);

  useEffect(() => {
    if (isOpen) {
      const copy = JSON.parse(JSON.stringify(config));
      setDraft(copy);
      setReady(true);
      setEditingIdx(null);
      setEditValue('');
      setDragSrc(null);
      setEditingGroupIdx(null);
      setShowAddGroup(false);
      setNewGroupTitle('');
    } else {
      setDraft([]);
      setReady(false);
      setEditingIdx(null);
      setEditingGroupIdx(null);
    }
  }, [isOpen, config]);

  if (!isOpen || !ready || draft.length === 0) return null;

  // ── 保存编辑值 ──
  const commitEditValue = (gi: number, ii: number, value: string) => {
    const next = JSON.parse(JSON.stringify(draft));
    next[gi].items[ii].label = value;
    saveDraft(next);
  };

  const startEdit = (gi: number, ii: number, currentLabel: string) => {
    if (editingIdx && (editingIdx.gi !== gi || editingIdx.ii !== ii)) {
      commitEditValue(editingIdx.gi, editingIdx.ii, editValue);
    }
    setEditingIdx({ gi, ii });
    setEditValue(currentLabel);
  };

  const finishEdit = () => {
    if (editingIdx) {
      commitEditValue(editingIdx.gi, editingIdx.ii, editValue);
    }
    setEditingIdx(null);
  };

  // ── 双击编辑专区标题 ──
  const startEditGroupTitle = (gi: number, currentTitle: string) => {
    setEditingGroupIdx(gi);
    setEditingGroupValue(currentTitle);
  };

  const commitGroupTitle = () => {
    if (editingGroupIdx !== null && editingGroupValue.trim()) {
      const next = JSON.parse(JSON.stringify(draft));
      next[editingGroupIdx].title = editingGroupValue.trim();
      saveDraft(next);
    }
    setEditingGroupIdx(null);
  };

  // 隐藏/恢复专区
  const toggleGroupHidden = (gi: number) => {
    const next = draft.map((group, i) =>
      i === gi ? { ...group, hidden: !group.hidden } : group
    );
    saveDraft(next);
  };

  // ── 新增专区 ──
  const handleAddGroup = () => {
    const title = newGroupTitle.trim();
    if (!title) return;
    const next = JSON.parse(JSON.stringify(draft));
    next.push({
      title,
      iconName: 'FolderOpen',
      items: [],
    });
    saveDraft(next);
    setNewGroupTitle('');
    setShowAddGroup(false);
  };

  // ── 删除专区（仅用户创建的） ──
  const handleDeleteGroup = (gi: number) => {
    // 保护默认专区不被删除（前5个为默认）
    if (gi < 5) return;
    const next = JSON.parse(JSON.stringify(draft));
    next.splice(gi, 1);
    saveDraft(next);
  };

  // ── 拖拽排序（支持跨专区） ──
  const handleDragStart = (groupIdx: number, itemIdx: number) => {
    setDragSrc({ groupIdx, itemIdx });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetGroupIdx: number, targetItemIdx: number) => {
    if (!dragSrc) return;
    const next = JSON.parse(JSON.stringify(draft));
    const srcItems = next[dragSrc.groupIdx].items;
    const [moved] = srcItems.splice(dragSrc.itemIdx, 1);
    const tgtItems = next[targetGroupIdx].items;
    const insertIdx = Math.min(targetItemIdx, tgtItems.length);
    tgtItems.splice(insertIdx, 0, moved);
    saveDraft(next);
    setDragSrc(null);
    setEditingIdx(null);
  };

  // ── 隐藏/恢复 ──
  const toggleHidden = (gi: number, ii: number) => {
    const next = JSON.parse(JSON.stringify(draft));
    next[gi].items[ii].hidden = !next[gi].items[ii].hidden;
    saveDraft(next);
    setEditingIdx(null);
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  // ── 渲染单个专区 ──
  const renderGroup = (group: NavGroupConfig, gi: number) => {
    if (!group) return null;
    const GroupIcon = getIconByName(group.iconName);
    const isEditingTitle = editingGroupIdx === gi;
    const isDefaultGroup = gi < 2;
    return (
      <div key={gi}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <GroupIcon className="w-3.5 h-3.5 text-brand shrink-0" />
            {isEditingTitle ? (
              <input
                autoFocus
                type="text"
                value={editingGroupValue}
                onChange={(e) => setEditingGroupValue(e.target.value)}
                onBlur={commitGroupTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') commitGroupTitle(); }}
                className="text-xs bg-white border border-brand/30 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-brand/20 text-gray-700 font-bold w-full"
              />
            ) : (
              <span
                onDoubleClick={() => startEditGroupTitle(gi, group.title)}
                className={`text-xs font-bold truncate cursor-pointer select-none ${group.hidden ? 'text-gray-400' : 'text-gray-700'} hover:text-brand transition-colors`}
                title="双击修改专区名"
              >
                {group.title}
              </span>
            )}
            <span className="text-[10px] text-gray-400 shrink-0">({group.items?.length || 0}个)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isDefaultGroup && (
              <button
                onClick={() => handleDeleteGroup(gi)}
                className="text-[10px] px-1.5 py-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="删除专区"
              >
                删除
              </button>
            )}
            <button
              onClick={() => toggleGroupHidden(gi)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                group.hidden
                  ? 'text-brand border border-brand/30 hover:bg-brand-light'
                  : 'text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {group.hidden ? '恢复专区' : '隐藏专区'}
            </button>
          </div>
        </div>
        <div className="space-y-0.5">
          {(group.items || []).map((item: NavItemConfig, ii: number) => {
            const ItemIcon = getIconByName(item.iconName);
            const isEditing = editingIdx?.gi === gi && editingIdx?.ii === ii;
            const isHidden = !!item.hidden;
            return (
              <div
                key={ii}
                draggable={!isEditing && !isHidden}
                onDragStart={() => handleDragStart(gi, ii)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(gi, ii)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${
                  isHidden
                    ? 'bg-gray-100 opacity-60'
                    : dragSrc?.groupIdx === gi && dragSrc?.itemIdx === ii
                      ? 'bg-brand/10 border border-dashed border-brand/30'
                      : 'bg-gray-50/50 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <GripVertical className={`w-3 h-3 shrink-0 ${isEditing || isHidden ? 'text-gray-200' : 'text-gray-300 cursor-grab active:cursor-grabbing'}`} />
                <ItemIcon className={`w-3 h-3 shrink-0 ${isHidden ? 'text-gray-300' : 'text-gray-400'}`} />
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(); }}
                    className="flex-1 text-xs bg-white border border-brand/30 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-brand/20 text-gray-700 min-w-0"
                  />
                ) : (
                  <>
                    <span className={`flex-1 text-xs truncate min-w-0 ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                    <button
                      onClick={() => startEdit(gi, ii, item.label)}
                      className="shrink-0 text-[10px] text-brand hover:text-brand-dark px-1 py-0.5 rounded hover:bg-brand-light transition-colors"
                      title="修改名字"
                    >
                      修改
                    </button>
                    <button
                      onClick={() => toggleHidden(gi, ii)}
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        isHidden
                          ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                      }`}
                      title={isHidden ? '恢复显示' : '隐藏'}
                    >
                      {isHidden ? '恢复' : '隐藏'}
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {group.items.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(gi, 0)}
              className="px-2 py-3 text-xs text-gray-300 border border-dashed border-gray-200 rounded-md hover:border-brand/30 hover:bg-brand/5 transition-colors text-center cursor-pointer"
            >
              空专区，可从其他专区拖拽导航项过来
            </div>
          )}
        </div>
      </div>
    );
  };

  // 按用户要求分两组
  const leftGroups = [draft[0]];               // 用户专区
  const rightGroups = [draft[1]];             // 创作专区
  // 用户自定义专区分配到右列底部
  const customGroups = draft.slice(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[680px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand" />
              导航设置
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">双击专区名可修改，拖拽可跨专区调整顺序，修改自动保存</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5 flex gap-4">
          {/* 左列 */}
          <div className="flex-1 flex flex-col gap-4">
            {renderGroup(leftGroups[0], 0)}
            {renderGroup(leftGroups[1], 2)}
          </div>
          {/* 右列 */}
          <div className="flex-1 flex flex-col gap-4">
            {renderGroup(rightGroups[0], 1)}
            {renderGroup(rightGroups[1], 3)}
            {/* 用户自定义专区 */}
            {customGroups.map((_, idx) => renderGroup(_, idx + 2))}
            {/* 新增专区按钮 */}
            {showAddGroup ? (
              <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
                <input
                  autoFocus
                  type="text"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); }}
                  placeholder="输入专区名称"
                  className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-brand"
                />
                <button onClick={handleAddGroup} className="text-xs px-2 py-1.5 text-white bg-brand rounded hover:bg-brand-dark">确认</button>
                <button onClick={() => { setShowAddGroup(false); setNewGroupTitle(''); }} className="text-xs px-2 py-1.5 text-gray-500 border border-gray-200 rounded hover:bg-gray-50">取消</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddGroup(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-brand border border-dashed border-brand/30 rounded-lg hover:bg-brand-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 新增专区
              </button>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> 恢复默认
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">关闭</button>
        </div>
      </div>
    </div>
  );
}
