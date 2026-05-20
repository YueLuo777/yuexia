import { Bot, Eye, EyeOff, GripVertical, Plus, Server } from 'lucide-react';
import { useRef, useState } from 'react';

import { useModels } from '@/features/models/hooks/useModels';

export function ModelManagePage() {
  const { models, addModel, updateModel, deleteModel, reorderModels } = useModels();
  const [showKey, setShowKey] = useState(false);
  const [isAdding, setIsAdding] = useState(models.length === 0);
  const [form, setForm] = useState({ name: '', id: '', baseUrl: '', apiKey: '' });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const enabledCount = models.filter((model) => model.enabled).length;

  const submitModel = () => {
    const created = addModel(form);
    if (!created) return;
    setForm({ name: '', id: '', baseUrl: '', apiKey: '' });
    setIsAdding(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
            <Server className="h-4 w-4 text-brand" />
          </div>
          <h1 className="text-base font-bold text-gray-900">模型管理</h1>
          <span className="rounded-md bg-orange-500 px-2 py-0.5 text-xs text-white">已启用 {enabledCount} 个模型</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>新增模型</span>
          </button>
          {models.length > 1 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <GripVertical className="h-3 w-3" />
              拖拽卡片可调整模型顺序
            </span>
          )}
        </div>

        {isAdding && (
          <div className="mb-5 max-w-[420px] rounded-lg border border-gray-200 bg-white p-4">
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="模型名称，例如 DeepSeek V4 Flash"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={form.id}
                onChange={(event) => setForm({ ...form, id: event.target.value })}
                placeholder="模型 ID，例如 deepseek-v4-flash"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={form.baseUrl}
                onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
                placeholder="Base URL"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                  placeholder="API Key"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm outline-none focus:border-brand"
                />
                <button onClick={() => setShowKey((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button onClick={submitModel} disabled={!form.id.trim()} className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300">
                确认新增
              </button>
            </div>
          </div>
        )}

        {models.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-5">
            {models.map((model, index) => (
              <div
                key={model.id}
                draggable
                onDragStart={() => { dragIndexRef.current = index; }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = dragIndexRef.current;
                  if (typeof from === 'number') reorderModels(from, index);
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                className={`cursor-grab rounded-lg border p-[21px] transition-colors active:cursor-grabbing hover:border-gray-300 ${dragOverIndex === index ? 'border-brand ring-1 ring-brand' : 'border-gray-200 bg-white'}`}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${model.enabled ? 'bg-brand-light text-brand' : 'bg-gray-100 text-gray-400'}`}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-gray-900">{model.name}</div>
                  </div>
                  <button
                    onClick={() => updateModel(model.id, { locked: !model.locked })}
                    className={`shrink-0 rounded border px-2.5 py-1 text-sm transition-colors ${model.locked ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                  >
                    {model.locked ? '已锁定' : '锁定'}
                  </button>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span className="shrink-0">模型ID:</span>
                    <span className="truncate text-gray-700">{model.model}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span className="shrink-0">状态:</span>
                    <span className={model.enabled ? 'text-emerald-600' : 'text-gray-400'}>{model.enabled ? '正常' : '未启用'}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                    <button className="flex-1 rounded border border-brand/30 py-1.5 text-sm text-brand hover:bg-brand-light">编辑模型</button>
                    <button className="flex-1 rounded border border-sky-300 py-1.5 text-sm text-sky-500 hover:bg-sky-50">API测试</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateModel(model.id, { enabled: !model.enabled })}
                      className={`flex-1 rounded border py-1.5 text-sm transition-colors ${model.enabled ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-brand/30 text-brand hover:bg-brand-light'}`}
                    >
                      {model.enabled ? '取消启用' : '模型启动'}
                    </button>
                    <button
                      onClick={() => {
                        if (!model.locked && window.confirm(`确定要删除“${model.name}”吗？`)) deleteModel(model.id);
                      }}
                      disabled={model.locked}
                      className={`flex-1 rounded border py-1.5 text-sm transition-colors ${model.locked ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-red-300 text-red-500 hover:bg-red-50'}`}
                    >
                      {model.locked ? '已锁定' : '删除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {models.length === 0 && !isAdding && (
          <div className="py-10 text-center text-sm text-gray-400">
            暂无模型，请点击“新增模型”
          </div>
        )}
      </div>
    </div>
  );
}
