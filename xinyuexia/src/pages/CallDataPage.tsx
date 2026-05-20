import { Activity, ArrowUpDown, BarChart3, CheckCircle, ChevronDown, ChevronUp, Clock, Filter, RefreshCw, Trash2, TrendingUp, XCircle, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getStatsByModel, type CallRecord, useCallRecords } from '@/hooks/useCallRecords';

function formatTime(ts: number) {
  const date = new Date(ts);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(value?: number) {
  if (!value) return '-';
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString();
}

type SortField = 'timestamp' | 'latencyMs' | 'totalTokens';
type SortDir = 'asc' | 'desc';

export default function CallDataPage() {
  const { records, refresh, clear } = useCallRecords();
  const [filterType, setFilterType] = useState<'all' | CallRecord['type']>('all');
  const [filterModel, setFilterModel] = useState('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedStats, setExpandedStats] = useState(true);

  const modelOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of records) {
      if (!map.has(record.modelId)) map.set(record.modelId, record.modelName);
    }
    return Array.from(map.entries());
  }, [records]);

  const filtered = useMemo(() => {
    const list = records.filter((record) => {
      const typeMatch = filterType === 'all' || record.type === filterType;
      const modelMatch = filterModel === 'all' || record.modelId === filterModel;
      return typeMatch && modelMatch;
    });

    const multiplier = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortField === 'timestamp') return (a.timestamp - b.timestamp) * multiplier;
      if (sortField === 'latencyMs') return (a.latencyMs - b.latencyMs) * multiplier;
      return ((a.totalTokens ?? 0) - (b.totalTokens ?? 0)) * multiplier;
    });
  }, [records, filterType, filterModel, sortDir, sortField]);

  const stats = useMemo(() => getStatsByModel(records), [records]);
  const totalCalls = records.length;
  const successCalls = records.filter((record) => record.status === 'success').length;
  const failCalls = records.filter((record) => record.status === 'failed').length;
  const totalInput = records.reduce((sum, record) => sum + (record.inputTokens ?? 0), 0);
  const totalOutput = records.reduce((sum, record) => sum + (record.outputTokens ?? 0), 0);
  const avgLatency = totalCalls > 0 ? Math.round(records.reduce((sum, record) => sum + record.latencyMs, 0) / totalCalls) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir('desc');
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Activity className="h-4 w-4 text-indigo-600" />
          </div>
          <h1 className="text-base font-bold text-gray-900">调用数据</h1>
          <span className="rounded-md bg-indigo-500 px-2 py-0.5 text-xs text-white">{totalCalls} 次调用</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
          {records.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('确定清空所有调用记录吗？')) clear();
              }}
              className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空
            </button>
          )}
        </div>
      </header>

      <div className="shrink-0 px-5 pt-4 pb-2">
        <button onClick={() => setExpandedStats((value) => !value)} className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          统计概览
          {expandedStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedStats && (
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-gray-500">总调用</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{totalCalls}</div>
              <div className="mt-1 flex gap-2 text-xs">
                <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle className="h-3 w-3" />{successCalls}</span>
                <span className="flex items-center gap-0.5 text-red-500"><XCircle className="h-3 w-3" />{failCalls}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-xs text-gray-500">输入 Token</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatTokens(totalInput)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-gray-500">输出 Token</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatTokens(totalOutput)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-gray-500">平均延迟</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{formatDuration(avgLatency)}</div>
            </div>
          </div>
        )}

        {expandedStats && Object.keys(stats).length > 0 && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">模型</th>
                  <th className="px-3 py-2 text-right font-medium">调用</th>
                  <th className="px-3 py-2 text-right font-medium">成功</th>
                  <th className="px-3 py-2 text-right font-medium">失败</th>
                  <th className="px-3 py-2 text-right font-medium">输入</th>
                  <th className="px-3 py-2 text-right font-medium">输出</th>
                  <th className="px-3 py-2 text-right font-medium">平均延迟</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(stats).map(([modelId, stat]) => (
                  <tr key={modelId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{stat.modelName}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{stat.callCount}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{stat.successCount}</td>
                    <td className="px-3 py-2 text-right text-red-500">{stat.failCount}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatTokens(stat.totalInputTokens)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatTokens(stat.totalOutputTokens)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatDuration(stat.avgLatency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="h-3.5 w-3.5" />
            <span>筛选</span>
          </div>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value as typeof filterType)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-indigo-300 focus:outline-none">
            <option value="all">全部类型</option>
            <option value="api_test">API 测试</option>
            <option value="chat">对话</option>
            <option value="generate">生成</option>
            <option value="stream">流式</option>
          </select>
          <select value={filterModel} onChange={(event) => setFilterModel(event.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-indigo-300 focus:outline-none">
            <option value="all">全部模型</option>
            {modelOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Activity className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">暂无调用记录</p>
            <p className="mt-1 text-xs">在模型管理、提炼剧情或脑洞生成中调用 AI 后，这里会显示数据</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
                <tr>
                  <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                  <th className="cursor-pointer px-3 py-2 text-left font-medium hover:text-gray-700" onClick={() => handleSort('timestamp')}>
                    <span className="flex items-center gap-1">时间 {sortField === 'timestamp' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">模型</th>
                  <th className="px-3 py-2 text-left font-medium">类型</th>
                  <th className="cursor-pointer px-3 py-2 text-right font-medium hover:text-gray-700" onClick={() => handleSort('latencyMs')}>
                    <span className="flex items-center justify-end gap-1">延迟 {sortField === 'latencyMs' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">输入</th>
                  <th className="px-3 py-2 text-right font-medium">输出</th>
                  <th className="cursor-pointer px-3 py-2 text-right font-medium hover:text-gray-700" onClick={() => handleSort('totalTokens')}>
                    <span className="flex items-center justify-end gap-1">总 Token {sortField === 'totalTokens' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </th>
                  <th className="px-3 py-2 text-center font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((record, index) => (
                  <tr key={record.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{filtered.length - index}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatTime(record.timestamp)}</td>
                    <td className="px-3 py-2 font-medium text-gray-700">{record.modelName}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        record.type === 'api_test' ? 'bg-sky-50 text-sky-600'
                          : record.type === 'chat' ? 'bg-purple-50 text-purple-600'
                            : record.type === 'generate' ? 'bg-amber-50 text-amber-600'
                              : 'bg-gray-100 text-gray-600'
                      }`}>
                        {record.type === 'api_test' ? 'API 测试' : record.type === 'chat' ? '对话' : record.type === 'generate' ? '生成' : '流式'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatDuration(record.latencyMs)}</td>
                    <td className="px-3 py-2 text-right text-sky-600">{formatTokens(record.inputTokens)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatTokens(record.outputTokens)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{formatTokens(record.totalTokens)}</td>
                    <td className="px-3 py-2 text-center">
                      {record.status === 'success'
                        ? <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                        : <XCircle className="mx-auto h-4 w-4 text-red-500" />}
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
