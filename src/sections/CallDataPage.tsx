import { useState, useMemo } from 'react';
import {
  Activity, Clock, Zap, TrendingUp, Trash2, ArrowUpDown,
  CheckCircle, XCircle, Filter, BarChart3, RefreshCw,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCallRecords, getStatsByModel, type CallRecord } from '@/hooks/useCallRecords';

/* ─── 时间格式化 ─── */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(n?: number): string {
  if (n === undefined || n === 0) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}

type SortField = 'timestamp' | 'latencyMs' | 'totalTokens';
type SortDir = 'asc' | 'desc';

export default function CallDataPage() {
  const { records, refresh, clear } = useCallRecords();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedStats, setExpandedStats] = useState(true);

  // 去重模型列表
  const modelOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (!map.has(r.modelId)) map.set(r.modelId, r.modelName);
    }
    return Array.from(map.entries());
  }, [records]);

  // 筛选 + 排序
  const filtered = useMemo(() => {
    let list = [...records];
    if (filterType !== 'all') list = list.filter(r => r.type === filterType);
    if (filterModel !== 'all') list = list.filter(r => r.modelId === filterModel);
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'timestamp') return (a.timestamp - b.timestamp) * mul;
      if (sortField === 'latencyMs') return (a.latencyMs - b.latencyMs) * mul;
      return ((a.totalTokens || 0) - (b.totalTokens || 0)) * mul;
    });
    return list;
  }, [records, filterType, filterModel, sortField, sortDir]);

  // 统计
  const stats = useMemo(() => getStatsByModel(records), [records]);
  const totalCalls = records.length;
  const successCalls = records.filter(r => r.status === 'success').length;
  const failCalls = records.filter(r => r.status === 'failed').length;
  const totalInput = records.reduce((s, r) => s + (r.inputTokens || 0), 0);
  const totalOutput = records.reduce((s, r) => s + (r.outputTokens || 0), 0);
  const avgLatency = totalCalls > 0 ? Math.round(records.reduce((s, r) => s + r.latencyMs, 0) / totalCalls) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-base font-bold text-gray-900">调用数据</h1>
          <span className="px-2 py-0.5 text-xs text-white bg-indigo-500 rounded-md">
            {totalCalls} 次调用
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
          {records.length > 0 && (
            <button onClick={() => { if (window.confirm('确定清空所有调用记录吗？')) clear(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>
      </div>

      {/* 统计概览 */}
      <div className="shrink-0 px-5 pt-4 pb-2">
        <button onClick={() => setExpandedStats(!expandedStats)}
          className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700 hover:text-gray-900">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          统计概览
          {expandedStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expandedStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-gray-500">总调用</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{totalCalls}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />{successCalls}</span>
                <span className="text-red-500 flex items-center gap-0.5"><XCircle className="w-3 h-3" />{failCalls}</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs text-gray-500">输入 Token</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatTokens(totalInput)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-gray-500">输出 Token</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatTokens(totalOutput)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs text-gray-500">平均延迟</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatDuration(avgLatency)}</div>
            </div>
          </div>
        )}

        {/* 按模型统计 */}
        {expandedStats && Object.keys(stats).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">模型</th>
                  <th className="text-right px-3 py-2 font-medium">调用</th>
                  <th className="text-right px-3 py-2 font-medium">成功</th>
                  <th className="text-right px-3 py-2 font-medium">失败</th>
                  <th className="text-right px-3 py-2 font-medium">输入</th>
                  <th className="text-right px-3 py-2 font-medium">输出</th>
                  <th className="text-right px-3 py-2 font-medium">平均延迟</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(stats).map(([modelId, s]) => (
                  <tr key={modelId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{s.modelName}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{s.callCount}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{s.successCount}</td>
                    <td className="px-3 py-2 text-right text-red-500">{s.failCount}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatTokens(s.totalInputTokens)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatTokens(s.totalOutputTokens)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatDuration(s.avgLatency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span>筛选</span>
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-indigo-300">
            <option value="all">全部类型</option>
            <option value="api_test">API测试</option>
            <option value="chat">对话</option>
            <option value="generate">生成</option>
            <option value="stream">流式</option>
          </select>
          <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-indigo-300">
            <option value="all">全部模型</option>
            {modelOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无调用记录</p>
            <p className="text-xs mt-1">在模型管理页面进行 API 测试后，数据会显示在这里</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-10">#</th>
                  <th className="text-left px-3 py-2 font-medium cursor-pointer hover:text-gray-700" onClick={() => handleSort('timestamp')}>
                    <span className="flex items-center gap-1">时间 {sortField === 'timestamp' && <ArrowUpDown className="w-3 h-3" />}</span>
                  </th>
                  <th className="text-left px-3 py-2 font-medium">模型</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium cursor-pointer hover:text-gray-700" onClick={() => handleSort('latencyMs')}>
                    <span className="flex items-center gap-1 justify-end">延迟 {sortField === 'latencyMs' && <ArrowUpDown className="w-3 h-3" />}</span>
                  </th>
                  <th className="text-right px-3 py-2 font-medium">输入</th>
                  <th className="text-right px-3 py-2 font-medium">输出</th>
                  <th className="text-right px-3 py-2 font-medium cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalTokens')}>
                    <span className="flex items-center gap-1 justify-end">总Token {sortField === 'totalTokens' && <ArrowUpDown className="w-3 h-3" />}</span>
                  </th>
                  <th className="text-center px-3 py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((record: CallRecord, idx: number) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-gray-400">{filtered.length - idx}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatTime(record.timestamp)}</td>
                    <td className="px-3 py-2 font-medium text-gray-700">{record.modelName}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        record.type === 'api_test' ? 'bg-sky-50 text-sky-600' :
                        record.type === 'chat' ? 'bg-purple-50 text-purple-600' :
                        record.type === 'generate' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {record.type === 'api_test' ? 'API测试' : record.type === 'chat' ? '对话' : record.type === 'generate' ? '生成' : '流式'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{formatDuration(record.latencyMs)}</td>
                    <td className="px-3 py-2 text-right text-sky-600">{formatTokens(record.inputTokens)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatTokens(record.outputTokens)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{formatTokens(record.totalTokens)}</td>
                    <td className="px-3 py-2 text-center">
                      {record.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
