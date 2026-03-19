import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AuthProvider } from "./features/auth";
import { router } from "./router";
import { Toaster } from "sonner";
import { LanguageProvider } from "./i18n/language-context";


/**
 * App - Application Root Component
 *
 * Provides global providers and context for the entire application.
 *
 * Provider 层级:
 * 1. LanguageProvider - 语言（中/英自动检测 + localStorage 持久化）
 * 2. AuthProvider - 用户认证状态
 * 3. DndProvider - 拖拽功能
 * 4. RouterProvider - 路由
 */
export default function App() {
	return (
		<LanguageProvider>
			<AuthProvider>
				<DndProvider backend={HTML5Backend}>
					<Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
						<RouterProvider router={router} />
					</Suspense>
				</DndProvider>
				<Toaster position="bottom-right" richColors />
			</AuthProvider>
		</LanguageProvider>
	);
}
