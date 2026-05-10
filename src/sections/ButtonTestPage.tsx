import { useState } from 'react';

const colorPresets = [
  { id: 1, name: '品牌蓝', bg: 'bg-brand', text: 'text-white', hover: 'hover:bg-brand-dark', desc: '导航设置同款' },
  { id: 2, name: '深蓝', bg: 'bg-blue-600', text: 'text-white', hover: 'hover:bg-blue-700', desc: '' },
  { id: 3, name: '靛蓝', bg: 'bg-indigo-500', text: 'text-white', hover: 'hover:bg-indigo-600', desc: '' },
  { id: 4, name: '天蓝', bg: 'bg-sky-500', text: 'text-white', hover: 'hover:bg-sky-600', desc: '' },
  { id: 5, name: '青色', bg: 'bg-cyan-500', text: 'text-white', hover: 'hover:bg-cyan-600', desc: '' },
  { id: 6, name: '翠绿', bg: 'bg-emerald-500', text: 'text-white', hover: 'hover:bg-emerald-600', desc: '' },
  { id: 7, name: '绿色', bg: 'bg-green-500', text: 'text-white', hover: 'hover:bg-green-600', desc: '' },
  { id: 8, name: '青柠', bg: 'bg-lime-500', text: 'text-white', hover: 'hover:bg-lime-600', desc: '' },
  { id: 9, name: '琥珀', bg: 'bg-amber-500', text: 'text-white', hover: 'hover:bg-amber-600', desc: '' },
  { id: 10, name: '橙色', bg: 'bg-orange-500', text: 'text-white', hover: 'hover:bg-orange-600', desc: '' },
  { id: 11, name: '红色', bg: 'bg-red-500', text: 'text-white', hover: 'hover:bg-red-600', desc: '适合删除' },
  { id: 12, name: '玫红', bg: 'bg-rose-500', text: 'text-white', hover: 'hover:bg-rose-600', desc: '' },
  { id: 13, name: '粉红', bg: 'bg-pink-500', text: 'text-white', hover: 'hover:bg-pink-600', desc: '' },
  { id: 14, name: '紫红', bg: 'bg-fuchsia-500', text: 'text-white', hover: 'hover:bg-fuchsia-600', desc: '' },
  { id: 15, name: '紫色', bg: 'bg-purple-500', text: 'text-white', hover: 'hover:bg-purple-600', desc: '' },
  { id: 16, name: '蓝紫', bg: 'bg-violet-500', text: 'text-white', hover: 'hover:bg-violet-600', desc: '' },
  { id: 17, name: '石板', bg: 'bg-slate-600', text: 'text-white', hover: 'hover:bg-slate-700', desc: '' },
  { id: 18, name: '灰色', bg: 'bg-gray-500', text: 'text-white', hover: 'hover:bg-gray-600', desc: '' },
  { id: 19, name: '深灰', bg: 'bg-zinc-700', text: 'text-white', hover: 'hover:bg-zinc-800', desc: '' },
  { id: 20, name: '暖灰', bg: 'bg-stone-500', text: 'text-white', hover: 'hover:bg-stone-600', desc: '' },
  { id: 21, name: '墨黑', bg: 'bg-neutral-800', text: 'text-white', hover: 'hover:bg-neutral-900', desc: '' },
  { id: 22, name: '纯黑', bg: 'bg-black', text: 'text-white', hover: 'hover:bg-gray-900', desc: '' },
  { id: 23, name: '茶色', bg: 'bg-yellow-700', text: 'text-white', hover: 'hover:bg-yellow-800', desc: '' },
  { id: 24, name: '棕色', bg: 'bg-amber-800', text: 'text-white', hover: 'hover:bg-amber-900', desc: '' },
];

const btnBase = 'px-3 py-1.5 text-xs font-medium rounded transition-colors';

export default function ButtonTestPage() {
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (id: number) => {
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">按钮颜色挑选</h2>
          <p className="text-xs text-gray-500">点击按钮即可选中/取消，挑选完告诉我编号即可</p>
          {picked.length > 0 && (
            <div className="mt-3 p-2 bg-white border border-brand/30 rounded-lg text-xs text-gray-700">
              已选：{picked.sort((a, b) => a - b).join('、')}
            </div>
          )}
        </div>

        {/* 单独展示 */}
        <div>
          {/* 网站常用 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">网站常用</h3>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[1, 10, 11].map((id) => {
              const c = colorPresets.find(x => x.id === id);
              if (!c) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`${btnBase} ${c.bg} ${c.text} ${c.hover} border-2 transition-all ${
                    picked.includes(c.id) ? 'border-gray-900 scale-105 shadow-lg' : 'border-transparent'
                  }`}
                >
                  <span className="text-[10px] opacity-60 block leading-none">{c.id}</span>
                  {c.name}
                  {c.desc && <span className="block text-[10px] opacity-70">{c.desc}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 全部颜色 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">全部颜色（共 {colorPresets.length} 种）</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {colorPresets.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`${btnBase} ${c.bg} ${c.text} ${c.hover} border-2 transition-all ${
                  picked.includes(c.id)
                    ? 'border-gray-900 scale-105 shadow-lg'
                    : 'border-transparent'
                }`}
              >
                <span className="text-[10px] opacity-60 block leading-none">{c.id}</span>
                {c.name}
                {c.desc && <span className="block text-[10px] opacity-70">{c.desc}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 卡片模拟 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">卡片内效果预览</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {picked.slice(0, 6).map((id) => {
              const c = colorPresets.find(x => x.id === id)!;
              return (
                <div key={id} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-bold text-gray-900 mb-1">#{c.id} {c.name}</div>
                  <div className="text-[10px] text-gray-400 mb-2">{c.desc || '普通按钮'}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button className={`px-2 py-1 text-[10px] rounded ${c.bg} ${c.text} ${c.hover}`}>编辑</button>
                    <button className={`px-2 py-1 text-[10px] rounded ${c.bg} ${c.text} ${c.hover}`}>预览</button>
                    <button className={`px-2 py-1 text-[10px] rounded ${c.bg} ${c.text} ${c.hover}`}>导出</button>
                  </div>
                </div>
              );
            })}
            {picked.length === 0 && (
              <div className="col-span-full text-xs text-gray-400 py-4 text-center">
                请先点击上方按钮选择颜色，此处将显示卡片预览效果
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
