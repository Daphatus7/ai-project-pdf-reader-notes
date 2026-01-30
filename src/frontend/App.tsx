import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./features/auth";
import { router } from "./router";

const queryClient = new QueryClient();

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
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<DndProvider backend={HTML5Backend}>
					<Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
						<RouterProvider router={router} />
					</Suspense>
				</DndProvider>
			</AuthProvider>
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
}
