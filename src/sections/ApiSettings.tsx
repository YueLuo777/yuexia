import { useState, useEffect, useCallback } from 'react';
import {
  Server, Bot, Eye, EyeOff, Save, Trash2, Activity,
  CheckCircle, Plus, X,
} from 'lucide-react';
// Layout removed - local app mode

/* ─── 数据类型 ─── */
export interface ApiModelConfig {
  id: string;
  name: string;
  enabled: boolean;
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

/* ─── 新增模型弹窗 ─── */
function AddModelModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (model: ApiModelConfig) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    id: '',
    model: '',
    baseUrl: '',
    apiKey: '',
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!form.name.trim() || !form.id.trim()) return;
    onAdd({
      id: form.id.trim(),
      name: form.name.trim(),
      enabled: true,
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      model: form.model.trim(),
      description: '',
    });
    setForm({ name: '', id: '', model: '', baseUrl: '', apiKey: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-gray-900">新增模型</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
            <input type="text" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <input type="text" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="请输入 API Key" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.name.trim() || !form.id.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">确认新增</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 右侧配置面板 ─── */
function ConfigPanel({
  model,
  onChange,
  onDelete,
  onSave,
}: {
  model: ApiModelConfig | null;
  onChange: (updated: ApiModelConfig) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Bot className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">请在左侧选择一个模型进行配置</p>
      </div>
    );
  }

  const handleTest = async () => {
    setStatus('testing');
    // 模拟测试：如果有 apiKey 和 baseUrl 就认为成功
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (model.apiKey.trim() && model.baseUrl.trim()) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  const statusText = status === 'idle' ? '未测试' : status === 'testing' ? '测试中...' : status === 'success' ? '连接成功' : '连接失败';
  const statusColor = status === 'success' ? 'text-emerald-500' : status === 'error' ? 'text-red-500' : status === 'testing' ? 'text-blue-500' : 'text-gray-400';

  return (
    <div className="h-full overflow-y-auto">
      {/* 模型头部信息 */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${model.enabled ? 'bg-brand-light text-brand' : 'bg-gray-100 text-gray-400'}`}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{model.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 启用开关 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{model.enabled ? '已启用' : '已禁用'}</span>
            <button
              type="button"
              onClick={() => onChange({ ...model, enabled: !model.enabled })}
              className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 ${model.enabled ? 'bg-brand' : 'bg-gray-200'}`}
              style={{ width: '36px', height: '20px' }}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${model.enabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={() => { if (window.confirm(`确定要删除「${model.name}」吗？`)) { onDelete(model.id); } }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="删除模型"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 配置表单 */}
      <div className="space-y-4">
        {/* 模型名称 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">模型名称</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">状态：</span>
              <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
            </div>
          </div>
          <input type="text" value={model.name} onChange={(e) => onChange({ ...model, name: e.target.value })} placeholder="请输入模型名称" className="w-1/2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand transition-all placeholder:text-gray-400" />
        </div>

        {/* 模型ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型ID</label>
          <input type="text" value={model.id} onChange={(e) => onChange({ ...model, id: e.target.value })} placeholder="例如：deepseek" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand transition-all placeholder:text-gray-400" />
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input type="text" value={model.baseUrl} onChange={(e) => onChange({ ...model, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand transition-all placeholder:text-gray-400" />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={model.apiKey} onChange={(e) => onChange({ ...model, apiKey: e.target.value })} placeholder="请输入 API Key" className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand transition-all placeholder:text-gray-400" />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors disabled:opacity-60"
          >
            <Activity className="w-4 h-4" />
            状态测试
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 主页面 ─── */
export default function ApiSettings() {
  const [settings, setSettings] = useState<ApiSettingsData>(loadSettings);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: '', show: false });

  // 自动选择第一个模型
  useEffect(() => {
    if (settings.models.length > 0 && !activeModelId) {
      setActiveModelId(settings.models[0].id);
    }
  }, [settings.models, activeModelId]);

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

  const activeModel = activeModelId ? settings.models.find((m) => m.id === activeModelId) || null : null;

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
    setActiveModelId(model.id);
    showToast('模型已添加');
  };

  const deleteModel = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== id),
    }));
    if (activeModelId === id) {
      const remaining = settings.models.filter((m) => m.id !== id);
      setActiveModelId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('模型已删除');
  };

  const handleSave = () => {
    saveSettings(settings);
    showToast('设置已保存');
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
            <h1 className="text-base font-bold text-gray-900">模型设置</h1>
            <span className="px-2 py-0.5 text-xs text-white bg-orange-500 rounded-md">
              已启用 {enabledCount} 个模型
            </span>
          </div>
        </div>

        {/* 左右结构主体 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧导航面板 */}
          <div className="w-[180px] flex flex-col bg-gray-50/50 border-r border-gray-200 overflow-y-auto shrink-0 p-3">
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors mb-3">
              <Plus className="w-4 h-4" />
              <span>新增模型</span>
            </button>
            {settings.models.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <Bot className="w-7 h-7 mb-1.5" />
                <p className="text-xs text-center">暂无模型</p>
                <p className="text-[10px] text-gray-300">点击上方按钮新增</p>
              </div>
            ) : (
              <div className="space-y-1">
                {settings.models.map((model) => {
                  const isActive = activeModelId === model.id;
                  return (
                    <button key={model.id} onClick={() => setActiveModelId(model.id)} className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-lg transition-colors ${isActive ? 'bg-brand-light text-brand border border-brand' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
                      <Bot className={`w-3.5 h-3.5 shrink-0 ${model.enabled ? 'text-brand' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium truncate flex-1">{model.name}</span>
                      {model.enabled && <span className="w-1.5 h-1.5 bg-brand rounded-full shrink-0" title="已启用" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧配置面板 */}
          <div className="flex-1 p-5 overflow-y-auto bg-white">
            <ConfigPanel model={activeModel} onChange={updateModel} onDelete={deleteModel} onSave={handleSave} />
          </div>
        </div>
      </div>

      {/* 新增模型弹窗 */}
      <AddModelModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={addModel} />

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
