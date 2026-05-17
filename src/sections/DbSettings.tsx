import { useState, useCallback, useEffect } from 'react';
import {
  Database, Download, Upload, Trash2, FileJson, FolderOpen,
  CheckCircle, AlertTriangle, RefreshCw, HardDrive,
  ChevronDown, ChevronUp, Server,
} from 'lucide-react';
import { trpc } from '@/providers/trpc';

/* ─── 备份文件类型 ─── */
interface BackupFile {
  fileName: string;
  size: number;
  createdAt: string;
  recordCount: number;
}

/* ─── 格式化文件大小 ─── */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ─── 格式化日期 ─── */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ─── Toast 类型 ─── */
interface Toast {
  text: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}

/* ─── 主页面 ─── */
export default function DbSettings() {
  const [toast, setToast] = useState<Toast>({ text: '', type: 'info', show: false });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState(false);

  /* tRPC 调用 */
  const utils = trpc.useUtils();
  const backupList = trpc.backup.list.useQuery();
  const exportMutation = trpc.backup.export.useMutation({
    onSuccess: (data) => {
      showToast(`导出成功！${data.fileName}，共 ${Object.values(data.recordCount).reduce((a, b) => a + b, 0)} 条记录`, 'success');
      utils.backup.list.invalidate();
    },
    onError: (err) => showToast('导出失败: ' + err.message, 'error'),
  });
  const importMutation = trpc.backup.import.useMutation({
    onSuccess: (data) => {
      showToast(`导入成功！共 ${data.total} 条记录`, 'success');
      utils.backup.list.invalidate();
    },
    onError: (err) => showToast('导入失败: ' + err.message, 'error'),
  });
  const deleteMutation = trpc.backup.delete.useMutation({
    onSuccess: () => {
      showToast('已删除', 'success');
      utils.backup.list.invalidate();
    },
    onError: (err) => showToast('删除失败: ' + err.message, 'error'),
  });
  const clearMutation = trpc.backup.clearAll.useMutation({
    onSuccess: () => {
      showToast('已清空所有数据', 'success');
      setShowClearConfirm(false);
    },
    onError: (err) => showToast('清空失败: ' + err.message, 'error'),
  });

  const showToast = useCallback((text: string, type: Toast['type'] = 'info') => {
    setToast({ text, type, show: true });
    setTimeout(() => setToast({ text: '', type: 'info', show: false }), 3000);
  }, []);

  // 自动刷新备份列表
  useEffect(() => {
    const timer = setInterval(() => {
      utils.backup.list.invalidate();
    }, 10000);
    return () => clearInterval(timer);
  }, [utils]);

  const backups: BackupFile[] = backupList.data ?? [];
  const isLoading = backupList.isLoading || exportMutation.isPending || importMutation.isPending;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <h1 className="text-base font-bold text-gray-900">数据库管理</h1>
          {isLoading && (
            <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-3xl space-y-4">

          {/* ─── 导出/导入操作区 ─── */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-gray-900">数据备份与恢复</h2>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              备份文件保存在项目根目录的 <span className="font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">数据库/</span> 文件夹下，可以跟随项目提交到 GitHub。
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {exportMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出全部数据
              </button>

              <button
                onClick={() => {
                  if (backups.length > 0) {
                    importMutation.mutate({ fileName: backups[0].fileName });
                  } else {
                    showToast('没有可用的备份文件', 'error');
                  }
                }}
                disabled={importMutation.isPending || backups.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {importMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                导入最新备份
              </button>

              <button
                onClick={() => utils.backup.list.invalidate()}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新列表
              </button>
            </div>

            {exportMutation.isSuccess && exportMutation.data && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    导出成功：{exportMutation.data.fileName}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-emerald-600">
                  {Object.entries(exportMutation.data.recordCount).map(([table, count]) => (
                    <span key={table} className="bg-white/60 px-2 py-1 rounded">
                      {table}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── 备份文件列表 ─── */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-gray-900">备份文件列表</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {backups.length} 个文件
                </span>
              </div>
              {backups.length > 0 && (
                <span className="text-xs text-gray-400">
                  位置：项目/数据库/
                </span>
              )}
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileJson className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">暂无备份文件</p>
                <p className="text-xs mt-1">点击上方「导出全部数据」创建第一个备份</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {backups.map((backup) => (
                  <div
                    key={backup.fileName}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-sky-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileJson className="w-5 h-5 text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {backup.fileName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{formatDate(backup.createdAt)}</span>
                          <span>{formatBytes(backup.size)}</span>
                          <span className="text-emerald-600">{backup.recordCount} 条记录</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => importMutation.mutate({ fileName: backup.fileName })}
                        disabled={importMutation.isPending}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="导入此备份"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定删除 ${backup.fileName} 吗？`)) {
                            deleteMutation.mutate({ fileName: backup.fileName });
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── 危险操作区 ─── */}
          <div className="bg-white rounded-lg border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-gray-900">危险操作</h2>
            </div>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
              >
                清空数据库所有数据
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  确定要清空所有数据吗？此操作不可恢复！建议先导出备份。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {clearMutation.isPending ? '清空中...' : '确认清空'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── 使用说明 ─── */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setExpandedHelp(!expandedHelp)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">使用说明</h2>
              </div>
              {expandedHelp ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedHelp && (
              <div className="px-5 pb-5 space-y-3 text-xs text-gray-600 leading-relaxed">
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg">
                  <p className="font-medium text-sky-700 mb-1">备份流程</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>点击「导出全部数据」→ 生成 JSON 备份文件到 <span className="font-mono bg-white px-1 rounded">项目/数据库/</span></li>
                    <li>将项目提交到 GitHub → 备份文件跟随代码一起上传</li>
                    <li>别人下载项目后安装 PostgreSQL 并启动</li>
                    <li>点击「导入最新备份」→ 数据恢复到他的数据库</li>
                  </ol>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="font-medium text-amber-700 mb-1">注意事项</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>导入时如遇重复数据会自动跳过，不会报错</li>
                    <li>plotPoints 的向量数据会一并导出/导入</li>
                    <li>导入顺序：小说 → 卷 → 章节 → 资料 → 提示词 → 模型 → 设置 → 剧情点</li>
                    <li>清空操作不可恢复，务必先导出备份</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm ${
          toast.type === 'success' ? 'bg-emerald-800 text-white' :
          toast.type === 'error' ? 'bg-red-800 text-white' :
          'bg-gray-800 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toast.type === 'info' && <Database className="w-4 h-4 text-sky-400" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
