import { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, Trash2, X } from 'lucide-react';

interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export default function ModelManageModal({ onClose }: { onClose: () => void }) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', id: '', baseUrl: '', apiKey: '' });
  const [showKey, setShowKey] = useState(false);

  const STORAGE_KEY = 'api_settings_v2';

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setModels(data.models || []);
      } else {
        setModels([]);
      }
    } catch { setModels([]); }
  };

  useEffect(() => {
    load();
  }, []);

  // 有模型时默认选中第一个（仅在初始加载且未选中时）
  useEffect(() => {
    if (models.length > 0 && !activeId) {
      setActiveId(models[0].id);
    }
    if (models.length === 0) {
      setActiveId(null);
    }
  }, [models, activeId]);

  const saveAll = (newModels: ModelItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ models: newModels }));
      window.dispatchEvent(new CustomEvent('api_settings_updated'));
    } catch { /* ignore */ }
  };

  const activeModel = models.find((m) => m.id === activeId) || null;

  const updateModel = (updated: ModelItem) => {
    const newModels = models.map((m) => (m.id === updated.id ? updated : m));
    setModels(newModels);
    saveAll(newModels);
  };

  const addModel = () => {
    if (!form.name.trim() || !form.id.trim()) return;
    if (models.some((m) => m.id === form.id.trim())) return;
    const newModel: ModelItem = {
      id: form.id.trim(),
      name: form.name.trim(),
      enabled: true,
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      model: '',
    };
    const newModels = [...models, newModel];
    setModels(newModels);
    saveAll(newModels);
    setActiveId(newModel.id);
    setIsAddOpen(false);
    setForm({ name: '', id: '', baseUrl: '', apiKey: '' });
  };

  const deleteModel = (id: string) => {
    if (!window.confirm('确定要删除该模型吗？')) return;
    const newModels = models.filter((m) => m.id !== id);
    setModels(newModels);
    saveAll(newModels);
    // 智能切换 activeId：如果被删除的是当前选中，则切换到列表中的下一个，或置空
    if (activeId === id) {
      const idx = models.findIndex((m) => m.id === id);
      const next = newModels[idx] || newModels[idx - 1] || newModels[0] || null;
      setActiveId(next ? next.id : null);
    }
    // 确保不在新增模式
    setIsAddOpen(false);
  };

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[250] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="flex flex-col w-[900px] max-w-[95vw] h-[80vh] max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">模型管理</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="关闭 (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗主体 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧列表 */}
          <div className="w-[200px] flex flex-col bg-gray-50/50 border-r border-gray-200 overflow-y-auto shrink-0 p-3">
            <button onClick={() => { setIsAddOpen(true); setActiveId(null); }} className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mb-2">
              <Plus className="w-4 h-4" />
              <span>新增模型</span>
            </button>
            {models.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无模型</p>
            ) : (
              <div className="space-y-1">
                {models.map((m) => (
                  <button key={m.id} onClick={() => { setActiveId(m.id); setIsAddOpen(false); }} className={`flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left rounded-md transition-colors ${activeId === m.id && !isAddOpen ? 'bg-brand-light text-brand border border-brand' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <span className="text-xs font-medium truncate flex-1">{m.name}</span>
                    {m.enabled && <span className="w-1.5 h-1.5 bg-brand rounded-full shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧配置 */}
          <div className="flex-1 p-5 overflow-y-auto">
            {isAddOpen ? (
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-4">新增模型</h3>
                <div className="space-y-4 max-w-[480px]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：DeepSeek" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">模型ID</label>
                    <input type="text" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="例如：deepseek" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
                    <input type="text" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand placeholder:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                    <input type="text" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="请输入 API Key" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand placeholder:text-gray-400" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={() => { setIsAddOpen(false); if (models.length > 0) setActiveId(models[0].id); }} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
                    <button onClick={addModel} disabled={!form.name.trim() || !form.id.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors">确认新增</button>
                  </div>
                </div>
              </div>
            ) : activeModel ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-[480px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900">{activeModel.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{activeModel.enabled ? '已启用' : '已禁用'}</span>
                        <button
                          type="button"
                          onClick={() => updateModel({ ...activeModel, enabled: !activeModel.enabled })}
                          className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 ${activeModel.enabled ? 'bg-brand' : 'bg-gray-300'}`}
                          style={{ width: '36px', height: '20px' }}
                        >
                          <span
                            className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${activeModel.enabled ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                        <div className="w-px h-4 bg-gray-200" />
                        <button
                          onClick={() => deleteModel(activeModel.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除模型"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
                        <input type="text" value={activeModel.name} onChange={(e) => updateModel({ ...activeModel, name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
                        <input type="text" value={activeModel.baseUrl} onChange={(e) => updateModel({ ...activeModel, baseUrl: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                        <div className="relative">
                          <input type={showKey ? 'text' : 'password'} value={activeModel.apiKey} onChange={(e) => updateModel({ ...activeModel, apiKey: e.target.value })} className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand" />
                          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 底部保存按钮 */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                  <button
                    onClick={() => {
                      saveAll(models);
                      window.dispatchEvent(new CustomEvent('api_settings_updated'));
                      const el = document.createElement('div');
                      el.className = 'fixed bottom-6 right-6 z-[100] px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in';
                      el.innerHTML = '<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>设置已保存';
                      document.body.appendChild(el);
                      setTimeout(() => el.remove(), 2000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    保存设置
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">请选择一个模型进行配置，或点击新增模型</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
