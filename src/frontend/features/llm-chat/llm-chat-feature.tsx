import { forwardRef, useImperativeHandle } from "react";
import { useThreads } from "@/frontend/components/chat/thread-tabs/use-threads";
import { useChat } from "@/frontend/components/chat/use-chat";
import { ChatPanel } from "@/frontend/components/chat/chat-panel/chat-panel";
import type { LLMChatFeatureProps } from "@/frontend/api/types/llm";
import type { UserMessage } from "@/frontend/api/types/chat";

export type LLMChatFeatureHandle = {
	injectMessage: (message: UserMessage) => void;
};

export const LLMChatFeature = forwardRef<LLMChatFeatureHandle, LLMChatFeatureProps>(
	function LLMChatFeature({ onSelectContent }: LLMChatFeatureProps, ref) {
		const {
			threads,
			activeThreadId,
			activeMessages,
			selectThread,
			createThread,
			deleteThread,
			addUserMessage,
			addAIMessage,
		} = useThreads();

		const { 
			isLoading, 
			sendMessage 
		} = useChat(activeThreadId, addUserMessage, addAIMessage);

		useImperativeHandle(
			ref,
			() => ({
				injectMessage: (message: UserMessage) => {
					if (!activeThreadId) return;
					addUserMessage(message);
				},
			}),
			[activeThreadId, addUserMessage]
		);

		return (
			<ChatPanel
				threadProp={{
					threads,
					activeThreadId,
					onSelectThread: selectThread,
					onCreateThread: createThread,
					onDeleteThread: deleteThread,
				}}
				messages={activeMessages}
				isLoading={isLoading}
				onSendMessage={sendMessage}
				onSelectContent={onSelectContent}
			/>
		);
	}
);
