import { useState, useEffect, useCallback } from 'react';

/* ─── 调用记录类型 ─── */
export interface CallRecord {
  id: string;
  modelId: string;
  modelName: string;
  type: 'api_test' | 'chat' | 'generate' | 'stream';
  timestamp: number;
  status: 'success' | 'failed';
  latencyMs: number;           // 请求延迟（毫秒）
  inputTokens?: number;        // 输入 token 数
  outputTokens?: number;       // 输出 token 数
  totalTokens?: number;        // 总 token 数
  endpoint?: string;           // 调用的 API 端点
  error?: string;              // 错误信息
}

const CALL_RECORDS_KEY = 'call_records_v1';
const MAX_RECORDS = 500; // 最多保留 500 条

/* ─── 加载记录 ─── */
export function loadRecords(): CallRecord[] {
  try {
    const raw = localStorage.getItem(CALL_RECORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

/* ─── 保存记录 ─── */
export function saveRecords(records: CallRecord[]) {
  try {
    // 只保留最近 MAX_RECORDS 条
    const trimmed = records.slice(-MAX_RECORDS);
    localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

/* ─── 添加单条记录 ─── */
export function addRecord(record: Omit<CallRecord, 'id' | 'timestamp'>): CallRecord {
  const newRecord: CallRecord = {
    ...record,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const records = loadRecords();
  records.push(newRecord);
  saveRecords(records);
  return newRecord;
}

/* ─── 清空记录 ─── */
export function clearRecords() {
  localStorage.removeItem(CALL_RECORDS_KEY);
}

/* ─── 按模型统计 ─── */
export function getStatsByModel(records: CallRecord[]) {
  const stats: Record<string, {
    modelName: string;
    callCount: number;
    successCount: number;
    failCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    avgLatency: number;
    totalLatency: number;
  }> = {};

  for (const r of records) {
    if (!stats[r.modelId]) {
      stats[r.modelId] = {
        modelName: r.modelName,
        callCount: 0,
        successCount: 0,
        failCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        avgLatency: 0,
        totalLatency: 0,
      };
    }
    const s = stats[r.modelId];
    s.callCount++;
    if (r.status === 'success') s.successCount++;
    else s.failCount++;
    s.totalInputTokens += r.inputTokens || 0;
    s.totalOutputTokens += r.outputTokens || 0;
    s.totalTokens += r.totalTokens || 0;
    s.totalLatency += r.latencyMs;
  }

  // 计算平均延迟
  for (const key in stats) {
    const s = stats[key];
    s.avgLatency = s.callCount > 0 ? Math.round(s.totalLatency / s.callCount) : 0;
  }

  return stats;
}

/* ─── React Hook ─── */
export function useCallRecords() {
  const [records, setRecords] = useState<CallRecord[]>(loadRecords);

  // 实时同步
  useEffect(() => {
    const handleStorage = () => {
      setRecords(loadRecords());
    };
    window.addEventListener('call_records_updated', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('call_records_updated', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const refresh = useCallback(() => {
    setRecords(loadRecords());
  }, []);

  const clear = useCallback(() => {
    clearRecords();
    setRecords([]);
  }, []);

  return { records, refresh, clear };
}
