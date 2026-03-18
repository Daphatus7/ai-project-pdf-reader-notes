import { Button } from "@/frontend/@/components/tiptap-ui-primitive/button"

// --- Icons ---
import { MoonStarIcon } from "@/frontend/@/components/tiptap-icons/moon-star-icon.tsx"
import { SunIcon } from "@/frontend/@/components/tiptap-icons/sun-icon.tsx"
import { useState } from "react"

/* 纯 UI 按钮：切换 <html> 上的 .dark class 并持久化到 localStorage */
export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    document.documentElement.classList.contains("dark")
  )

  const toggleDarkMode = () => {
    const next = !isDarkMode
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDarkMode(next)
  }

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      data-style="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}
