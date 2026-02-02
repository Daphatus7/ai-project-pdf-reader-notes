/**
 * @file        thread-tabs.tsx
 * @description Thread tabs component for switching between chat threads
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import type {ThreadTabsProps} from "@/frontend/api/types/llm.ts";


export function ThreadTabs({
							   threads,
							   activeThreadId,
							   onSelectThread,
							   onCreateThread,
							   onDeleteThread,
						   }: ThreadTabsProps) {
	return (
		<div className="flex justify-between"
		>
			{/* Thread tabs */}
			<div className="flex flex-row">
			{threads.map((thread) => {
				// 1. 判断当前这个 thread 是否是被选中的那个
				const isActive = thread.thread_id === activeThreadId;

				return (
					<div
						key={thread.thread_id}
						className={`
							flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap
							${isActive
								? "bg-white text-gray-900 shadow-sm border border-gray-200"
								: "text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-transparent"
							}
						`}
					>
						<button
							onClick={() => onSelectThread(thread.thread_id)}
							className="flex-1"
						>
							{thread.title || 'new chat'}
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDeleteThread(thread.thread_id);
							}}
							className="ml-1 p-0.5 rounded hover:bg-gray-300 text-gray-400 hover:text-gray-600"
							aria-label="Close thread"
						>
							×
						</button>
					</div>
				);
			})}
			</div>

			{/* Add new thread button */}
			<div className="w-8 h-8 flex items-center justify-center">
				<button onClick={onCreateThread}>+</button>
			</div>
		</div>
	);
}