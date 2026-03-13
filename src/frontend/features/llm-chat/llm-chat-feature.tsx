import { forwardRef, useImperativeHandle } from "react";
import { useThreads } from "@/frontend/components/chat/thread-sidebar/use-threads.ts";
import { useChat } from "@/frontend/components/chat/use-chat";
import { ChatPanel } from "@/frontend/components/chat/chat-panel/chat-panel";
import type { LLMChatFeatureProps } from "@/frontend/api/types/llm";
import type {ChatContent} from "@/frontend/api";

export type LLMChatFeatureHandle = {
	injectMessage: (message: ChatContent[]) => void;
};

export const LLMChatFeature = forwardRef<LLMChatFeatureHandle, LLMChatFeatureProps>(
	function LLMChatFeature({ onSelectContent, sourceIds = [], selectedSources, onDeselectSource, projectId = null }: LLMChatFeatureProps, ref) {
		const {
			threads,
			activeThreadId,
			activeMessages,
			isLoading: isThreadsLoading,
			selectThread,
			createThread,
			deleteThread,
			addUserMessage,
			startStreamingMessage,
			appendStreamingChunk,
			finalizeStreamingMessage,
		} = useThreads();

		const {
			isLoading,
			sendMessage
		} = useChat(
			activeThreadId,
			projectId,
			addUserMessage, 
			startStreamingMessage, 
			appendStreamingChunk, 
			finalizeStreamingMessage, 
			sourceIds);

		useImperativeHandle(
			ref,
			() => ({
				injectMessage: (message: ChatContent[]) => {
					if (!activeThreadId) return;
					sendMessage(message);
				},
			}),
			[activeThreadId, sendMessage]
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
				isThreadsLoading={isThreadsLoading}
				onSendMessage={sendMessage}
				onSelectContent={onSelectContent}
				selectedSources={selectedSources}
				onDeselectSource={onDeselectSource}
			/>
		);
	}
);
