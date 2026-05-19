import { ArrowRight, Library, NotebookText, Settings, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
}

const pageHints: Record<string, { lead: string; note: string }> = {
  资料库: { lead: '用于统一管理写作素材、人物卡、设定片段和引用资料。', note: '后续可接入本地 CRUD、筛选和导入导出。' },
  云端设置: { lead: '用于配置同步目标、备份策略和远端数据源。', note: '当前先保留页面壳，避免路由断掉。' },
  脑洞生成器: { lead: '用于快速产出故事灵感、角色冲突和开篇方向。', note: '后续可以直接接入提示词和模型。' },
  大纲生成器: { lead: '用于把灵感整理成可执行的大纲结构。', note: '建议后面和提炼剧情、概要库联动。' },
  脑洞库: { lead: '用于沉淀已生成的灵感和备用点子。', note: '后续可做标签筛选和收藏。' },
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const hint = useMemo(() => {
    const key = Object.keys(pageHints).find((name) => title.includes(name));
    return key ? pageHints[key] : { lead: '该功能页已经接入新项目路由，后续会继续补完整功能。', note: '现在先保持统一的外观和入口。' };
  }, [title]);

  const actions = [
    { label: '返回首页', to: '/dashboard', icon: Sparkles },
    { label: '打开工作台', to: '/workbench', icon: NotebookText },
    { label: '查看剧情库', to: '/plot-library', icon: Library },
    { label: '模型管理', to: '/model-manage', icon: Settings },
  ];

  return (
    <section className="min-h-full bg-gradient-to-br from-gray-50 via-white to-brand-light/40 p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">功能占位页</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">{hint.lead}</p>
          <p className="mt-1 text-sm text-gray-400">{hint.note}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-brand hover:text-brand"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['当前状态', '已接入路由'],
            ['页面风格', '与主系统一致'],
            ['后续方向', '替换为真实模块'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
