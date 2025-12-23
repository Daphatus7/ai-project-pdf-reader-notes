import { useEffect, useRef } from 'react';
import {type Plugin, type PluginRenderPageLayer, type PdfJs, type ViewerState, getPage} from '@react-pdf-viewer/core';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PageMeta {
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

export interface PdfScreenshotCaptureController {
  /**
   * Captures the selection as a PNG data URL by re-rendering the PDF page(s) with pdf.js.
   *
   * This avoids relying on DOM canvases and remains correct when the user scrolls and pages
   * are virtualized/unmounted by the viewer.
   *
   * Assumptions:
   * - The selection coordinates are relative to the viewer container element.
   * - Multi-page selections are stitched top-to-bottom.
   */
  captureSelection(params: { viewerElement: HTMLElement; selection: Rect }): Promise<string>;

  /**
   * Captures the currently active page (from viewer state) as a PNG data URL.
   */
  captureCurrentPage(params?: { renderScaleMultiplier?: number }): Promise<string>;
}

export interface PdfScreenshotCapture {
  plugin: Plugin;
  controller: PdfScreenshotCaptureController;
}

function intersectRects(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function renderPdfPageToCanvas(params: {
  doc: PdfJs.PdfDocument;
  pageIndex: number;
  scale: number;
  rotation: number;
}): Promise<HTMLCanvasElement> {
  const page = await getPage(params.doc, params.pageIndex);
  const viewport = page.getViewport({ scale: params.scale, rotation: params.rotation });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const task = page.render({ canvasContext: ctx, viewport });
  await task.promise;
  return canvas;
}

function cropCanvas(params: { source: HTMLCanvasElement; crop: { x: number; y: number; width: number; height: number } }): HTMLCanvasElement {
  const sx = clampInt(params.crop.x, 0, params.source.width - 1);
  const sy = clampInt(params.crop.y, 0, params.source.height - 1);
  const sw = clampInt(params.crop.width, 1, params.source.width - sx);
  const sh = clampInt(params.crop.height, 1, params.source.height - sy);

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;

  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(params.source, sx, sy, sw, sh, 0, 0, sw, sh);

  return out;
}

function stitchVertically(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
  const width = Math.max(1, ...canvases.map((c) => c.width));
  const height = canvases.reduce((sum, c) => sum + c.height, 0);

  const out = document.createElement('canvas');
  out.width = width;
  out.height = Math.max(1, height);

  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }

  return out;
}

export function createPdfScreenshotCapture(): PdfScreenshotCapture {
  let doc: PdfJs.PdfDocument | null = null;
  let viewerState: ViewerState | null = null;

  const pageLayers = new Map<number, HTMLDivElement>();
  const pageMetas = new Map<number, PageMeta>();

  const PageLayerTracker = (props: { pageIndex: number; width: number; height: number; rotation: number; scale: number }) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!ref.current) return;
      pageLayers.set(props.pageIndex, ref.current);
      pageMetas.set(props.pageIndex, {
        width: props.width,
        height: props.height,
        rotation: props.rotation,
        scale: props.scale,
      });
      return () => {
        pageLayers.delete(props.pageIndex);
        pageMetas.delete(props.pageIndex);
      };
    }, [props.pageIndex, props.width, props.height, props.rotation, props.scale]);

    return (
      <div
        ref={ref}
        data-pdf-screenshot-page-layer={props.pageIndex}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    );
  };

  const plugin: Plugin = {
    onDocumentLoad: (e) => {
      doc = e.doc;
    },
    onViewerStateChange: (nextState) => {
      viewerState = nextState;
      return nextState;
    },
    renderPageLayer: (props: PluginRenderPageLayer) => {
      return (
        <PageLayerTracker
          pageIndex={props.pageIndex}
          width={props.width}
          height={props.height}
          rotation={props.rotation}
          scale={props.scale}
        />
      );
    },
  };

  const controller: PdfScreenshotCaptureController = {
    async captureSelection(params: { viewerElement: HTMLElement; selection: Rect }): Promise<string> {
      if (!doc) throw new Error('PDF document is not loaded');
      if (!viewerState) throw new Error('Viewer state is not available');

      const viewerBounds = params.viewerElement.getBoundingClientRect();

      const hits: Array<{
        pageIndex: number;
        cropInPageCssPx: Rect;
        pageCssWidth: number;
        pageCssHeight: number;
        pageRotation: number;
      }> = [];

      for (const [pageIndex, layerEl] of pageLayers.entries()) {
        const meta = pageMetas.get(pageIndex);
        if (!meta) continue;

        const pageBounds = layerEl.getBoundingClientRect();
        const pageInViewer: Rect = {
          left: pageBounds.left - viewerBounds.left,
          top: pageBounds.top - viewerBounds.top,
          width: pageBounds.width,
          height: pageBounds.height,
        };

        const intersection = intersectRects(params.selection, pageInViewer);
        if (!intersection) continue;

        hits.push({
          pageIndex,
          cropInPageCssPx: {
            left: intersection.left - pageInViewer.left,
            top: intersection.top - pageInViewer.top,
            width: intersection.width,
            height: intersection.height,
          },
          pageCssWidth: meta.width,
          pageCssHeight: meta.height,
          pageRotation: meta.rotation,
        });
      }

      if (hits.length === 0) {
        throw new Error('Selection does not intersect any rendered page');
      }

      hits.sort((a, b) => a.pageIndex - b.pageIndex);

      const renderScaleMultiplier = 2;
      const renderScale = viewerState.scale * renderScaleMultiplier;

      const croppedCanvases: HTMLCanvasElement[] = [];
      for (const hit of hits) {
        const rendered = await renderPdfPageToCanvas({
          doc,
          pageIndex: hit.pageIndex,
          scale: renderScale,
          rotation: hit.pageRotation,
        });

        const ratioX = rendered.width / hit.pageCssWidth;
        const ratioY = rendered.height / hit.pageCssHeight;

        const cropPx = {
          x: hit.cropInPageCssPx.left * ratioX,
          y: hit.cropInPageCssPx.top * ratioY,
          width: hit.cropInPageCssPx.width * ratioX,
          height: hit.cropInPageCssPx.height * ratioY,
        };

        croppedCanvases.push(cropCanvas({ source: rendered, crop: cropPx }));
      }

      const stitched = croppedCanvases.length === 1 ? croppedCanvases[0] : stitchVertically(croppedCanvases);
      return stitched.toDataURL('image/png');
    },

    async captureCurrentPage(params?: { renderScaleMultiplier?: number }): Promise<string> {
      if (!doc) throw new Error('PDF document is not loaded');
      if (!viewerState) throw new Error('Viewer state is not available');

      const pageIndex = viewerState.pageIndex;
      const meta = pageMetas.get(pageIndex);
      const rotation = meta?.rotation ?? viewerState.rotation ?? 0;

      const renderScaleMultiplier = params?.renderScaleMultiplier ?? 2;
      const renderScale = viewerState.scale * renderScaleMultiplier;

      const rendered = await renderPdfPageToCanvas({
        doc,
        pageIndex,
        scale: renderScale,
        rotation,
      });
      return rendered.toDataURL('image/png');
    },
  };

  return { plugin, controller };
}



