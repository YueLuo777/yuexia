import { useState, useEffect, useRef } from 'react';
import { X, Type, Palette, Ruler, Rows3 } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

export interface FontSettings {
  fontFamily: string;
  fontColor: string;
  fontSize: number;
  lineHeight: number;
}

const DEFAULT_SETTINGS: FontSettings = {
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  fontColor: '#374151',
  fontSize: 30,
  lineHeight: 1.8,
};

const FONT_OPTIONS = [
  { label: '默认字体', value: 'PingFang SC, Microsoft YaHei, sans-serif' },
  { label: '宋体', value: 'SimSun, Songti SC, serif' },
  { label: '黑体', value: 'SimHei, Heiti SC, sans-serif' },
];

const COLOR_OPTIONS = [
  '#374151', '#111827', '#DC2626', '#EA580C', '#D97706',
  '#059669', '#0891B2', '#2563EB', '#7C3AED', '#DB2777',
];

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FontSettings;
  onChange: (settings: FontSettings) => void;
}

export function getStoredFontSettings(): FontSettings {
  try {
    const raw = localStorage.getItem('font_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function storeFontSettings(settings: FontSettings) {
  try { localStorage.setItem('font_settings', JSON.stringify(settings)); } catch {}
}

export default function FontSettingsModal({ isOpen, onClose, settings, onChange }: FontSettingsModalProps) {
  const [local, setLocal] = useState<FontSettings>({ ...settings });
  const backdropRef = useBackdropClick(onClose, isOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  useEscToClose(onClose, isOpen);

  useEffect(() => { setLocal({ ...settings }); }, [settings]);

  if (!isOpen) return null;

  const update = (patch: Partial<FontSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
    storeFontSettings(next);
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-gray-900">字体设置</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-5">
          {/* 字体 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-700">字体</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => update({ fontFamily: f.value })}
                  className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                    local.fontFamily === f.value
                      ? 'border-brand bg-brand-light text-brand-dark font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 字体颜色 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-700">字体颜色</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ fontColor: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    local.fontColor === c ? 'border-brand scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                ref={inputRef}
                type="color"
                value={local.fontColor}
                onChange={(e) => update({ fontColor: e.target.value })}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
              />
            </div>
          </div>

          {/* 字号 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">字号</span>
              </div>
              <span className="text-xs text-gray-400">{local.fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ fontSize: Math.max(12, local.fontSize - 1) })}
                className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
              >
                -
              </button>
              <input
                type="range"
                min={12}
                max={30}
                value={local.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="flex-1"
                style={{
                  background: `linear-gradient(to right, #08B3D9 ${((local.fontSize - 12) / 18) * 100}%, #e5e7eb ${((local.fontSize - 12) / 18) * 100}%)`,
                }}
              />
              <button
                onClick={() => update({ fontSize: Math.min(30, local.fontSize + 1) })}
                className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* 行高 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Rows3 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">行高</span>
              </div>
              <span className="text-xs text-gray-400">{local.lineHeight}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ lineHeight: Math.max(1, Number((local.lineHeight - 0.1).toFixed(1))) })}
                className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
              >
                -
              </button>
              <input
                type="range"
                min={10}
                max={24}
                value={Math.round(local.lineHeight * 10)}
                onChange={(e) => update({ lineHeight: Number(e.target.value) / 10 })}
                className="flex-1"
                style={{
                  background: `linear-gradient(to right, #08B3D9 ${((Math.round(local.lineHeight * 10) - 10) / 14) * 100}%, #e5e7eb ${((Math.round(local.lineHeight * 10) - 10) / 14) * 100}%)`,
                }}
              />
              <button
                onClick={() => update({ lineHeight: Math.min(2.4, Number((local.lineHeight + 0.1).toFixed(1))) })}
                className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* 预览 */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-400 mb-2">预览</p>
            <div
              className="min-h-[60px] p-3 bg-white rounded border border-gray-200"
              style={{
                fontFamily: local.fontFamily,
                color: local.fontColor,
                fontSize: `${Math.min(local.fontSize, 16)}px`,
                lineHeight: local.lineHeight,

              }}
            >
              这是一段预览文字，用于查看字体设置效果。
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={() => { update({ ...DEFAULT_SETTINGS }); }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            恢复默认
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
