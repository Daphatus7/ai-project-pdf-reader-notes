interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotOverlayProps {
  selectionRect: Rect | null;
  isSelecting: boolean;
  isCapturing: boolean;
  onAskAI: () => void;
  onCancel: () => void;
}

export function ScreenshotOverlay({
  selectionRect,
  isSelecting,
  isCapturing,
  onAskAI,
  onCancel,
}: ScreenshotOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 cursor-crosshair">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}

      {/* Action widget - shows after selection complete */}
      {selectionRect && !isSelecting && (
        <div
          className="absolute bg-white rounded shadow-lg p-2 flex flex-col gap-2"
          style={{
            left: selectionRect.x + selectionRect.width + 8,
            top: selectionRect.y,
          }}
          data-screenshot-ignore
        >
          <button
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={onAskAI}
            disabled={isCapturing}
          >
            {isCapturing ? 'Capturing...' : 'Ask AI'}
          </button>
          <button
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
