import { useState, useEffect, useCallback } from 'react';
import {
  Server, Bot, Eye, EyeOff, Trash2,
  CheckCircle, Plus, X, Copy, Pencil, Power, PowerOff, Lock, Unlock, Wifi,
} from 'lucide-react';
// Layout removed - local app mode

/* ─── 数据类型 ─── */
export interface ApiModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  connectionStatus: 'untested' | 'testing' | 'connected' | 'failed' | 'disabled';
  apiKey: string;
  baseUrl: string;
  model: string;
  description: string;
}

export interface ApiSettingsData {
  models: ApiModelConfig[];
}

const STORAGE_KEY = 'api_settings_v2';

/* ─── 加载/保存工具 ─── */
function loadSettings(): ApiSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ApiSettingsData;
  } catch { /* ignore */ }
  return { models: [] };
}

function saveSettings(data: ApiSettingsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('api_settings_updated'));
  } catch { /* ignore */ }
}

/* ─── 新增/编辑模型弹窗 ─── */
function ModelFormModal({
  isOpen,
  model,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  model: ApiModelConfig | null;
  onClose: () => void;
  onSave: (model: ApiModelConfig) => void;
}) {
  const [form, setForm] = useState({ name: '', id: '', baseUrl: '', apiKey: '' });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (model) {
        setForm({ name: model.name, id: model.id, baseUrl: model.baseUrl, apiKey: model.apiKey });
      } else {
        setForm({ name: '', id: '', baseUrl: '', apiKey: '' });
      }
    }
  }, [isOpen, model]);

  if (!isOpen) return null;

  const isEdit = model !== null;
  const handleSubmit = () => {
    if (!form.name.trim() || !form.id.trim()) return;
    onSave({
      id: form.id.trim(),
      name: form.name.trim(),
      enabled: model ? model.enabled : true,
      locked: model ? model.locked : false,
      connectionStatus: model ? model.connectionStatus : 'untested',
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      model: model ? model.model : '',
      description: model ? model.description : '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-gray-900">{isEdit ? '编辑模型' : '新增模型'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：DeepSeek" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型ID</label>
            <input type="text" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="例如：deepseek" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">接口地址</label>
            <input type="text" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="请输入 API Key" className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.name.trim() || !form.id.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isEdit ? '保存修改' : '确认新增'}</button>
        </div>
      </div>
    </div>
  );
}


