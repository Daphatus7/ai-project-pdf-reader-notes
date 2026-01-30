import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import NotePage from "@@/frontend/pages/my-note/my-note-page.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

/**
 * App - Application Root Component
 *
 * Provides global providers and context for the entire application.
 * Delegates main functionality to the NotePage component.
 *
 * Responsibilities:
 * - Setup global providers (DnD context)
 * - Route management (if needed in the future)
 * - Global state providers (if needed in the future)
 */
export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<DndProvider backend={HTML5Backend}>
				<NotePage />
			</DndProvider>
			<ReactQueryDevtools/>
		</QueryClientProvider>
	);
}
