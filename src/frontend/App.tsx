import { Suspense, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AuthProvider } from "./features/auth";
import { router } from "./router";
import { Toaster } from "sonner";


/**
 * App - Application Root Component
 *
 * Provides global providers and context for the entire application.
 *
 * Provider 层级:
 * 1. QueryClientProvider - 数据请求缓存
 * 2. AuthProvider - 用户认证状态
 * 3. DndProvider - 拖拽功能
 * 4. RouterProvider - 路由
 */
export default function App() {
	/* 全局 dark mode 初始化：在任何组件挂载前同步系统偏好，并监听后续变化 */
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
		document.documentElement.classList.toggle("dark", mediaQuery.matches)
		const handleChange = (e: MediaQueryListEvent) =>
			document.documentElement.classList.toggle("dark", e.matches)
		mediaQuery.addEventListener("change", handleChange)
		return () => mediaQuery.removeEventListener("change", handleChange)
	}, [])

	return (
		<AuthProvider>
			<DndProvider backend={HTML5Backend}>
				<Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
					<RouterProvider router={router} />
				</Suspense>
			</DndProvider>
		<Toaster position="bottom-right" richColors />
		</AuthProvider>
	);
}
