import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button.tsx';
import { X, Check, AlertCircle } from 'lucide-react';
import { cn } from './ui/utils.ts';
import { ScreenshotWidget } from './ScreenshotWidget.tsx';
import type { PdfScreenshotCaptureController } from '../features/services/pdf-screenshot-capture.tsx';

interface ScreenshotCaptureProps {
  targetRef: React.RefObject<HTMLElement | null>;
  isActive: boolean;
  pdfScreenshotCapture?: PdfScreenshotCaptureController;
  onCapture: (imageDataUrl: string, name: string) => void;
  onCancel: () => void;
}

export function ScreenshotCapture({
  targetRef,
  isActive,
  pdfScreenshotCapture,
  onCapture,
  onCancel,
}: ScreenshotCaptureProps) {
  const isMountedRef = useRef(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [finalRect, setFinalRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [containerRect, setContainerRect] = useState<{ width: number; height: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setIsSelecting(false);
      setStartPos(null);
      setCurrentPos(null);
      setFinalRect(null);
    }
  }, [isActive]);

  const shouldIgnorePointerEvent = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('[data-screenshot-ignore="true"]'));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!targetRef.current || !isActive) return;
    if (shouldIgnorePointerEvent(e.target)) return;

    const rect = targetRef.current.getBoundingClientRect();
    setContainerRect({ width: rect.width, height: rect.height });
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsSelecting(true);
    setFinalRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !targetRef.current || !startPos) return;
    if (shouldIgnorePointerEvent(e.target)) return;

    const rect = targetRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (shouldIgnorePointerEvent(e.target)) return;
    if (isSelecting && startPos && currentPos) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);
      setFinalRect({ x, y, width, height });
      setIsSelecting(false);
    }
  };

  const getRectToUse = () => {
    if (finalRect) return finalRect;
    if (startPos && currentPos) {
      return {
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      };
    }
    return null;
  };

  const captureSelection = async (namePrefix: string) => {
    const rectToUse = getRectToUse();
    if (!targetRef.current || !rectToUse) return;

    if (isMountedRef.current) setIsCapturing(true);

    try {
      const timestamp = new Date().toLocaleString();
      const name = `${namePrefix} ${timestamp}`;

      if (!pdfScreenshotCapture) {
        throw new Error('PDF screenshot capture is not available');
      }

      const imageDataUrl = await pdfScreenshotCapture.captureSelection({
        viewerElement: targetRef.current,
        selection: {
          left: rectToUse.x,
          top: rectToUse.y,
          width: rectToUse.width,
          height: rectToUse.height,
        },
      });

      onCapture(imageDataUrl, name);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // alert('captureSelection capture failed. Please try again.');
    } finally {
      if (isMountedRef.current) setIsCapturing(false);
    }
  };

  const captureFullArea = async (namePrefix: string) => {
    if (!targetRef.current) return;

    if (isMountedRef.current) setIsCapturing(true);

    try {
      const timestamp = new Date().toLocaleString();
      const name = `${namePrefix} ${timestamp}`;

      if (!pdfScreenshotCapture) {
        throw new Error('PDF screenshot capture is not available');
      }

      const imageDataUrl = await pdfScreenshotCapture.captureCurrentPage();
      onCapture(imageDataUrl, name);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      alert('captureFullArea capture failed. Please try again.');
    } finally {
      if (isMountedRef.current) setIsCapturing(false);
    }
  };

  if (!isActive) return null;

  const selectionRect = (() => {
    if (finalRect) {
      return {
        left: finalRect.x,
        top: finalRect.y,
        width: finalRect.width,
        height: finalRect.height,
      };
    }
    if (startPos && currentPos) {
      return {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      };
    }
    return null;
  })();

  const widgetPosition = (() => {
    if (!selectionRect || !containerRect) return null;
    const right = Math.max(8, containerRect.width - (selectionRect.left + selectionRect.width) + 8);
    const top = Math.max(8, selectionRect.top + 8);
    return { top: `${top}px`, right: `${right}px` };
  })();

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute inset-0 z-50",
        isActive && "cursor-crosshair"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Semi-transparent overlay */}
      <div className='absolute inset-0 bg-black/20' />

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className='absolute border-2 border-primary bg-primary/10'
          style={{
            left: `${selectionRect.left}px`,
            top: `${selectionRect.top}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
          }}
        />
      )}

      {/* Action widget anchored near the selection */}
      {selectionRect && widgetPosition && !isSelecting && (
        <ScreenshotWidget
          top={widgetPosition.top}
          right={widgetPosition.right}
          onAskExplanation={async () => {
            if (isCapturing) return;
            await captureSelection('AI Screenshot');
            onCancel();
          }}
        />
      )}

      {/* Control buttons */}
      <div className='absolute top-4 right-4 flex gap-2 z-[60]' data-screenshot-ignore='true'>
        {startPos && currentPos && (
          <Button
            size="sm"
            onClick={() => void captureSelection('Screenshot')}
            disabled={isCapturing}
            className='shadow-lg'
          >
            <Check className='w-4 h-4 mr-2' />
            {isCapturing ? 'Capturing...' : 'Capture Selection'}
          </Button>
        )}
        
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void captureFullArea('Full Screenshot')}
          disabled={isCapturing}
          className='shadow-lg'
        >
          <Check className='w-4 h-4 mr-2' />
          {isCapturing ? 'Capturing...' : 'Capture Full Area'}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={onCancel}
          disabled={isCapturing}
          className='shadow-lg'
        >
          <X className='w-4 h-4 mr-2' />
          Cancel
        </Button>
      </div>

      {/* Instructions */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border max-w-md text-center'>
        <p className='text-sm'>
          {selectionRect 
            ? "Click 'Capture Selection' to save, or continue dragging to adjust"
            : "Click and drag to select an area, or click 'Capture Full Area'"}
        </p>
        <p className='text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1'>
          <AlertCircle className='w-3 h-3' />
          If capture fails, use browser screenshot tool (Ctrl/Cmd + Shift + S)
        </p>
      </div>
    </div>
  );
}
