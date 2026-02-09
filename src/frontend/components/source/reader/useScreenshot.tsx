import { useState, useRef, useCallback } from 'react';
import { type PdfJs, type ViewerState, getPage, type Plugin } from '@react-pdf-viewer/core';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageInfo {
  pageIndex: number;
  element: HTMLElement;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export function useScreenshot() {
  const [isActive, setIsActive] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const docRef = useRef<PdfJs.PdfDocument | null>(null);
  const viewerStateRef = useRef<ViewerState | null>(null);
  const pagesRef = useRef<Map<number, PageInfo>>(new Map());

  // Plugin for viewer
  const plugin: Plugin = {
    onDocumentLoad: (e) => {
      docRef.current = e.doc;
    },
    onViewerStateChange: (state) => {
      viewerStateRef.current = state;
      return state;
    },
    renderPageLayer: (props) => {
      const { pageIndex, width, height, scale, rotation } = props;
      return (
        <div
          ref={(el) => {
            if (el) {
              pagesRef.current.set(pageIndex, { pageIndex, element: el, width, height, scale, rotation });
            }
          }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />
      );
    },
  };

  const activate = useCallback(() => setIsActive(true), []);
  const deactivate = useCallback(() => {
    setIsActive(false);
    setIsSelecting(false);
    setSelectionRect(null);
    startPointRef.current = null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, containerEl: HTMLElement) => {
    if (!isActive) return;
    if ((e.target as HTMLElement).closest('[data-screenshot-ignore]')) return;

    const rect = containerEl.getBoundingClientRect();
    startPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsSelecting(true);
    setSelectionRect(null);
  }, [isActive]);

  const handleMouseMove = useCallback((e: React.MouseEvent, containerEl: HTMLElement) => {
    if (!isSelecting || !startPointRef.current) return;

    const rect = containerEl.getBoundingClientRect();
    const current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const start = startPointRef.current;

    setSelectionRect({
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    });
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);
  }, [isSelecting]);

  const capture = useCallback(async (containerEl: HTMLElement): Promise<string> => {
    if (!selectionRect || !docRef.current || !viewerStateRef.current) {
      throw new Error('Cannot capture: missing selection or document');
    }

    setIsCapturing(true);
    try {
      const containerBounds = containerEl.getBoundingClientRect();
      const hits: { pageIndex: number; crop: Rect; pageWidth: number; pageHeight: number; rotation: number }[] = [];

      // Find intersecting pages
      for (const [, page] of pagesRef.current) {
        const pageBounds = page.element.getBoundingClientRect();
        const pageInContainer = {
          x: pageBounds.left - containerBounds.left,
          y: pageBounds.top - containerBounds.top,
          width: pageBounds.width,
          height: pageBounds.height,
        };

        // Intersection
        const x = Math.max(selectionRect.x, pageInContainer.x);
        const y = Math.max(selectionRect.y, pageInContainer.y);
        const right = Math.min(selectionRect.x + selectionRect.width, pageInContainer.x + pageInContainer.width);
        const bottom = Math.min(selectionRect.y + selectionRect.height, pageInContainer.y + pageInContainer.height);

        if (right > x && bottom > y) {
          hits.push({
            pageIndex: page.pageIndex,
            crop: { x: x - pageInContainer.x, y: y - pageInContainer.y, width: right - x, height: bottom - y },
            pageWidth: page.width,
            pageHeight: page.height,
            rotation: page.rotation,
          });
        }
      }

      if (hits.length === 0) throw new Error('Selection does not intersect any page');
      hits.sort((a, b) => a.pageIndex - b.pageIndex);

      const scale = viewerStateRef.current.scale * 2;
      const canvases: HTMLCanvasElement[] = [];

      for (const hit of hits) {
        const pdfPage = await getPage(docRef.current, hit.pageIndex);
        const viewport = pdfPage.getViewport({ scale, rotation: hit.rotation });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;

        // Crop
        const ratioX = canvas.width / hit.pageWidth;
        const ratioY = canvas.height / hit.pageHeight;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.round(hit.crop.width * ratioX);
        cropCanvas.height = Math.round(hit.crop.height * ratioY);
        const cropCtx = cropCanvas.getContext('2d')!;
        cropCtx.drawImage(
          canvas,
          hit.crop.x * ratioX, hit.crop.y * ratioY, cropCanvas.width, cropCanvas.height,
          0, 0, cropCanvas.width, cropCanvas.height
        );
        canvases.push(cropCanvas);
      }

      // Stitch if multiple
      if (canvases.length === 1) {
        return canvases[0].toDataURL('image/png');
      }

      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
      const maxWidth = Math.max(...canvases.map((c) => c.width));
      const final = document.createElement('canvas');
      final.width = maxWidth;
      final.height = totalHeight;
      const finalCtx = final.getContext('2d')!;
      finalCtx.fillStyle = '#fff';
      finalCtx.fillRect(0, 0, final.width, final.height);
      let y = 0;
      for (const c of canvases) {
        finalCtx.drawImage(c, 0, y);
        y += c.height;
      }
      return final.toDataURL('image/png');
    } finally {
      setIsCapturing(false);
    }
  }, [selectionRect]);

  const download = useCallback((dataUrl: string, filename = 'screenshot.png') => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }, []);

  return {
    isActive,
    isSelecting,
    isCapturing,
    selectionRect,
    plugin,
    activate,
    deactivate,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    capture,
    download,
  };
}
