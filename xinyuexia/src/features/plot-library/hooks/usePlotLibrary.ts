import { useCallback, useMemo, useState } from 'react';

import type { NewPlotLibraryItem, PlotLibraryItem } from '@/features/plot-library/model/plotLibraryTypes';

const PLOT_LIBRARY_KEY = 'xinyuexia_plot_library_v1';

function readItems() {
  try {
    const raw = localStorage.getItem(PLOT_LIBRARY_KEY);
    return raw ? (JSON.parse(raw) as PlotLibraryItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(items: PlotLibraryItem[]) {
  localStorage.setItem(PLOT_LIBRARY_KEY, JSON.stringify(items));
}

function wordCount(text: string) {
  return text.replace(/\s+/g, '').length;
}

function createId() {
  return `plot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function savePlotItems(items: NewPlotLibraryItem[]) {
  const now = new Date().toISOString();
  const current = readItems();
  const nextItems: PlotLibraryItem[] = items.map((item) => ({
    id: createId(),
    title: item.title,
    chapter: item.chapter,
    novelTitle: item.novelTitle,
    content: item.content,
    tags: item.tags ?? [],
    wordCount: wordCount(item.content),
    createdAt: now,
    updatedAt: now,
  }));
  writeItems([...nextItems, ...current]);
  return nextItems;
}

export function usePlotLibrary() {
  const [items, setItems] = useState<PlotLibraryItem[]>(readItems);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
  }, [items]);

  const addItems = useCallback((input: NewPlotLibraryItem[]) => {
    const created = savePlotItems(input);
    setItems(readItems());
    return created;
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Pick<PlotLibraryItem, 'title' | 'content' | 'tags'>>) => {
    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const content = updates.content ?? item.content;
        return {
          ...item,
          ...updates,
          content,
          wordCount: wordCount(content),
          updatedAt: new Date().toISOString(),
        };
      });
      writeItems(next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeItems(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeItems([]);
    setItems([]);
  }, []);

  return {
    items,
    tags,
    addItems,
    updateItem,
    deleteItem,
    clearAll,
  };
}
