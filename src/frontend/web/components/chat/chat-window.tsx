import React, { useRef, useEffect } from 'react';
import { ChatWindowProps, ChatAttachment } from '../../types.ts';
import ChatMessageComponent from './chat-message.tsx';
import ChatInput from './chat-input.tsx';

/**
 * Primary chat surface that orchestrates message history, loading cues, and user input.
 * Maintains scroll position at the latest message, shields the business layer from
 * empty submissions, and forwards attachments through the provided callbacks.
 *
 * @component
 * @param messages Ordered collection of chat entries to render in the transcript area.
 * @param onSendMessage Invoked when the user submits a message or attachments that should reach the LLM layer.
 * @param onAttachFile Invoked when the user selects a file to include with a prompt.
 * @param isLoading Signals that the assistant is composing a response so the typing indicator can be displayed.
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onAttachFile,
  isLoading = false
}) => {
  // Acts as a scroll anchor so the transcript always lands on the latest message.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smoothly scroll to the sentinel element when new content appears.
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll whenever the message list changes to keep the newest exchange visible.
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prevent whitespace-only submissions while still allowing pure attachments to flow through.
  const handleSendMessage = (message: string, attachments?: ChatAttachment[]) => {
    if (message.trim() || (attachments && attachments.length > 0)) {
      onSendMessage(message, attachments);
    }
  };

  // Forward attached files without additional processing so the caller decides how to persist them.
  const handleAttachFile = (file: File) => {
    onAttachFile(file);
  };
  
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '16px'
            }}>
              🤖
            </div>
            <div style={{
              color: '#6b7280',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              How can I help you today?
            </div>
            <div style={{
              color: '#9ca3af',
              fontSize: '14px',
              maxWidth: '300px',
              lineHeight: '1.5'
            }}>
              Ask me anything about your PDF or attach files for analysis
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 0' }}>
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '24px',
                padding: '0 20px'
              }}>
                <div style={{
                  backgroundColor: '#f7f7f8',
                  color: '#374151',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  maxWidth: '85%'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '3px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'typing 1.4s infinite ease-in-out'
                    }}></div>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'typing 1.4s infinite ease-in-out 0.2s'
                    }}></div>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'typing 1.4s infinite ease-in-out 0.4s'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div style={{
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#ffffff'
      }}>
        <ChatInput
          onSendMessage={handleSendMessage}
          onAttachFile={handleAttachFile}
          disabled={isLoading}
          placeholder="Message AI Assistant..."
        />
      </div>

      {/* CSS for typing animation */}
      <style>{`
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;
