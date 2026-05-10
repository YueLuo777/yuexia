import type { Material } from '@/hooks/useMaterials';

interface MaterialPreviewAreaProps {
  material: Material | null;
  width: number;
}

export default function MaterialPreviewArea({ material, width }: MaterialPreviewAreaProps) {
  const wordCount = material ? material.content.replace(/\s/g, '').length : 0;

  return (
    <div className="flex flex-col bg-white border-l border-gray-200 h-full shrink-0 overflow-hidden" style={{ width }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold text-blue-600">资料预览区</span>
      </div>

      {!material ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">请从右侧资料库选择资料</p>
        </div>
      ) : (
        <>
          {/* 元信息栏 */}
          <div className="flex flex-col gap-1 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 shrink-0">标题</span>
              <span className="text-xs font-medium text-gray-800 truncate">{material.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 shrink-0">作品</span>
              <span className="text-xs text-gray-600 truncate">{material.novelTitle}</span>
              {material.chapterSerial && (
                <>
                  <span className="text-[10px] text-gray-300">|</span>
                  <span className="text-xs text-gray-600">
                    第{material.chapterSerial}章{material.chapterName ? ` ${material.chapterName}` : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 正文内容 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{material.content}</p>
            </div>
          </div>

          {/* 底部栏 */}
          <div className="flex items-center px-3 h-[36px] border-t border-gray-100 shrink-0 bg-white">
            <span className="text-xs text-gray-400">
              字数 <span className="text-brand font-medium">{wordCount}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
