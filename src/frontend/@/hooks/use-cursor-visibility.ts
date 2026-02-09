import type { Editor } from "@tiptap/react"
import { useWindowSize } from "@/frontend/@/hooks/use-window-size.ts"
import { useBodyRect } from "@/frontend/@/hooks/use-element-rect.ts"
import { useEffect } from "react"

export interface CursorVisibilityOptions {
  /**
   * The Tiptap editor instance
   */
  editor?: Editor | null
  /**
   * Reference to the toolbar element that may obscure the cursor
   */
  overlayHeight?: number
}

/**
 * Custom hook that ensures the cursor remains visible when typing in a Tiptap editor.
 * Automatically scrolls the window when the cursor would be hidden by the toolbar.
 *
 * @param options.editor The Tiptap editor instance
 * @param options.overlayHeight Toolbar height to account for
 * @returns The bounding rect of the body
 */
export function useCursorVisibility({
  editor,
  overlayHeight = 0,
}: CursorVisibilityOptions) {
  const { height: windowHeight } = useWindowSize()
  const rect = useBodyRect({
    enabled: true,
    throttleMs: 100,
    useResizeObserver: true,
  })

  useEffect(() => {
    const ensureCursorVisibility = () => {
      if (!editor) return

      try {
        const { state, view } = editor
        if (!view.hasFocus()) return

        const { from } = state.selection
        const cursorCoords = view.coordsAtPos(from)

        if (windowHeight < rect.height && cursorCoords) {
          const availableSpace = windowHeight - cursorCoords.top

          if (availableSpace < overlayHeight) {
            const targetCursorY = Math.max(windowHeight / 2, overlayHeight)
            const currentScrollY = window.scrollY
            const cursorAbsoluteY = cursorCoords.top + currentScrollY
            const newScrollY = cursorAbsoluteY - targetCursorY

            window.scrollTo({
              top: Math.max(0, newScrollY),
              behavior: "smooth",
            })
          }
        }
      } catch {
        // Editor view not mounted yet, will retry on next effect trigger
      }
    }

    ensureCursorVisibility()
  }, [editor, overlayHeight, windowHeight, rect.height])

  return rect
}
