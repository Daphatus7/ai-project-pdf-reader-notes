import React, { useState, useRef, useCallback } from 'react';
import NoteTaker from '../../components/note-taker.tsx';
import ChatWindow from '../components/chat/chat-window';
import '../../App.css';
import {ReaderPage} from "../components/reader/reader_page";
import { ChatMessage, ChatAttachment } from '../types';
import {ChatService, RealChatService} from '../../services/llm/chat_service';

export const EditorPage: React.FC = () => {
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [chatHeight, setChatHeight] = useState(40); // Percentage of total height
	const [isDragging, setIsDragging] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);
	const chatService: ChatService = new RealChatService();
	const containerRef = useRef<HTMLDivElement>(null);
	const dragStartY = useRef<number>(0);
	const dragStartHeight = useRef<number>(0);

	const handleSendMessage = async (message: string, attachments?: ChatAttachment[]) => {
		// Create user message
		console.log("----------------------");
		const userMessage: ChatMessage = {
			id: Math.random().toString(36).substr(2, 9),
			content: message,
			timestamp: new Date(),
			sender: 'user',
			attachments
		};

		setChatMessages(prev => [...prev, userMessage]);
		setIsLoading(true);

		// Create AI message placeholder for streaming
		const aiMessageId = Math.random().toString(36).substr(2, 9);
		const aiMessage: ChatMessage = {
			id: aiMessageId,
			content: '',
			timestamp: new Date(),
			sender: 'assistant'
		};
		setChatMessages(prev => [...prev, aiMessage]);

		try {
			// Use streaming response
			let fullResponse = '';
			for await (const chunk of chatService.sendMessageStream(message, attachments)) {
				fullResponse += chunk;
				
				// Update the AI message with accumulated content
				setChatMessages(prev => prev.map(msg => 
					msg.id === aiMessageId 
						? { ...msg, content: fullResponse }
						: msg
				));
			}
		} catch (error) {
			console.error('Error sending message:', error);
			const errorMessage: ChatMessage = {
				id: Math.random().toString(36).substr(2, 9),
				content: 'Sorry, I encountered an error processing your message. Please try again.',
				timestamp: new Date(),
				sender: 'assistant'
			};
			setChatMessages(prev => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAttachFile = (file: File) => {
		console.log('File attached:', file.name);
		// Handle file attachment logic here
	};

	// Drag handling functions
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		dragStartY.current = e.clientY;
		dragStartHeight.current = chatHeight;
		document.body.style.cursor = 'ns-resize';
		document.body.style.userSelect = 'none';
	}, [chatHeight]);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !containerRef.current) return;
		
		const containerHeight = containerRef.current.offsetHeight;
		const deltaY = dragStartY.current - e.clientY;
		const deltaPercentage = (deltaY / containerHeight) * 100;
		const newHeight = Math.max(5, Math.min(80, dragStartHeight.current + deltaPercentage));
		
		setChatHeight(newHeight);
		
		// Check if should minimize
		if (newHeight < 8) {
			setIsMinimized(true);
		} else {
			setIsMinimized(false);
		}
	}, [isDragging]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}, []);

	// Add event listeners for drag
	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Handle click on minimized bar to expand
	const handleMinimizedClick = () => {
		setIsMinimized(false);
		setChatHeight(40); // Reset to default height
	};

	return (
		<div 
			ref={containerRef}
			style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100vh', // full height
            width: '100%',
            overflow: 'hidden' // Prevent main container from scrolling
          }}
		>
			{/* Left panel - PDF Reader with Chat */}
			<div style={{ 
				flex: 1, 
				borderRight: '1px solid #ccc',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden' // Prevent left panel from scrolling
			}}>
				{/* PDF Reader */}
				<div style={{ 
					height: `${100 - chatHeight}%`,
					minHeight: '200px',
					overflow: 'auto' // Enable independent scrolling for PDF reader
				}}>
					<ReaderPage />
				</div>
				
				{/* Drag Handle */}
				{!isMinimized && (
					<div
						onMouseDown={handleMouseDown}
						style={{
							height: '4px',
							backgroundColor: isDragging ? '#007bff' : '#e0e0e0',
							cursor: 'ns-resize',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transition: 'background-color 0.2s ease',
							position: 'relative'
						}}
					>
						<div style={{
							width: '40px',
							height: '2px',
							backgroundColor: isDragging ? '#fff' : '#999',
							borderRadius: '1px',
							transition: 'background-color 0.2s ease'
						}} />
					</div>
				)}

				{/* Chat Window or Minimized Bar */}
				{isMinimized ? (
					<div
						onClick={handleMinimizedClick}
						style={{
							height: '32px',
							backgroundColor: '#f8f9fa',
							borderTop: '1px solid #e0e0e0',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							transition: 'background-color 0.2s ease',
							fontSize: '12px',
							color: '#666',
							fontWeight: '500'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = '#e9ecef';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = '#f8f9fa';
						}}
					>
						💬 Chat ({chatMessages.length} messages) - Click to expand
					</div>
				) : (
					<div style={{ 
						height: `${chatHeight}%`, 
						minHeight: '200px',
						overflow: 'auto' // Enable independent scrolling for chat
					}}>
						<ChatWindow
							messages={chatMessages}
							onSendMessage={handleSendMessage}
							onAttachFile={handleAttachFile}
							isLoading={isLoading}
						/>
					</div>
				)}
			</div>
	
			{/* Right panel - Note Taker */}
			<div style={{ 
				flex: 1,
				overflow: 'auto' // Enable independent scrolling for note taker
			}}>
			  <NoteTaker />
			</div>
		</div>
  );
};

export default EditorPage;