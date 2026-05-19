import { BookOpen, Database, Download, Plus, RotateCcw, Settings, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { NewNovelModal } from '@/features/novels/components/NewNovelModal';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import type { WorkType } from '@/features/novels/model/novelTypes';

function exportBackup() {
  const keys = [
    'xinyuexia_novels_v1',
    'xinyuexia_recycled_novels_v1',
    'xinyuexia_categories_v1',
    'xinyuexia_volumes_v1',
    'xinyuexia_extract_modules_v1',
    'xinyuexia_plot_library_v1',
    'xinyuexia_materials_v1',
    'xinyuexia_workbench_notes',
  ];
  const data = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  const blob = new Blob([JSON.stringify({ data, exportedAt: new Date().toISOString() }, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `新月下备份_${new Date().toLocaleDateString('zh-CN')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { novels, categories, stats, createNovel, selectNovel } = useNovelLibrary();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newType, setNewType] = useState<WorkType>('novel');

  const recentNovels = [...novels]
    .sort((a, b) => String(b.lastModifiedAt ?? '').localeCompare(String(a.lastModifiedAt ?? ''), 'zh-CN'))
    .slice(0, 4);

  const openNew = (type: WorkType) => {
    setNewType(type);
    setIsNewOpen(true);
  };

  const handleCreate = (input: Parameters<typeof createNovel>[0]) => {
    const id = createNovel(input);
    selectNovel(id);
    setIsNewOpen(false);
    navigate('/workbench');
  };

  return (
    <main className="relative flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50">
            <Settings className="h-3.5 w-3.5" />
            编辑工作台
          </button>
          <button className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            卡片设置
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">配置备份</h2>
              <p className="mt-1 text-xs text-gray-400">导出新项目本地配置与数据</p>
            </div>
            <Database className="h-5 w-5 text-brand" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportBackup} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#08B3D9] px-3 py-2 text-sm text-white hover:bg-[#07a0c2]">
              <Download className="h-4 w-4" />
              导出
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
              <RotateCcw className="h-4 w-4" />
              导入
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">最近编辑</h2>
          <div className="mt-4 space-y-2">
            {recentNovels.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">暂无最近作品</p>
            ) : recentNovels.map((novel) => (
              <button
                key={novel.id}
                onClick={() => {
                  selectNovel(novel.id);
                  navigate('/workbench');
                }}
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
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ['小说', stats.novelCount],
          ['剧本', stats.scriptCount],
          ['总字数', stats.totalWords],
          ['作品总数', novels.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <NewNovelModal
        isOpen={isNewOpen}
        type={newType}
        categories={categories}
        onClose={() => setIsNewOpen(false)}
        onCreate={handleCreate}
      />
    </main>
  );
}
