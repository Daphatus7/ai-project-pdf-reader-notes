import { Button } from './ui/button.tsx';
import { cn } from './ui/utils.ts';

interface ScreenshotWidgetProps {
  /**
   * Position of the widget relative to the screenshot container.
   * Expects CSS-ready values (e.g., '8px', '1rem').
   */
  top?: string;
  right?: string;
  /**
   * Callback fired when the user requests an explanation.
   * Intended to trigger capture + downstream AI call orchestration.
   */
  onAskExplanation?: () => void;

  /**
   * Additional class names to customize the container.
   */
  className?: string;
}

/**
 * Corner widget for screenshot overlays with placeholder actions.
 * Intended to be positioned absolute inside the screenshot container.
 */
export function ScreenshotWidget({
  top = '8px',
  right = '8px',
  onAskExplanation,
  className,
}: ScreenshotWidgetProps) {
  return (
    <div
      className={cn(
        'absolute flex flex-col gap-2 p-2 rounded-lg bg-background/90 backdrop-blur shadow-lg border',
        className,
      )}
      style={{ top, right }}
      data-screenshot-ignore='true'
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Button size='sm' onClick={onAskExplanation}>
        Explain
      </Button>
    </div>
  );
}