/* ─── 主页面 ─── */
export default function ApiSettings() {
  const [settings, setSettings] = useState<ApiSettingsData>(loadSettings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ApiModelConfig | null>(null);
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: '', show: false });

  // 静默自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings(settings);
    }, 500);
    return () => clearTimeout(timer);
  }, [settings]);

  const showToast = useCallback((text: string) => {
    setToast({ text, show: true });
    setTimeout(() => setToast({ text: '', show: false }), 2000);
  }, []);

  const updateModel = (updated: ApiModelConfig) => {
    setSettings((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === updated.id ? updated : m)),
    }));
  };

  const addModel = (model: ApiModelConfig) => {
    setSettings((prev) => {
      if (prev.models.some((m) => m.id === model.id)) {
        showToast('模型ID已存在');
        return prev;
      }
      return { ...prev, models: [...prev.models, model] };
    });
    showToast('模型已添加');
  };

  const testConnection = async (model: ApiModelConfig) => {
    // Set status to testing
    setSettings((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === model.id ? { ...m, connectionStatus: 'testing' } : m)),
    }));
    try {
      const res = await fetch(`${model.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setSettings((prev) => ({
          ...prev,
          models: prev.models.map((m) => (m.id === model.id ? { ...m, connectionStatus: 'connected' } : m)),
        }));
        showToast('连接成功');
      } else {
        setSettings((prev) => ({
          ...prev,
          models: prev.models.map((m) => (m.id === model.id ? { ...m, connectionStatus: 'failed' } : m)),
        }));
        showToast('连接失败');
      }
    } catch {
      setSettings((prev) => ({
        ...prev,
        models: prev.models.map((m) => (m.id === model.id ? { ...m, connectionStatus: 'failed' } : m)),
      }));
      showToast('连接失败');
    }
  };

  const toggleLock = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)),
    }));
  };

  const deleteModel = (id: string) => {
    const model = settings.models.find((m) => m.id === id);
    if (model?.locked) {
      showToast('已锁定的模型无法删除');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== id),
    }));
    showToast('模型已删除');
  };

  const handleSaveModel = (model: ApiModelConfig) => {
    if (editingModel) {
      updateModel(model);
      showToast('修改已保存');
    } else {
      addModel(model);
    }
  };

  const openAddModal = () => {
    setEditingModel(null);
    setIsModalOpen(true);
  };

  const openEditModal = (model: ApiModelConfig) => {
    setEditingModel(model);
    setIsModalOpen(true);
  };

  const enabledCount = settings.models.filter((m) => m.enabled).length;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex flex-col h-full">
        {/* 页面头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-brand" />
            </div>
            <h1 className="text-base font-bold text-gray-900">模型管理</h1>
            <span className="px-2 py-0.5 text-xs text-white bg-orange-500 rounded-md">
              已启用 {enabledCount} 个模型            </span>
          </div>
        </div>

        {/* 模型卡片网格 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={openAddModal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>新增模型</span>
            </button>
            {settings.models.length === 0 && (
              <span className="text-xs text-gray-400">暂无模型，请点击新增</span>
            )}
          </div>
          {settings.models.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {settings.models.map((model) => (
                <div
                  key={model.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  {/* 卡片头部 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${model.enabled ? 'bg-brand-light text-brand' : 'bg-gray-100 text-gray-400'}`}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{model.name}</div>
                    </div>
                    <button
                      onClick={() => toggleLock(model.id)}
                      className={`shrink-0 text-xs px-2 py-0.5 rounded border transition-colors ${model.locked ? 'text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:bg-gray-50'}`}
                    >
                      {model.locked ? '已锁定' : '锁定'}
                    </button>
                  </div>

                  {/* 信息表 */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="shrink-0">模型ID:</span>
                      <span className="text-gray-700 truncate">{model.id}</span>

                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="shrink-0">状态：</span>
                      {model.enabled ? (
                        <span className={`text-xs ${model.connectionStatus === 'connected' ? 'text-emerald-600' : model.connectionStatus === 'failed' ? 'text-red-500' : model.connectionStatus === 'testing' ? 'text-amber-500' : 'text-gray-400'}`}>
                          {model.connectionStatus === 'connected' ? '正常' : model.connectionStatus === 'failed' ? '失败' : model.connectionStatus === 'testing' ? '测试中…' : '未测试'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">未启用</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="pt-3 border-t border-gray-100 space-y-1.5">
                    {/* 第一行 */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(model)}
                        className="flex-1 text-center py-1 text-xs text-brand border border-brand/30 rounded hover:bg-brand-light transition-colors"
                      >
                        编辑模型
                      </button>
                      <button
                        onClick={() => testConnection(model)}
                        disabled={model.connectionStatus === 'testing'}
                        className={`flex-1 text-center py-1 text-xs rounded border transition-colors ${model.connectionStatus === 'testing' ? 'text-sky-400 border-sky-200 bg-sky-50 cursor-not-allowed' : 'text-sky-500 border-sky-300 hover:text-sky-700 hover:bg-sky-50'}`}
                      >
                        {model.connectionStatus === 'testing' ? '测试中…' : 'API测试'}
                      </button>
                    </div>
                    {/* 第二行 */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateModel({ ...model, enabled: !model.enabled })}
                        className={`flex-1 text-center py-1 text-xs rounded transition-colors border ${model.enabled ? 'text-orange-600 border-orange-300 hover:text-orange-700 hover:bg-orange-50' : 'text-brand border-brand/30 hover:bg-brand-light'}`}
                      >
                        {model.enabled ? '取消启用' : '模型启动'}
                      </button>
                      <button
                        onClick={() => { if (!model.locked && window.confirm(`确定要删除"${model.name}"吗？`)) { deleteModel(model.id); } }}
                        disabled={model.locked}
                        className={`flex-1 text-center py-1 text-xs rounded transition-colors border ${model.locked ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-red-500 border-red-300 hover:text-red-700 hover:bg-red-50'}`}
                      >
                        {model.locked ? '已锁定' : '删除'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑模型弹窗 */}
      <ModelFormModal isOpen={isModalOpen} model={editingModel} onClose={() => setIsModalOpen(false)} onSave={handleSaveModel} />

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {toast.text}
        </div>
      )}
    </div>
  );
}
