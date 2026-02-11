import { useRef, useLayoutEffect } from 'react';
import { Sparkles, StickyNote, Download, X } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';

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
  onSaveToNote?: () => void;
  onDownload?: () => void;
  onCancel: () => void;
}

const PANEL_GAP = 8;

export function ScreenshotOverlay({
  selectionRect,
  isSelecting,
  isCapturing,
  onAskAI,
  onSaveToNote,
  onDownload,
  onCancel,
}: ScreenshotOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay || !selectionRect || isSelecting) return;

    const cW = overlay.clientWidth;
    const cH = overlay.clientHeight;
    const pW = panel.offsetWidth;
    const pH = panel.offsetHeight;

    // Prefer right of selection
    let left = selectionRect.x + selectionRect.width + PANEL_GAP;
    let top = selectionRect.y;

    // Flip to left if overflows right
    if (left + pW > cW) {
      left = selectionRect.x - pW - PANEL_GAP;
    }

    // Clamp within container
    left = Math.max(PANEL_GAP, Math.min(left, cW - pW - PANEL_GAP));
    top = Math.max(PANEL_GAP, Math.min(top, cH - pH - PANEL_GAP));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  });

  return (
    <div ref={overlayRef} className="absolute inset-0 z-50 cursor-crosshair">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="absolute border-2 pointer-events-none"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            borderColor: 'var(--tt-brand-color-400)',
            backgroundColor: 'color-mix(in srgb, var(--tt-brand-color-400) 10%, transparent)',
          }}
        />
      )}

      {/* Action panel */}
      {selectionRect && !isSelecting && (
        <div
          ref={panelRef}
          className="screenshot-action-panel absolute flex flex-col gap-1 rounded-lg border bg-popover p-1 shadow-lg"
          style={{
            left: selectionRect.x + selectionRect.width + PANEL_GAP,
            top: selectionRect.y,
          }}
          data-screenshot-ignore
        >
          <Button
            variant="default"
            size="sm"
            className="justify-start screenshot-action-panel__ai-btn"
            onClick={onAskAI}
            disabled={isCapturing}
          >
            <Sparkles />
            {isCapturing ? 'Capturing...' : 'Ask AI'}
          </Button>

          {onSaveToNote && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={onSaveToNote}
              disabled={isCapturing}
            >
              <StickyNote />
              Save to Note
            </Button>
          )}

          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={onDownload}
              disabled={isCapturing}
            >
              <Download />
              Download
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={onCancel}
          >
            <X />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
