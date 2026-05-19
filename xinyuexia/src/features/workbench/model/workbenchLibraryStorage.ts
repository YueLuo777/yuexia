export interface WorkbenchLibraryEntry {
  id: string;
  tab: string;
  title: string;
  content: string;
  updatedAt: string;
}

export const WORKBENCH_LIBRARY_UPDATED_EVENT = 'xinyuexia_workbench_library_updated';

export function readWorkbenchLibraryEntries(storageKey: string): WorkbenchLibraryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as WorkbenchLibraryEntry[] : [];
  } catch {
    return [];
  }
}

export function writeWorkbenchLibraryEntries(storageKey: string, entries: WorkbenchLibraryEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(WORKBENCH_LIBRARY_UPDATED_EVENT, { detail: { storageKey } }));
}

export function createWorkbenchLibraryEntry(tab: string, title: string, content = ''): WorkbenchLibraryEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tab,
    title,
    content,
    updatedAt: new Date().toLocaleString('zh-CN'),
  };
}

export function addWorkbenchLibraryEntry(storageKey: string, tab: string, title: string, content: string) {
  const nextEntry = createWorkbenchLibraryEntry(tab, title, content);
  writeWorkbenchLibraryEntries(storageKey, [nextEntry, ...readWorkbenchLibraryEntries(storageKey)]);
  return nextEntry;
}
