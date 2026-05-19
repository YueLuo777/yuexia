interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="min-h-full bg-gray-50 p-6">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">新项目页面骨架已接入，后续会按模块迁移真实功能。</p>
          </div>
          <button className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            新建
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {['最近编辑', '待处理', '配置状态'].map((label) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">0</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
