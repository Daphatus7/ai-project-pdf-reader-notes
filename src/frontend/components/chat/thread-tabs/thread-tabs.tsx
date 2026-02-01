/**
 * @file        thread-tabs.tsx
 * @description Thread tabs component for switching between chat threads
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import type { ThreadTabsProps } from '@/frontend/features/llm-chat/types';


export function ThreadTabs({
	threads,
	activeThreadId,
	onSelectThread,
	onCreateThread,
	onDeleteThread,
}: ThreadTabsProps) {
	return (
		<div className="flex items-center gap-1 px-2 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
			{/* Thread tabs */}
			{threads.map((thread) => (
				<div
					key={thread.id}
					className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
						activeThreadId === thread.id
							? 'bg-blue-500 text-white'
							: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
					}`}
					onClick={() => onSelectThread(thread.id)}
				>
					<span className="text-sm truncate max-w-[120px]">{thread.title}</span>
					{threads.length > 1 && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDeleteThread(thread.id);
							}}
							className={`text-xs px-1 rounded hover:bg-opacity-20 ${
								activeThreadId === thread.id
									? 'hover:bg-white'
									: 'hover:bg-gray-300'
							}`}
						>
							×
						</button>
					)}
				</div>
			))}

			{/* Add new thread button */}
			<button
				onClick={onCreateThread}
				className="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
			>
				+
			</button>
		</div>
	);
}
