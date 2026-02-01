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
						   }: ThreadTabsProps) {
	return (
		<div className="flex justify-between"
		>
			{/* Thread tabs */}
			<div className="flex flex-row">
			{threads.map((thread) => {
				// 1. 判断当前这个 thread 是否是被选中的那个
				const isActive = thread.id === activeThreadId;

				return (
					<button
						// 2. 必须要有唯一的 key (通常是 ID)
						key={thread.id}

						// 3. 点击时，调用父组件传下来的回调，把 ID 传回去
						onClick={() => onSelectThread(thread.id)}

						// 4. 根据是否 Active 动态切换样式
						// whitespace-nowrap 防止标题过长换行
						className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                      ${isActive
							? "bg-white text-gray-900 shadow-sm border border-gray-200" // 激活状态：白底、深字、带边框
							: "text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-transparent" // 未激活：灰字、悬停变灰
						}
                   `}
					>
						{/* 5. 显示标题，如果没有标题则显示默认文案 */}
						{thread.title || 'new chat'}
					</button>
				);
			})}
			</div>

			{/* Add new thread button */}
			<button
				onClick={onCreateThread}
			>
				+
			</button>
		</div>
	);
}