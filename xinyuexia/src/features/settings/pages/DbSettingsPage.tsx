import { ArrowDownToLine, ArrowUpFromLine, Database, RefreshCw, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

import { readIdeaSnapshot } from '@/features/ideas/hooks/useIdeaStorage';
import { readMaterialSnapshot } from '@/features/materials/hooks/useMaterials';
import { readModelSnapshot } from '@/features/models/hooks/useModels';
import { useNovelLibrary } from '@/features/novels/hooks/useNovelLibrary';
import { readPlotLibrarySnapshot } from '@/features/plot-library/hooks/usePlotLibrary';
import { readPromptSnapshot } from '@/features/prompts/hooks/usePrompts';

function readAllData() {
  return {
    novels: localStorage.getItem('xinyuexia_novels_v1'),
    recycledNovels: localStorage.getItem('xinyuexia_recycled_novels_v1'),
    categories: localStorage.getItem('xinyuexia_categories_v1'),
    volumes: localStorage.getItem('xinyuexia_volumes_v1'),
    chapters: null,
    materials: JSON.stringify(readMaterialSnapshot()),
    prompts: JSON.stringify(readPromptSnapshot()),
    models: JSON.stringify(readModelSnapshot()),
    plotLibrary: JSON.stringify(readPlotLibrarySnapshot()),
    ideas: JSON.stringify(readIdeaSnapshot()),
    tagZone: localStorage.getItem('tag_zone_v1'),
    callRecords: localStorage.getItem('xinyuexia_call_records_v1'),
    workbenchNotes: localStorage.getItem('xinyuexia_workbench_notes'),
    extractModules: localStorage.getItem('xinyuexia_extract_modules_v1'),
  };
}

export function DbSettingsPage() {
  const { novels } = useNovelLibrary();
  const [payload, setPayload] = useState(() => JSON.stringify(readAllData(), null, 2));
  const [notice, setNotice] = useState('');
  const stats = useMemo(() => ({
    novels: novels.length,
    materials: readMaterialSnapshot().length,
    prompts: readPromptSnapshot().prompts.length,
    models: readModelSnapshot().length,
    ideas: readIdeaSnapshot().length,
    plots: readPlotLibrarySnapshot().items.length,
  }), [novels.length]);

  const handleRefresh = () => {
    setPayload(JSON.stringify(readAllData(), null, 2));
    setNotice('数据已刷新');
  };

  const handleExport = () => {
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xinyuexia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('备份已导出');
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(payload) as Record<string, string | null>;
      for (const [key, value] of Object.entries(data)) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      setNotice('备份已导入，页面即将刷新');
      window.location.reload();
    } catch {
      setNotice('导入内容不是有效 JSON');
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Shield className="h-5 w-5 text-sky-500" />
            云端设置
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">当前先提供本地备份与恢复入口，后续再接云端同步。</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
            <ArrowDownToLine className="h-4 w-4" />
            导出
          </button>
          <button onClick={handleImport} className="flex items-center gap-1.5 rounded-lg border border-brand/30 px-3 py-2 text-sm text-brand hover:bg-brand-light">
            <ArrowUpFromLine className="h-4 w-4" />
            导入
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        <section className="grid flex-1 gap-4 md:grid-cols-3">
          {notice && (
            <div className="md:col-span-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {notice}
            </div>
          )}

          {[
            ['作品', stats.novels],
            ['资料', stats.materials],
            ['提示词 / 模型 / 脑洞', stats.prompts + stats.models + stats.ideas],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}

          <div className="md:col-span-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">备份 JSON</h2>
              <div className="text-xs text-gray-400">可以直接编辑后再导入</div>
            </div>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="editor-scrollbar h-[420px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-brand"
            />
          </div>
        </section>

        <aside className="w-[320px] rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Database className="h-4 w-4 text-brand" />
            说明
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-gray-500">
            <li>这里目前是本地备份 / 恢复入口，不依赖后端。</li>
            <li>后续如果接云端同步，只需要替换导入导出逻辑。</li>
            <li>导入会覆盖当前 xinyuexia 的本地数据。</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
