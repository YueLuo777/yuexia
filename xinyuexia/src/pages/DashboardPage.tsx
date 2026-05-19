export function DashboardPage() {
  return (
    <main className="min-h-full bg-gray-50 p-6">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">首页</h1>
            <p className="mt-2 text-sm text-gray-500">
              xinyuexia 已接入独立视觉骨架，下一步会按模块迁移真实页面。
            </p>
          </div>
          <button className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            快速开始
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {[
            ['小说', '0'],
            ['剧本', '0'],
            ['提示词', '0'],
            ['资料', '0'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
