import React, { useState, useRef } from 'react';
import { ChatInputProps, ChatAttachment } from '../../types';

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onAttachFile,
  disabled = false,
  placeholder = 'Ask anything'
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const attachment: ChatAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size
        };
        setAttachments(prev => [...prev, attachment]);
        onAttachFile(file);
      });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      padding: '16px'
    }}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        }}>
          {attachments.map(attachment => (
            <div key={attachment.id} style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px solid #e5e7eb'
            }}>
              <span style={{ marginRight: '6px', fontSize: '14px' }}>
                {attachment.type === 'image' ? '🖼️' : '📎'}
              </span>
              <span style={{ 
                marginRight: '6px', 
                maxWidth: '120px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#374151'
              }}>
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280',
                  padding: '0',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '8px',
        transition: 'border-color 0.2s ease'
      }}>
        {/* Message input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            style={{
              width: '100%',
              minHeight: '24px',
              maxHeight: '120px',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              color: '#374151'
            }}
          />
        </div>

        {/* Action buttons container */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          padding: '4px'
        }}>
          {/* Attach file button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              color: '#6b7280',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            📎
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: disabled || (!message.trim() && attachments.length === 0) ? '#e5e7eb' : '#10a37f',
              cursor: disabled || (!message.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              color: 'white',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!disabled && (message.trim() || attachments.length > 0)) {
                e.currentTarget.style.backgroundColor = '#0d8f6b';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && (message.trim() || attachments.length > 0)) {
                e.currentTarget.style.backgroundColor = '#10a37f';
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </form>
    </div>
  );
};

export default ChatInput;
