import { Plus, RotateCcw, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getIconByName } from '@/shared/navigation/navConfig';
import type { NavGroupConfig, NavItemConfig } from '@/shared/navigation/navConfig';

interface NavSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NavGroupConfig[];
  onSave: (config: NavGroupConfig[]) => void;
  onReset: () => void;
}

export function NavSettingsModal({ isOpen, onClose, config, onSave, onReset }: NavSettingsModalProps) {
  const [draft, setDraft] = useState<NavGroupConfig[]>([]);
  const [editingItem, setEditingItem] = useState<{ gi: number; ii: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');
  const [dragSrc, setDragSrc] = useState<{ groupIdx: number; itemIdx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ gi: number; ii: number; pos: 'before' | 'after' } | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraft(JSON.parse(JSON.stringify(config)));
    setEditingItem(null);
    setEditingGroupIdx(null);
    setShowAddGroup(false);
    setNewGroupTitle('');
  }, [config, isOpen]);

  if (!isOpen) return null;

  const saveDraft = (next: NavGroupConfig[]) => {
    setDraft(next);
    onSave(JSON.parse(JSON.stringify(next)));
  };

  const commitItemLabel = (gi: number, ii: number, value: string) => {
    const next = JSON.parse(JSON.stringify(draft)) as NavGroupConfig[];
    next[gi].items[ii].label = value.trim() || next[gi].items[ii].label;
    saveDraft(next);
  };

  const commitGroupTitle = () => {
    if (editingGroupIdx === null || !editingGroupValue.trim()) {
      setEditingGroupIdx(null);
      return;
    }
    const next = JSON.parse(JSON.stringify(draft)) as NavGroupConfig[];
    next[editingGroupIdx].title = editingGroupValue.trim();
    saveDraft(next);
    setEditingGroupIdx(null);
  };

  const toggleGroupHidden = (gi: number) => {
    const next = draft.map((group, index) => index === gi ? { ...group, hidden: !group.hidden } : group);
    saveDraft(next);
  };

  const toggleItemHidden = (gi: number, ii: number) => {
    const next = JSON.parse(JSON.stringify(draft)) as NavGroupConfig[];
    next[gi].items[ii].hidden = !next[gi].items[ii].hidden;
    saveDraft(next);
  };

  const handleDragOver = (event: React.DragEvent, gi: number, ii: number) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOver({ gi, ii, pos });
  };

  const handleDrop = (targetGroupIdx: number, targetItemIdx: number) => {
    if (!dragSrc) return;
    const next = JSON.parse(JSON.stringify(draft)) as NavGroupConfig[];
    const srcItems = next[dragSrc.groupIdx].items;
    const [moved] = srcItems.splice(dragSrc.itemIdx, 1);
    const tgtItems = next[targetGroupIdx].items;
    let insertIdx = dragOver?.pos === 'after' ? targetItemIdx + 1 : targetItemIdx;
    if (dragSrc.groupIdx === targetGroupIdx && dragSrc.itemIdx < targetItemIdx) {
      insertIdx -= 1;
    }
    insertIdx = Math.max(0, Math.min(insertIdx, tgtItems.length));
    tgtItems.splice(insertIdx, 0, moved);
    saveDraft(next);
    setDragSrc(null);
    setDragOver(null);
  };

  const handleAddGroup = () => {
    const title = newGroupTitle.trim();
    if (!title) return;
    const next = [...draft, { title, iconName: 'FolderOpen', items: [] }];
    saveDraft(next);
    setShowAddGroup(false);
    setNewGroupTitle('');
  };

  const handleDeleteGroup = (gi: number) => {
    if (gi < 5) return;
    const next = draft.filter((_, index) => index !== gi);
    saveDraft(next);
  };

  const renderGroup = (group: NavGroupConfig, gi: number) => {
    const GroupIcon = getIconByName(group.iconName);
    const isEditingTitle = editingGroupIdx === gi;
    const canDeleteGroup = gi >= 5;

    return (
      <div key={`${group.title}-${gi}`}>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <GroupIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
            {isEditingTitle ? (
              <input
                autoFocus
                value={editingGroupValue}
                onChange={(event) => setEditingGroupValue(event.target.value)}
                onBlur={commitGroupTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitGroupTitle();
                }}
                className="w-full rounded border border-brand/30 px-1 py-0.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-brand/20"
              />
            ) : (
              <button
                onDoubleClick={() => {
                  setEditingGroupIdx(gi);
                  setEditingGroupValue(group.title);
                }}
                className={`truncate text-left text-xs font-bold ${group.hidden ? 'text-gray-400' : 'text-gray-700 hover:text-brand'}`}
              >
                {group.title}
              </button>
            )}
            <span className="shrink-0 text-[10px] text-gray-400">({group.items.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {canDeleteGroup && (
              <button onClick={() => handleDeleteGroup(gi)} className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500">
                删除
              </button>
            )}
            <button
              onClick={() => toggleGroupHidden(gi)}
              className={`rounded border px-2 py-0.5 text-[10px] ${
                group.hidden ? 'border-brand/30 text-brand hover:bg-brand-light' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {group.hidden ? '恢复专区' : '隐藏专区'}
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          {group.items.map((item: NavItemConfig, ii: number) => {
            const ItemIcon = getIconByName(item.iconName);
            const isEditing = editingItem?.gi === gi && editingItem?.ii === ii;
            const isHidden = !!item.hidden;

            return (
              <div key={`${item.label}-${ii}`} className="relative">
                {dragOver?.gi === gi && dragOver?.ii === ii && dragOver.pos === 'before' && (
                  <div className="absolute -top-[3px] left-0 right-0 z-10 h-[3px] rounded-full bg-brand" />
                )}
                <div
                  draggable={!isEditing && !isHidden}
                  onDragStart={() => setDragSrc({ groupIdx: gi, itemIdx: ii })}
                  onDragOver={(event) => handleDragOver(event, gi, ii)}
                  onDrop={() => handleDrop(gi, ii)}
                  onDragEnd={() => {
                    setDragSrc(null);
                    setDragOver(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-md border-2 px-2 py-2 transition-all ${
                    isHidden
                      ? 'border-transparent bg-gray-100 opacity-60'
                      : dragSrc?.groupIdx === gi && dragSrc?.itemIdx === ii
                        ? 'scale-[0.98] border-dashed border-brand/40 bg-brand/10 opacity-60'
                        : 'border-transparent bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`shrink-0 text-gray-400 ${isHidden ? 'opacity-40' : ''}`}>⋯⋯</span>
                  <ItemIcon className={`h-3 w-3 shrink-0 ${isHidden ? 'text-gray-300' : 'text-gray-400'}`} />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onBlur={() => {
                        commitItemLabel(gi, ii, editingValue);
                        setEditingItem(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitItemLabel(gi, ii, editingValue);
                          setEditingItem(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-brand/30 px-1 py-0.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-brand/20"
                    />
                  ) : (
                    <>
                      <span className={`min-w-0 flex-1 truncate text-xs ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                      <button
                        onClick={() => {
                          setEditingItem({ gi, ii });
                          setEditingValue(item.label);
                        }}
                        className="rounded px-1 py-0.5 text-[10px] text-brand hover:bg-brand-light"
                      >
                        修改
                      </button>
                      <button
                        onClick={() => toggleItemHidden(gi, ii)}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${isHidden ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                      >
                        {isHidden ? '恢复' : '隐藏'}
                      </button>
                    </>
                  )}
                </div>
                {dragOver?.gi === gi && dragOver?.ii === ii && dragOver.pos === 'after' && (
                  <div className="absolute -bottom-[3px] left-0 right-0 z-10 h-[3px] rounded-full bg-brand" />
                )}
              </div>
            );
          })}

          {group.items.length === 0 && (
            <div className="rounded-md border border-dashed border-gray-200 px-2 py-4 text-center text-xs text-gray-300">
              空专区，可从其他专区拖拽导航项过来
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex max-h-[85vh] w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Settings className="h-4 w-4 text-brand" />
              导航设置
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">支持双击改名、隐藏显示、跨专区拖拽排序。</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 gap-4 overflow-y-auto p-5">
          <div className="flex flex-1 flex-col gap-4">
            {draft.slice(0, 2).map((group, index) => renderGroup(group, index))}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {draft.slice(2).map((group, index) => renderGroup(group, index + 2))}
            {showAddGroup ? (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-2">
                <input
                  autoFocus
                  value={newGroupTitle}
                  onChange={(event) => setNewGroupTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddGroup();
                  }}
                  placeholder="输入专区名称"
                  className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
                />
                <button onClick={handleAddGroup} className="rounded bg-brand px-2 py-1.5 text-xs text-white hover:bg-brand-dark">
                  确认
                </button>
                <button onClick={() => { setShowAddGroup(false); setNewGroupTitle(''); }} className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                  取消
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddGroup(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand/30 px-3 py-2 text-xs text-brand hover:bg-brand-light">
                <Plus className="h-3.5 w-3.5" />
                新增专区
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
          <button onClick={() => { onReset(); onClose(); }} className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
