import { useState, useRef } from 'react';
import {
  Settings, Plus, Check, Trash2, GripVertical, Sparkles,
  Layers, Link, TrendingUp, LayoutGrid, Hash, Star, Zap,
  RotateCcw,
} from 'lucide-react';
import { useExtractModules, DEFAULT_MODULES } from '@/hooks/useExtractModules';
import { toPinyin } from '@/lib/pinyin';

const MODULE_ICONS: Record<string, typeof Layers> = {
  juqing: Layers, yinguoluoji: Link, zhuangtaizengliang: TrendingUp,
  tuijiandapei: LayoutGrid, juqingleixing: Sparkles, biaoqian: Hash,
  huangjinsanzhangbeizhu: Star, jiazhipinggu: Zap,
};

export default function ExtractModuleManage() {
  const { allModules, moduleKeys, activeKeys, addModule, updateModule, deleteModule, toggleActive, reorderModules, resetToDefault, isModified } = useExtractModules();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ key: '', label: '', instruction: '' });

  // 拖拽状态
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const selectModule = (id: string) => {
    const mod = allModules[id];
    if (!mod) return;
    setEditingId(id);
    setIsCreating(false);
    setForm({ key: mod.key, label: mod.label, instruction: mod.instruction });
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setForm({ key: '', label: '', instruction: '' });
  };

  const handleSave = () => {
    if (!form.label.trim() || !form.instruction.trim()) return;
    if (isCreating) {
      const id = addModule(form);
      setIsCreating(false);
      setEditingId(id);
    } else if (editingId) {
      updateModule(editingId, form);
    }
  };

  const handleDelete = (id: string) => {
    if (DEFAULT_MODULES[id]) return;
    if (!confirm('确定删除这个模块吗？')) return;
    deleteModule(id);
    if (editingId === id) { setEditingId(null); setForm({ key: '', label: '', instruction: '' }); }
  };

  // 拖拽事件
  const handleDragStart = (id: string) => { setDragId(id); };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragId && dragId !== id) setDragOverId(id);
  };
  const handleDragLeave = () => { setDragOverId(null); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragId && dragId !== targetId) reorderModules(dragId, targetId);
    setDragId(null);
    setDragOverId(null);
  };

  const currentModule = editingId ? allModules[editingId] : null;
  const isBuiltIn = editingId ? !!DEFAULT_MODULES[editingId] : false;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题栏 */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <div>
            <h1 className="text-base font-bold text-gray-900">提炼模块管理</h1>
            <p className="text-[10px] text-gray-400">拖拽调整顺序，勾选控制激活，AI将按此顺序操作</p>
          </div>
        </div>
      </div>

      {/* 左右布局 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：可拖拽排序的模块列表 */}
        <div className="w-[260px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">模块列表（拖拽排序）</span>
            <button onClick={startCreate}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-brand bg-brand-light rounded hover:bg-brand-light/80 transition-colors">
              <Plus className="w-3 h-3" /> 新建
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {moduleKeys.map(id => {
              const mod = allModules[id];
              if (!mod) return null;
              const Icon = MODULE_ICONS[id] || Layers;
              const isActive = activeKeys.includes(id);
              const isSelected = editingId === id;
              const isBuiltInItem = !!DEFAULT_MODULES[id];
              const isDragOver = dragOverId === id;

              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(id)}
                  onDragOver={e => handleDragOver(e, id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, id)}
                  className={`border-b border-gray-50 transition-colors ${isDragOver ? 'bg-brand-light/50 border-t-2 border-t-brand' : ''}`}
                >
                  <button onClick={() => selectModule(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isSelected ? 'bg-brand-light/70' : 'hover:bg-gray-50'
                    }`}>
                    {/* 拖拽手柄 */}
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0 cursor-grab active:cursor-grabbing" />

                    {/* 激活勾选 */}
                    <div onClick={e => { e.stopPropagation(); toggleActive(id); }}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        isActive ? 'bg-brand border-brand' : 'border-gray-300 hover:border-brand'
                      }`}>
                      {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>

                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-gray-400'}`} />

                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium truncate ${isSelected ? 'text-brand' : 'text-gray-700'}`}>{mod.label}</span>
                    </div>

                    {!isBuiltInItem && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(id); }}
                        className="p-0.5 text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400">
            共 {moduleKeys.length} 个 · {activeKeys.length} 个已激活 · 拖拽可排序
          </div>
        </div>

        {/* 右侧：编辑面板 */}
        <div className="flex-1 overflow-y-auto p-4">
          {!editingId && !isCreating ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Settings className="w-10 h-10 mb-3 text-gray-200" />
              <p className="text-sm">从左侧选择一个模块查看或编辑</p>
              <p className="text-xs mt-1">拖拽 <GripVertical className="w-3 h-3 inline" /> 图标可调整模块顺序</p>
              <button onClick={startCreate}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm text-brand border border-brand rounded-lg hover:bg-brand-light transition-colors">
                <Plus className="w-4 h-4" /> 新建模块
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* 编辑表单 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">
                    {isCreating ? '新建模块' : '编辑模块'}
                  </h3>
                  {!isCreating && isBuiltIn && isModified(editingId) && (
                    <button onClick={() => {
                      if (confirm('确定恢复为默认设置吗？自定义修改将丢失。')) {
                        resetToDefault(editingId);
                        // 刷新表单显示默认值
                        const defaultMod = DEFAULT_MODULES[editingId];
                        if (defaultMod) setForm({ key: defaultMod.key, label: defaultMod.label, instruction: defaultMod.instruction });
                      }
                    }} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:underline">
                      <RotateCcw className="w-3 h-3" /> 恢复默认
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* 第一行：显示名称 + JSON字段名 并排 */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        显示名称 <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={form.label}
                        onChange={e => {
                          const label = e.target.value;
                          // 新建时自动根据显示名称生成拼音 key
                          const newKey = isCreating
                            ? toPinyin(label.trim())
                            : form.key;
                          setForm({ ...form, label, key: newKey });
                        }}
                        placeholder="如：剧情"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">JSON 字段名</label>
                      <input
                        value={form.key}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* 第二行：提示词 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">提示词 <span className="text-red-400">*</span></label>
                    <textarea value={form.instruction} onChange={e => setForm({ ...form, instruction: e.target.value })}
                      placeholder="输入提示词，告诉AI如何处理这个维度..." rows={8}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none" />
                  </div>

                  {/* 底部按钮 */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={() => { setEditingId(null); setIsCreating(false); }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
                    <button onClick={handleSave} disabled={!form.label.trim() || !form.instruction.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">
                      <Check className="w-4 h-4" /> {isCreating ? '创建' : '保存'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
