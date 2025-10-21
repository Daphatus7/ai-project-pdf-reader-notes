import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionOverlayProps {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Callback when a selection is made */
  onSelection?: (selection: SelectionRect) => void;
  /** Callback when selection is cleared */
  onClearSelection?: () => void;
  /** Current selection rectangle */
  currentSelection?: SelectionRect | null;
  /** Whether to show selection handles for resizing */
  showHandles?: boolean;
}

/**
 * Overlay component that provides selection functionality over PDF content
 * Allows users to draw selection rectangles by clicking and dragging
 */
export const PdfSelectionOverlay: React.FC<SelectionOverlayProps> = ({
  isSelectionMode,
  onSelection,
  onClearSelection,
  currentSelection,
  showHandles = true,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate selection rectangle from start and end points
  const getSelectionRect = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): SelectionRect => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    return { x, y, width, height };
  }, []);

  // Handle mouse down to start selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelectionMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsSelecting(true);
  }, [isSelectionMode]);

  // Handle mouse move during selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPoint) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setEndPoint({ x, y });
  }, [isSelecting, startPoint]);

  // Handle mouse up to complete selection
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPoint || !endPoint) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const selection = getSelectionRect(startPoint, endPoint);
    
    // Only create selection if it has meaningful size
    if (selection.width > 5 && selection.height > 5) {
      onSelection?.(selection);
    }
    
    setIsSelecting(false);
    setStartPoint(null);
    setEndPoint(null);
  }, [isSelecting, startPoint, endPoint, getSelectionRect, onSelection]);

  // Handle clicking outside to clear selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isSelectionMode) return;
    
    // If clicking without dragging, clear selection
    if (!isSelecting && currentSelection) {
      onClearSelection?.();
    }
  }, [isSelectionMode, isSelecting, currentSelection, onClearSelection]);

  // Handle escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentSelection) {
        onClearSelection?.();
      }
    };

    if (isSelectionMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSelectionMode, currentSelection, onClearSelection]);

  // Get current selection rectangle (either from props or from current drag)
  const getCurrentRect = (): SelectionRect | null => {
    if (currentSelection) return currentSelection;
    if (startPoint && endPoint) {
      return getSelectionRect(startPoint, endPoint);
    }
    return null;
  };

  const currentRect = getCurrentRect();

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: isSelectionMode ? 'crosshair' : 'default',
        zIndex: 10,
        pointerEvents: isSelectionMode ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {/* Selection rectangle */}
      {currentRect && (
        <div
          style={{
            position: 'absolute',
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
            border: '2px solid #007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        >
          {/* Selection handles for resizing */}
          {showHandles && currentSelection && (
            <>
              {/* Corner handles */}
              {[
                { x: -4, y: -4, cursor: 'nw-resize' },
                { x: currentRect.width - 4, y: -4, cursor: 'ne-resize' },
                { x: -4, y: currentRect.height - 4, cursor: 'sw-resize' },
                { x: currentRect.width - 4, y: currentRect.height - 4, cursor: 'se-resize' },
                // Edge handles
                { x: currentRect.width / 2 - 4, y: -4, cursor: 'n-resize' },
                { x: currentRect.width / 2 - 4, y: currentRect.height - 4, cursor: 's-resize' },
                { x: -4, y: currentRect.height / 2 - 4, cursor: 'w-resize' },
                { x: currentRect.width - 4, y: currentRect.height / 2 - 4, cursor: 'e-resize' },
              ].map((handle, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: handle.x,
                    top: handle.y,
                    width: 8,
                    height: 8,
                    backgroundColor: '#007acc',
                    border: '1px solid #fff',
                    borderRadius: '1px',
                    cursor: handle.cursor,
                    pointerEvents: 'auto',
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}
      
      {/* Selection mode indicator */}
      {isSelectionMode && !currentRect && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 122, 204, 0.9)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 12,
          }}
        >
          Click and drag to select area
        </div>
      )}
    </div>
  );
};

export default PdfSelectionOverlay;
