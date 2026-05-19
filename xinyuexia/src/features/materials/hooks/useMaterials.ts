import { useCallback, useMemo, useState } from 'react';

import type { MaterialItem, NewMaterialInput } from '@/features/materials/model/materialTypes';

const MATERIALS_KEY = 'xinyuexia_materials_v1';
export const MATERIALS_UPDATED_EVENT = 'xinyuexia_materials_updated';

function readItems() {
  try {
    const raw = localStorage.getItem(MATERIALS_KEY);
    return raw ? (JSON.parse(raw) as MaterialItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(items: MaterialItem[]) {
  localStorage.setItem(MATERIALS_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
}

function createId() {
  return `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readMaterialSnapshot() {
  return readItems();
}

export function useMaterials() {
  const [items, setItems] = useState<MaterialItem[]>(readItems);

  const persist = useCallback((next: MaterialItem[]) => {
    setItems(next);
    writeItems(next);
  }, []);

  const addMaterial = useCallback((input: NewMaterialInput) => {
    const now = new Date().toISOString();
    const item: MaterialItem = {
      id: createId(),
      novelId: input.novelId,
      novelTitle: input.novelTitle,
      type: input.type,
      title: input.title.trim(),
      content: input.content,
      chapterName: input.chapterName?.trim() || undefined,
      chapterSerial: input.chapterSerial,
      createdAt: now,
      updatedAt: now,
    };
    persist([item, ...items]);
    return item;
  }, [items, persist]);

  const updateMaterial = useCallback((id: string, updates: Partial<Pick<MaterialItem, 'title' | 'content' | 'chapterName' | 'chapterSerial' | 'novelId' | 'novelTitle' | 'type'>>) => {
    persist(items.map((item) => item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item));
  }, [items, persist]);

  const deleteMaterial = useCallback((id: string) => {
    persist(items.filter((item) => item.id !== id));
  }, [items, persist]);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const stats = useMemo(() => ({
    count: items.length,
    novelCount: new Set(items.map((item) => item.novelId)).size,
  }), [items]);

  return {
    items,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    clearAll,
    stats,
  };
}
