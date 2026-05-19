import { useState, useRef, useCallback } from 'react';
import { Download, Upload, FolderOpen, Archive, RotateCcw, CheckCircle, X } from 'lucide-react';
import { exportFullConfig, importFullConfig } from '@/lib/configBackup';

export default function ConfigBackupCard() {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const { json, totalKeys } = exportFullConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `月下写作-配置备份-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Archive className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-bold text-gray-900">配置备份</h3>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        导出所有配置（模块、API、资料库等），重新部署后可导入恢复。
      </p>

      <div className="flex flex-wrap gap-2 mt-auto">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-xs rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          导出全部
        </button>

        <button
          onClick={() => { setShowImport(true); setImportText(''); setImportResult(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          导入配置
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          选择文件
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              const text = String(ev.target?.result || '');
              setImportText(text);
              setImportResult(null);
              setShowImport(true);
            };
            reader.readAsText(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* 导入弹窗 */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[480px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">导入配置</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">从之前导出的 JSON 文件恢复所有配置</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">粘贴配置 JSON</label>
                <textarea
                  value={importText}
                  onChange={e => { setImportText(e.target.value); setImportResult(null); }}
                  placeholder='{"_exportVersion":3,...}'
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none font-mono"
                />
              </div>

              {importResult && (
                <div className={`p-3 rounded-lg text-xs ${importResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {importResult.message}
                </div>
              )}

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-[11px] text-amber-700">
                  <strong>提示：</strong>导入后会覆盖当前所有配置。导入成功后需<strong>刷新页面</strong>生效。
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button
                onClick={() => {
                  if (!importText.trim()) return;
                  const result = importFullConfig(importText.trim());
                  setImportResult(result);
                  if (result.success) {
                    setTimeout(() => {
                      if (confirm('配置导入成功！是否立即刷新页面以应用新配置？')) {
                        window.location.reload();
                      }
                    }, 300);
                  }
                }}
                disabled={!importText.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
