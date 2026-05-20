import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Database, MoveDown, MoveUp, Plus, RotateCcw, Settings, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { NewNovelModal } from '@/features/novels/components/NewNovelModal';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import type { WorkType } from '@/features/novels/model/novelTypes';

type DashboardSectionId = 'welcome' | 'backup' | 'recent' | 'stats';

interface DashboardSection {
  id: DashboardSectionId;
  label: string;
  visible: boolean;
}

const DASHBOARD_SECTIONS_KEY = 'xinyuexia_dashboard_sections_v1';
const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'welcome', label: '欢迎区', visible: true },
  { id: 'backup', label: '配置备份', visible: true },
  { id: 'recent', label: '最近编辑', visible: true },
  { id: 'stats', label: '统计概览', visible: true },
];

function loadSections() {
  try {
    const raw = localStorage.getItem(DASHBOARD_SECTIONS_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw) as DashboardSection[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function saveSections(sections: DashboardSection[]) {
  localStorage.setItem(DASHBOARD_SECTIONS_KEY, JSON.stringify(sections));
}

function exportBackup() {
  const keys = [
    'xinyuexia_novels_v1',
    'xinyuexia_recycled_novels_v1',
    'xinyuexia_categories_v1',
    'xinyuexia_volumes_v1',
    'xinyuexia_extract_modules_v1',
    'xinyuexia_plot_library_v1',
    'xinyuexia_materials_v1',
    'xinyuexia_idea_library_v1',
    'xinyuexia_idea_continue_v1',
    'xinyuexia_idea_to_outline_v1',
    'xinyuexia_call_records_v1',
    'tag_zone_v1',
    'xinyuexia_workbench_notes',
    DASHBOARD_SECTIONS_KEY,
  ];
  const data = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  const blob = new Blob([JSON.stringify({ data, exportedAt: new Date().toISOString() }, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `xinyuexia-backup-${new Date().toLocaleDateString('zh-CN')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function SettingsModal({
  isOpen,
  sections,
  onClose,
  onChange,
  onReset,
}: {
  isOpen: boolean;
  sections: DashboardSection[];
  onClose: () => void;
  onChange: (next: DashboardSection[]) => void;
  onReset: () => void;
}) {
  if (!isOpen) return null;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="flex w-[520px] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">工作台卡片设置</h2>
            <p className="mt-0.5 text-xs text-gray-400">调整首页模块的显示和顺序。</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          {sections.map((section, index) => (
            <div key={section.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800">{section.label}</div>
                <div className="text-xs text-gray-400">{section.visible ? '当前显示' : '当前隐藏'}</div>
              </div>
              <button onClick={() => move(index, -1)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-white" title="上移">
                <MoveUp className="h-4 w-4" />
              </button>
              <button onClick={() => move(index, 1)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-white" title="下移">
                <MoveDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => onChange(sections.map((item) => item.id === section.id ? { ...item, visible: !item.visible } : item))}
                className={`rounded-lg px-3 py-2 text-xs ${section.visible ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-brand/30 text-brand hover:bg-brand-light'}`}
              >
                {section.visible ? '隐藏' : '恢复'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button onClick={onReset} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-white">
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>
          <button onClick={onClose} className="rounded-lg bg-brand px-5 py-2 text-xs text-white hover:bg-brand-dark">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { novels, categories, stats, createNovel, selectNovel } = useNovelLibrary();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newType, setNewType] = useState<WorkType>('novel');
  const [sections, setSections] = useState<DashboardSection[]>(loadSections);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const recentNovels = [...novels]
    .sort((a, b) => String(b.lastModifiedAt ?? '').localeCompare(String(a.lastModifiedAt ?? ''), 'zh-CN'))
    .slice(0, 4);

  const openNew = (type: WorkType) => {
    setNewType(type);
    setIsNewOpen(true);
  };

  const openNovel = (novelId: number, type: WorkType) => {
    selectNovel(novelId);
    navigate(type === 'script' ? '/script-editor-v2' : '/workbench');
  };

  const handleCreate = (input: Parameters<typeof createNovel>[0]) => {
    const id = createNovel(input);
    setIsNewOpen(false);
    openNovel(id, input.type);
  };

  const handleSectionsChange = (next: DashboardSection[]) => {
    setSections(next);
    saveSections(next);
  };

  const handleImportBackup = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { data?: Record<string, string | null> };
      const data = parsed.data ?? {};
      for (const [key, value] of Object.entries(data)) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      setNotice('备份已导入，页面即将刷新');
      window.location.reload();
    } catch {
      setNotice('备份文件格式不正确');
    }
  };

  const visibleSections = useMemo(() => sections.filter((section) => section.visible), [sections]);

  const renderSection = (id: DashboardSectionId) => {
    if (id === 'welcome') {
      return (
        <section key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400">欢迎回来</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">月落</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">继续整理作品、提炼剧情和维护设定资料。</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-lg font-bold text-white">月</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => openNew('novel')} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              新建小说
            </button>
            <button onClick={() => openNew('script')} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              新建剧本
            </button>
          </div>
        </section>
      );
    }

    if (id === 'backup') {
      return (
        <section key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">配置备份</h2>
              <p className="mt-1 text-xs text-gray-400">导出或导入新项目的本地配置与数据。</p>
            </div>
            <Database className="h-5 w-5 text-brand" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportBackup} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#08B3D9] px-3 py-2 text-sm text-white hover:bg-[#07a0c2]">
              <ArrowDownToLine className="h-4 w-4" />
              导出
            </button>
            <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
              <ArrowUpFromLine className="h-4 w-4" />
              导入
            </button>
          </div>
        </section>
      );
    }

    if (id === 'recent') {
      return (
        <section key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">最近编辑</h2>
          <div className="mt-4 space-y-2">
            {recentNovels.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">暂无最近作品</p>
            ) : recentNovels.map((novel) => (
              <button
                key={novel.id}
                onClick={() => openNovel(novel.id, novel.type)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{novel.title}</p>
                  <p className="text-[11px] text-gray-400">{novel.lastModifiedAt ?? novel.createdAt}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {[
            ['小说', stats.novelCount],
            ['剧本', stats.scriptCount],
            ['总字数', stats.totalWords],
            ['作品总数', novels.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="relative flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
          >
            <Settings className="h-3.5 w-3.5" />
            编辑工作台
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            卡片设置
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5">
          {visibleSections.some((section) => section.id === 'welcome') && renderSection('welcome')}
          {visibleSections.some((section) => section.id === 'recent') && renderSection('recent')}
        </div>
        <div className="space-y-5">
          {visibleSections.some((section) => section.id === 'backup') && renderSection('backup')}
        </div>
        <div className="space-y-5">
          {visibleSections.some((section) => section.id === 'stats') && renderSection('stats')}
        </div>
      </div>

      <NewNovelModal
        isOpen={isNewOpen}
        type={newType}
        categories={categories}
        onClose={() => setIsNewOpen(false)}
        onCreate={handleCreate}
      />

      <SettingsModal
        isOpen={showSettings}
        sections={sections}
        onClose={() => setShowSettings(false)}
        onChange={handleSectionsChange}
        onReset={() => handleSectionsChange(DEFAULT_SECTIONS)}
      />

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleImportBackup(file);
          event.target.value = '';
        }}
      />
    </main>
  );
}
