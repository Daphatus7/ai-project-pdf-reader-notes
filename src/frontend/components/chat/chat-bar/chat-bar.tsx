/**
 * @file        chat-bar.ts
 * @description
 * 	- provide chat bar component for chat interface
 *
 * @author      [Peiyu Wang]
 * @created    Saturday
 * @license     © 2026 . All rights reserved.
 */

export interface ChatPanelProps {
	// 给用户提供输入消息的界面
	// 展示context 等等, 提供一个外界可以对内输入的接口
}


export function ChatBar() {
	return (
		<div className="w-full h-16 border-t border-gray-300 flex items-center px-4 bg-white">
			<input
				type="text"
				placeholder="Type your message..."
				className="flex-grow h-10 px-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
				Send
			</button>
		</div>
	);
}