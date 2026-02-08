import { useRef } from 'react';
import { RotateDirection, Viewer, Worker } from '@react-pdf-viewer/core';
import { toolbarPlugin, type ToolbarSlot } from '@react-pdf-viewer/toolbar';
import { useScreenshot } from './useScreenshot.tsx';
import { ScreenshotOverlay } from '../../screenshot/ScreenshotOverlay.tsx';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PdfReaderProps {
  onScreenshotCapture: (imageDataUrl: string, name: string) => void;
  onSaveToNote?: (imageDataUrl: string, name: string) => void;
  onDownload?: (imageDataUrl: string, name: string) => void;
}

export function PdfReader({ onScreenshotCapture, onSaveToNote, onDownload }: PdfReaderProps) {
  const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const containerRef = useRef<HTMLDivElement>(null);

  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  const screenshot = useScreenshot();

  const captureAndCall = async (callback: (dataUrl: string, name: string) => void) => {
    if (!containerRef.current) return;
    const dataUrl = await screenshot.capture(containerRef.current);
    callback(dataUrl, `screenshot-${Date.now()}.png`);
    screenshot.deactivate();
  };

  const handleAskAI = () => captureAndCall(onScreenshotCapture);
  const handleSaveToNote = onSaveToNote ? () => captureAndCall(onSaveToNote) : undefined;
  const handleDownload = onDownload ? () => captureAndCall(onDownload) : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <Toolbar>
        {(props: ToolbarSlot) => (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <props.GoToPreviousPage />
              <props.CurrentPageInput />
              <span className="text-sm text-gray-500">/ <props.NumberOfPages /></span>
              <props.GoToNextPage />
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <props.ZoomOut />
              <props.Zoom />
              <props.ZoomIn />
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Actions */}
            <div className="flex items-center gap-1">
              <props.Rotate direction={RotateDirection.Backward} />
              <props.EnterFullScreen />
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Screenshot */}
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                screenshot.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              onClick={() => (screenshot.isActive ? screenshot.deactivate() : screenshot.activate())}
            >
              {screenshot.isActive ? 'Cancel' : 'Screenshot'}
            </button>
          </div>
        )}
      </Toolbar>

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => screenshot.handleMouseDown(e, containerRef.current!)}
        onMouseMove={(e) => screenshot.handleMouseMove(e, containerRef.current!)}
        onMouseUp={screenshot.handleMouseUp}
      >
        <Worker workerUrl={workerUrl}>
          <Viewer
            plugins={[toolbarPluginInstance, screenshot.plugin]}
            fileUrl="src/frontend/components/reader/Artificial Intelligence - A Modern Approach (3rd Edition).pdf"
          />
        </Worker>

        {/* Screenshot Overlay */}
        {screenshot.isActive && (
          <ScreenshotOverlay
            selectionRect={screenshot.selectionRect}
            isSelecting={screenshot.isSelecting}
            isCapturing={screenshot.isCapturing}
            onAskAI={handleAskAI}
            onSaveToNote={handleSaveToNote}
            onDownload={handleDownload}
            onCancel={screenshot.deactivate}
          />
        )}
      </div>
    </div>
  );
}
