import { Eye, EyeOff, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useModels } from '@/features/models/hooks/useModels';

export function ModelManagePage() {
  const { models, activeId, activeModel, setActiveId, addModel, updateModel, deleteModel } = useModels();
  const [isAdding, setIsAdding] = useState(models.length === 0);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ name: '', id: '', baseUrl: '', apiKey: '' });

  const submitModel = () => {
    const created = addModel(form);
    if (!created) return;
    setForm({ name: '', id: '', baseUrl: '', apiKey: '' });
    setIsAdding(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">模型管理</h1>
              <p className="text-xs text-gray-400">共 {models.length} 个模型，{models.filter((model) => model.enabled).length} 个已启用</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setActiveId(null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            新增模型
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[220px] shrink-0 border-r border-gray-200 bg-white p-3">
          <button
            onClick={() => {
              setIsAdding(true);
              setActiveId(null);
            }}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            新增模型
          </button>
          {models.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">暂无模型</p>
          ) : (
            <div className="space-y-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setIsAdding(false);
                    setActiveId(model.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                    activeId === model.id && !isAdding
                      ? 'border border-brand bg-brand-light text-brand'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{model.name}</span>
                  {model.enabled && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-y-auto bg-white p-6">
          {isAdding ? (
            <section className="max-w-[520px]">
              <h2 className="mb-5 text-base font-bold text-gray-900">新增模型</h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">模型名称</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：DeepSeek" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">模型 ID</span>
                  <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="例如：deepseek-chat" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Base URL</span>
                  <input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">API Key</span>
                  <input value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder="请输入 API Key" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <button onClick={submitModel} disabled={!form.id.trim()} className="rounded-md bg-brand px-5 py-2 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300">
                  确认新增
                </button>
              </div>
            </section>
          ) : activeModel ? (
            <section className="max-w-[560px]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">{activeModel.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{activeModel.enabled ? '已启用' : '已禁用'}</span>
                  <button
                    onClick={() => updateModel(activeModel.id, { enabled: !activeModel.enabled })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${activeModel.enabled ? 'bg-brand' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${activeModel.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                  <button onClick={() => deleteModel(activeModel.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">模型名称</span>
                  <input value={activeModel.name} onChange={(event) => updateModel(activeModel.id, { name: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">模型 ID</span>
                  <input value={activeModel.model} onChange={(event) => updateModel(activeModel.id, { model: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Base URL</span>
                  <input value={activeModel.baseUrl} onChange={(event) => updateModel(activeModel.id, { baseUrl: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">API Key</span>
                  <div className="relative">
                    <input type={showKey ? 'text' : 'password'} value={activeModel.apiKey} onChange={(event) => updateModel(activeModel.id, { apiKey: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand" />
                    <button onClick={() => setShowKey((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>
            </section>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">请选择或新增模型</div>
          )}
        </main>
      </div>
    </div>
  );
}
