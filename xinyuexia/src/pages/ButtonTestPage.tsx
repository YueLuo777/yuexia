import { useState } from 'react';

const colorPresets = [
  { id: 1, name: '品牌蓝', bg: 'bg-brand', text: 'text-white', hover: 'hover:bg-brand-dark', desc: '导航设置同款' },
  { id: 2, name: '深蓝', bg: 'bg-blue-600', text: 'text-white', hover: 'hover:bg-blue-700', desc: '' },
  { id: 3, name: '静蓝', bg: 'bg-indigo-500', text: 'text-white', hover: 'hover:bg-indigo-600', desc: '' },
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

const btnBase = 'rounded border-2 px-3 py-1.5 text-xs font-medium transition-colors';

export default function ButtonTestPage() {
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (id: number) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h2 className="mb-1 text-base font-bold text-gray-900">按钮颜色挑选</h2>
          <p className="text-xs text-gray-500">点击按钮即可选中或取消。挑选完后直接告诉我编号就可以。</p>
          {picked.length > 0 && (
            <div className="mt-3 rounded-lg border border-brand/30 bg-white p-2 text-xs text-gray-700">
              已选：{picked.slice().sort((a, b) => a - b).join('、')}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">网站常用</h3>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[1, 10, 11].map((id) => {
              const color = colorPresets.find((item) => item.id === id);
              if (!color) return null;
              return (
                <button
                  key={color.id}
                  onClick={() => toggle(color.id)}
                  className={`${btnBase} ${color.bg} ${color.text} ${color.hover} ${
                    picked.includes(color.id) ? 'scale-105 border-gray-900 shadow-lg' : 'border-transparent'
                  }`}
                >
                  <span className="block text-[10px] leading-none opacity-60">{color.id}</span>
                  {color.name}
                  {color.desc && <span className="block text-[10px] opacity-70">{color.desc}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">全部颜色（共 {colorPresets.length} 种）</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {colorPresets.map((color) => (
              <button
                key={color.id}
                onClick={() => toggle(color.id)}
                className={`${btnBase} ${color.bg} ${color.text} ${color.hover} ${
                  picked.includes(color.id) ? 'scale-105 border-gray-900 shadow-lg' : 'border-transparent'
                }`}
              >
                <span className="block text-[10px] leading-none opacity-60">{color.id}</span>
                {color.name}
                {color.desc && <span className="block text-[10px] opacity-70">{color.desc}</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">卡片内效果预览</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {picked.slice(0, 6).map((id) => {
              const color = colorPresets.find((item) => item.id === id)!;
              return (
                <div key={id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-1 text-xs font-bold text-gray-900">#{color.id} {color.name}</div>
                  <div className="mb-2 text-[10px] text-gray-400">{color.desc || '普通按钮'}</div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button className={`rounded px-2 py-1 text-[10px] ${color.bg} ${color.text} ${color.hover}`}>编辑</button>
                    <button className={`rounded px-2 py-1 text-[10px] ${color.bg} ${color.text} ${color.hover}`}>预览</button>
                    <button className={`rounded px-2 py-1 text-[10px] ${color.bg} ${color.text} ${color.hover}`}>导出</button>
                  </div>
                </div>
              );
            })}
            {picked.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs text-gray-400">
                请先点击上方按钮选择颜色，这里会显示卡片预览效果
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
