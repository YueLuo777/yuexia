import { useState, useEffect, useCallback } from 'react';
import { Database, Eye, EyeOff, CheckCircle, Server } from 'lucide-react';

/* ─── 数据类型 ─── */
interface DbConfig {
  postgreUrl: string;
}

const STORAGE_KEY = 'db_settings_v2';

/* ─── 加载/保存工具 ─── */
function loadConfig(): DbConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DbConfig;
  } catch { /* ignore */ }
  return { postgreUrl: '' };
}

function saveConfig(data: DbConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ─── 输入行组件 ─── */
function ConfigRow({
  label,
  value,
  onChange,
  placeholder,
  isPassword,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  description?: string;
}) {
  const [show, setShow] = useState(false);
  const inputType = isPassword && !show ? 'password' : 'text';

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {description && <p className="text-xs text-gray-400">{description}</p>}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-gray-400 pr-10"
        />
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 主页面 ─── */
export default function DbSettings() {
  const [config, setConfig] = useState<DbConfig>(loadConfig);
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: '', show: false });
  const [saved, setSaved] = useState(false);

  // 静默自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 500);
    return () => clearTimeout(timer);
  }, [config]);

  const showToast = useCallback((text: string) => {
    setToast({ text, show: true });
    setTimeout(() => setToast({ text: '', show: false }), 2000);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-brand" />
          </div>
          <h1 className="text-base font-bold text-gray-900">数据库设置</h1>
          {saved && (
            <span className="px-2 py-0.5 text-xs text-emerald-600 bg-emerald-50 rounded-md flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              已自动保存
            </span>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-2xl space-y-4">
          {/* PostgreSQL 配置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-bold text-gray-900">PostgreSQL 数据库</h2>
            </div>
            <div className="space-y-4">
              <ConfigRow
                label="连接字符串 (DATABASE_URL)"
                value={config.postgreUrl}
                onChange={(v) => setConfig({ postgreUrl: v })}
                placeholder="postgresql://user:password@localhost:5432/yuexia"
                isPassword
                description="主应用数据库，用于存储小说、章节、资料、剧情点等内容。留空则使用默认本地连接。"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showToast('测试功能待实现')}
                  className="px-3 py-1.5 text-xs text-sky-600 border border-sky-300 rounded-md hover:bg-sky-50 transition-colors"
                >
                  测试连接
                </button>
                <span className="text-xs text-gray-400">修改后需重启应用生效</span>
              </div>
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>提示：</strong>配置仅保存在本机 localStorage 中，不会上传到任何服务器。
              敏感信息（密码）已做掩码处理。配置变更后可能需要重启应用才能生效。
            </p>
          </div>
        </div>
      </div>

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
