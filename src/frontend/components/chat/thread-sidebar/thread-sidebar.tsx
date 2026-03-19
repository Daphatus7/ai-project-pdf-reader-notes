/**
 * @file        thread-sidebar.tsx
 * @description Sidebar panel for managing chat threads
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import { Button } from "@/frontend/components/ui/button.tsx";
import { ScrollArea } from "@/frontend/components/ui/scroll-area.tsx";
import {LucideSidebar, Plus, X} from "lucide-react";
import type { ThreadTabsProps } from "@/frontend/api/types/llm.ts";
import { useLanguage } from "@/frontend/i18n/language-context";

interface ThreadSidebarProps extends ThreadTabsProps {
	onClose: () => void;
}

export function ThreadSidebar({
	threads,
	activeThreadId,
	onSelectThread,
	onCreateThread,
	onDeleteThread,
	onClose,
}: ThreadSidebarProps) {
	const { t } = useLanguage();
	return (
		<div className="w-1/2 border-l flex flex-col h-full bg-panel">
			<div className="p-3 border-b flex items-center justify-between h-13">
				<span className="text-sm font-medium">{t.chat.threads}</span>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
					<LucideSidebar className="h-4 w-4" />
				</Button>
			</div>

			<div className="p-3 border-b">
				<Button className="w-full" size="sm" onClick={onCreateThread}>
					<Plus className="w-4 h-4 mr-2" />
					{t.chat.newThread}
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2 flex flex-col gap-1">
					{threads.map((thread, index) => {
						const isActive = thread.thread_id === activeThreadId;
						return (
							<div
								key={thread.thread_id}
								className={`
									flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
									${isActive
										? "bg-accent  text-sm"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
									}
								`}
								onClick={() => onSelectThread(thread.thread_id)}
							>
								<span className="truncate flex-1">
									{thread.title && thread.title !== "New Conversation" ? thread.title : t.chat.threadTitle.replace('{n}', String(index + 1))}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0"
									onClick={(e) => {
										e.stopPropagation();
										onDeleteThread(thread.thread_id);
									}}
									aria-label={t.chat.deleteThread}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}
