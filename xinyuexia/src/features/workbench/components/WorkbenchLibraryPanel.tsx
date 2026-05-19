import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  WORKBENCH_LIBRARY_UPDATED_EVENT,
  createWorkbenchLibraryEntry,
  readWorkbenchLibraryEntries,
  writeWorkbenchLibraryEntries,
  type WorkbenchLibraryEntry,
} from '@/features/workbench/model/workbenchLibraryStorage';

interface WorkbenchLibraryPanelProps {
  storageKey: string;
  tabs: string[];
  emptyText: string;
}

export function WorkbenchLibraryPanel({ storageKey, tabs, emptyText }: WorkbenchLibraryPanelProps) {
  const [entries, setEntries] = useState<WorkbenchLibraryEntry[]>(() => readWorkbenchLibraryEntries(storageKey));
  const [activeTab, setActiveTab] = useState(tabs[0] ?? '');
  const visibleEntries = useMemo(() => entries.filter((entry) => entry.tab === activeTab), [activeTab, entries]);
  const selectedEntry = visibleEntries[0] ?? null;

  useEffect(() => {
    setEntries(readWorkbenchLibraryEntries(storageKey));

    const syncEntries = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.storageKey !== storageKey) return;
      setEntries(readWorkbenchLibraryEntries(storageKey));
    };
    const syncStorageEntries = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      setEntries(readWorkbenchLibraryEntries(storageKey));
    };

    window.addEventListener(WORKBENCH_LIBRARY_UPDATED_EVENT, syncEntries);
    window.addEventListener('storage', syncStorageEntries);
    return () => {
      window.removeEventListener(WORKBENCH_LIBRARY_UPDATED_EVENT, syncEntries);
      window.removeEventListener('storage', syncStorageEntries);
    };
  }, [storageKey]);

  const persist = (next: WorkbenchLibraryEntry[]) => {
    setEntries(next);
    writeWorkbenchLibraryEntries(storageKey, next);
  };

  const addEntry = () => {
    persist([createWorkbenchLibraryEntry(activeTab, `新建${activeTab}`), ...entries]);
  };

  const updateEntry = (id: string, updates: Partial<Pick<WorkbenchLibraryEntry, 'title' | 'content'>>) => {
    persist(entries.map((entry) => entry.id === id
      ? { ...entry, ...updates, updatedAt: new Date().toLocaleString('zh-CN') }
      : entry));
  };

  const deleteEntry = (id: string) => {
    persist(entries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr] overflow-hidden bg-white">
      <aside className="flex min-h-0 flex-col border-r border-gray-100">
        <div className="space-y-1 border-b border-gray-100 p-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                activeTab === tab ? 'bg-brand-light text-brand-dark' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <span className="text-xs font-bold text-gray-700">{activeTab}</span>
          <button onClick={addEntry} className="rounded-md p-1 text-brand hover:bg-brand-light" title="新增">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {visibleEntries.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs leading-5 text-gray-400">{emptyText}</p>
          ) : (
            <div className="space-y-1">
              {visibleEntries.map((entry) => (
                <div key={entry.id} className="group rounded-lg border border-gray-100 bg-gray-50 px-2 py-2">
                  <input
                    value={entry.title}
                    onChange={(event) => updateEntry(entry.id, { title: event.target.value })}
                    className="w-full bg-transparent text-xs font-medium text-gray-800 outline-none"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{entry.updatedAt}</span>
                    <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col p-4">
        {selectedEntry ? (
          <>
            <input
              value={selectedEntry.title}
              onChange={(event) => updateEntry(selectedEntry.id, { title: event.target.value })}
              className="mb-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-brand"
            />
            <textarea
              value={selectedEntry.content}
              onChange={(event) => updateEntry(selectedEntry.id, { content: event.target.value })}
              placeholder={`填写${activeTab}内容...`}
              className="editor-scrollbar flex-1 resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-7 text-gray-700 outline-none focus:border-brand"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
            点击左侧加号新增内容
          </div>
        )}
      </main>
    </div>
  );
}
