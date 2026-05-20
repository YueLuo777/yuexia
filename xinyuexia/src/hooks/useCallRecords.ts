import { useCallback, useEffect, useState } from 'react';

export interface CallRecord {
  id: string;
  modelId: string;
  modelName: string;
  type: 'api_test' | 'chat' | 'generate' | 'stream';
  timestamp: number;
  status: 'success' | 'failed';
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  endpoint?: string;
  error?: string;
}

const CALL_RECORDS_KEY = 'xinyuexia_call_records_v1';
const UPDATE_EVENT = 'xinyuexia_call_records_updated';
const MAX_RECORDS = 500;

export function loadRecords(): CallRecord[] {
  try {
    const raw = localStorage.getItem(CALL_RECORDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CallRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: CallRecord[]) {
  localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function addRecord(record: Omit<CallRecord, 'id' | 'timestamp'>) {
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

export function clearRecords() {
  localStorage.removeItem(CALL_RECORDS_KEY);
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

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

  for (const record of records) {
    if (!stats[record.modelId]) {
      stats[record.modelId] = {
        modelName: record.modelName,
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

    const stat = stats[record.modelId];
    stat.callCount += 1;
    if (record.status === 'success') stat.successCount += 1;
    else stat.failCount += 1;
    stat.totalInputTokens += record.inputTokens ?? 0;
    stat.totalOutputTokens += record.outputTokens ?? 0;
    stat.totalTokens += record.totalTokens ?? 0;
    stat.totalLatency += record.latencyMs;
  }

  for (const key of Object.keys(stats)) {
    const stat = stats[key];
    stat.avgLatency = stat.callCount > 0 ? Math.round(stat.totalLatency / stat.callCount) : 0;
  }

  return stats;
}

export function useCallRecords() {
  const [records, setRecords] = useState<CallRecord[]>(loadRecords);

  useEffect(() => {
    const sync = () => setRecords(loadRecords());
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener('storage', sync);
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
