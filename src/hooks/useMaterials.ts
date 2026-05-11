import { useState, useCallback, useMemo } from 'react';
import { trpc } from '@/providers/trpc';

export interface Material {
  id: number;
  title: string;
  content: string;
  novelId: number;
  novelTitle: string;
  type: 'novel' | 'script';
  createdAt: string;
  updatedAt: string;
  chapterName?: string;    // 章节名（如"我只是想修个水管"）
  chapterSerial?: number;  // 章节序号（如 1）
  tags?: string[];         // 元素标签
  rating?: number;         // 评分 (0-5)
}

const STORAGE_KEY = 'materials_data_v1';

function loadMaterials(): Material[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveMaterials(items: Material[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

let nextId = (() => {
  const items = loadMaterials();
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
})();

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>(loadMaterials);

  // tRPC mutations for cloud sync
  const materialCreate = trpc.material.create.useMutation();
  const materialUpdate = trpc.material.update.useMutation();
  const materialDelete = trpc.material.delete.useMutation();

  const persist = useCallback((updater: (prev: Material[]) => Material[]) => {
    setMaterials((prev) => {
      const next = updater(prev);
      saveMaterials(next);
      return next;
    });
  }, []);

  const addMaterial = useCallback((data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toLocaleDateString('zh-CN');
    const newItem: Material = { ...data, id: nextId++, createdAt: now, updatedAt: now };
    persist((prev) => [...prev, newItem]);
    // 同步到云端
    try {
      materialCreate.mutate({
        novelId: data.novelId, novelTitle: data.novelTitle,
        type: data.type, title: data.title, content: data.content,
        chapterName: data.chapterName, chapterSerial: data.chapterSerial,
      });
    } catch { /* 静默失败 */ }
    return newItem.id;
  }, [persist, materialCreate]);

  const updateMaterial = useCallback((id: number, updates: Partial<Omit<Material, 'id' | 'createdAt'>>) => {
    const now = new Date().toLocaleDateString('zh-CN');
    persist((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: now } : m))
    );
    // 同步到云端
    try { materialUpdate.mutate({ id, ...updates }); } catch { /* 静默失败 */ }
  }, [persist, materialUpdate]);

  const deleteMaterial = useCallback((id: number) => {
    persist((prev) => prev.filter((m) => m.id !== id));
    // 同步到云端
    try { materialDelete.mutate({ id }); } catch { /* 静默失败 */ }
  }, [persist, materialDelete]);

  // 按类型筛选
  const getByType = useCallback((type: 'novel' | 'script') => {
    return materials.filter((m) => m.type === type);
  }, [materials]);

  // 按作品ID筛选
  const getByNovelId = useCallback((novelId: number | null, type: 'novel' | 'script') => {
    if (novelId === null) return materials.filter((m) => m.type === type);
    return materials.filter((m) => m.type === type && m.novelId === novelId);
  }, [materials]);

  // 获取某类型下的所有作品分类
  const getNovelGroups = useCallback((type: 'novel' | 'script') => {
    const map = new Map<number, string>();
    materials.filter((m) => m.type === type).forEach((m) => {
      if (!map.has(m.novelId)) map.set(m.novelId, m.novelTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [materials]);

  // 搜索
  const searchMaterials = useCallback((query: string, type: 'novel' | 'script' | 'all', novelId?: number | null) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      if (type === 'all') return materials;
      return getByNovelId(novelId ?? null, type);
    }
    return materials.filter((m) => {
      if (type !== 'all' && m.type !== type) return false;
      if (novelId !== undefined && novelId !== null && m.novelId !== novelId) return false;
      return m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
    });
  }, [materials, getByNovelId]);

  const stats = useMemo(() => {
    return {
      novelCount: materials.filter((m) => m.type === 'novel').length,
      scriptCount: materials.filter((m) => m.type === 'script').length,
    };
  }, [materials]);

  return {
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    getByType,
    getByNovelId,
    getNovelGroups,
    searchMaterials,
    stats,
  };
}
