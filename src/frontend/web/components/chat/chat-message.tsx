import React, {useEffect, useState} from 'react';
import {ChatMessage} from '../../types.ts';

interface ChatMessageProps {
    /** Single chat datum to render inside a styled bubble. */
    message: ChatMessage;
}

/**
 * Presentational component for a single transcript entry.
 * Aligns bubbles based on the author, decorates AI responses with avatar metadata,
 * and renders attachments as inline previews while preserving timestamps.
 */
export const ChatMessageComponent: React.FC<ChatMessageProps> = ({message}) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        console.log('Clicked on messagex:', message.content);
    }
    const [hovered, setHovered] = useState(false);
    // Mirror the bubble position and styling depending on who authored the message.
    const isUser = message.sender === 'user';
    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '24px',
            padding: '0 20px'
        }}>
            <div style={{
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
            }}>
                {/* Sender info for AI messages */}
                {!isUser && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                        padding: '0 4px'
                    }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#10a37f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'white',
                            fontWeight: '600'
                        }}>
                            AI
                        </div>
                        <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '500'
                        }}>
				  AI Assistant
				</span>
                    </div>
                )}

                {/* Message bubble */}
                <div
                    onClick={handleClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        backgroundColor: hovered
                            ? isUser
                                ? '#0e8f70'
                                : '#eaeaea'
                            : isUser
                                ? '#10a37f'
                                : '#f7f7f8',
                        color: isUser ? 'white' : '#374151',
                        padding: '12px 16px',
                        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        border: isUser ? 'none' : '1px solid #e5e7eb',
                        wordWrap: 'break-word',
                        lineHeight: '1.5',
                        fontSize: '14px',
                        position: 'relative',
                        boxShadow: isUser ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}>
                    {/* Message content */}
                    <div style={{
                        marginBottom: message.attachments && message.attachments.length > 0 ? '12px' : '0',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {message.content}
                    </div>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {/* Render each attachment with an icon, label, and optional preview. */}
                            {message.attachments.map(attachment => (
                                <div key={attachment.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : '#ffffff',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    border: isUser ? 'none' : '1px solid #e5e7eb'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: attachment.type === 'image' ? '8px' : '0'
                                    }}>
						<span style={{marginRight: '6px', fontSize: '14px'}}>
						  {attachment.type === 'image' ? '🖼️' : '📎'}
						</span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: isUser ? 'rgba(255,255,255,0.9)' : '#6b7280',
                                            fontWeight: '500'
                                        }}>
						  {attachment.name}
						</span>
                                    </div>
                                    {attachment.type === 'image' && (
                                        <img
                                            src={attachment.url}
                                            alt={attachment.name}
                                            style={{
                                                maxWidth: '200px',
                                                maxHeight: '200px',
                                                borderRadius: '6px',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    marginTop: '4px',
                    padding: '0 4px'
                }}>
                    {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
            </div>
        </div>
    );
};

export default ChatMessageComponent;
