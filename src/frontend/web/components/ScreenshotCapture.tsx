import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button.tsx";
import { X, Check, AlertCircle } from "lucide-react";
import { cn } from "./ui/utils.ts";

interface ScreenshotCaptureProps {
  targetRef: React.RefObject<HTMLElement>;
  isActive: boolean;
  onCapture: (imageDataUrl: string, name: string) => void;
  onCancel: () => void;
}

export function ScreenshotCapture({
  targetRef,
  isActive,
  onCapture,
  onCancel,
}: ScreenshotCaptureProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setIsSelecting(false);
      setStartPos(null);
      setCurrentPos(null);
    }
  }, [isActive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!targetRef.current || !isActive) return;

    const rect = targetRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !targetRef.current || !startPos) return;

    const rect = targetRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    if (isSelecting && startPos && currentPos) {
      setIsSelecting(false);
    }
  };

  // Use native browser screenshot API via canvas with foreignObject SVG
  const captureUsingNativeMethod = async (element: HTMLElement, cropRect?: { x: number; y: number; width: number; height: number }) => {
    return new Promise<string>((resolve, reject) => {
      try {
        const rect = element.getBoundingClientRect();
        
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true) as HTMLElement;
        
        // Get computed styles and convert to inline styles to preserve appearance
        const copyComputedStyle = (source: HTMLElement, target: HTMLElement) => {
          const computedStyle = window.getComputedStyle(source);
          const cssText = Array.from(computedStyle).reduce((str, property) => {
            // Skip oklch-based properties to avoid parsing errors
            const value = computedStyle.getPropertyValue(property);
            if (value && !value.includes('oklch')) {
              return `${str}${property}:${value};`;
            }
            return str;
          }, '');
          target.style.cssText = cssText;

          // Recursively copy styles for children
          Array.from(source.children).forEach((child, index) => {
            if (child instanceof HTMLElement && target.children[index] instanceof HTMLElement) {
              copyComputedStyle(child, target.children[index] as HTMLElement);
            }
          });
        };

        copyComputedStyle(element, clone);

        // Create SVG with embedded HTML
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
            <foreignObject width="100%" height="100%">
              ${new XMLSerializer().serializeToString(clone)}
            </foreignObject>
          </svg>
        `;

        const canvas = document.createElement('canvas');
        const scale = 2;
        const width = cropRect ? cropRect.width : rect.width;
        const height = cropRect ? cropRect.height : rect.height;
        
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
          try {
            if (cropRect) {
              ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
            } else {
              ctx.drawImage(img, 0, 0, rect.width, rect.height);
            }
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
        
        // Timeout fallback
        setTimeout(() => {
          if (img.complete === false) {
            URL.revokeObjectURL(url);
            reject(new Error('Image load timeout'));
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  };

  const captureSelection = async () => {
    if (!targetRef.current || !startPos || !currentPos) return;

    setIsCapturing(true);

    try {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      const imageDataUrl = await captureUsingNativeMethod(targetRef.current, { x, y, width, height });
      const timestamp = new Date().toLocaleString();
      onCapture(imageDataUrl, `Screenshot ${timestamp}`);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Screenshot capture failed. This feature requires a modern browser. Please try 'Capture Full Area' or use your browser's built-in screenshot tool (Ctrl/Cmd + Shift + S).");
    } finally {
      setIsCapturing(false);
      setStartPos(null);
      setCurrentPos(null);
    }
  };

  const captureFullArea = async () => {
    if (!targetRef.current) return;

    setIsCapturing(true);

    try {
      const imageDataUrl = await captureUsingNativeMethod(targetRef.current);
      const timestamp = new Date().toLocaleString();
      onCapture(imageDataUrl, `Full Screenshot ${timestamp}`);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Screenshot capture failed. This feature requires a modern browser. Please use your browser's built-in screenshot tool (Ctrl/Cmd + Shift + S).");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isActive) return null;

  const selectionRect = startPos && currentPos ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  } : null;

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
      <div className="absolute inset-0 bg-black/20" />

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="absolute border-2 border-primary bg-primary/10"
          style={{
            left: `${selectionRect.left}px`,
            top: `${selectionRect.top}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
          }}
        />
      )}

      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-[60]">
        {startPos && currentPos && (
          <Button
            size="sm"
            onClick={captureSelection}
            disabled={isCapturing}
            className="shadow-lg"
          >
            <Check className="w-4 h-4 mr-2" />
            {isCapturing ? "Capturing..." : "Capture Selection"}
          </Button>
        )}
        
        <Button
          size="sm"
          variant="secondary"
          onClick={captureFullArea}
          disabled={isCapturing}
          className="shadow-lg"
        >
          <Check className="w-4 h-4 mr-2" />
          {isCapturing ? "Capturing..." : "Capture Full Area"}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={onCancel}
          disabled={isCapturing}
          className="shadow-lg"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border max-w-md text-center">
        <p className="text-sm">
          {selectionRect 
            ? "Click 'Capture Selection' to save, or continue dragging to adjust"
            : "Click and drag to select an area, or click 'Capture Full Area'"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          If capture fails, use browser screenshot tool (Ctrl/Cmd + Shift + S)
        </p>
      </div>
    </div>
  );
}
