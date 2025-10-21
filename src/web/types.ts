export type OutputStyle = 'preserve' | 'plain';
export type PageMode = 'all' | 'custom';
export type AppState = 'idle' | 'ready' | 'uploading' | 'processing' | 'success' | 'error';

export type ResultPayload = {
  markdown: string;
  meta?: {
    pages?: number;
    elapsed_ms?: number;
    acknowledge_url?: string;
    [key: string]: any;
  };
};

// Chat related types
export type ChatMessage = {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
  attachments?: ChatAttachment[];
};

export type ChatAttachment = {
  id: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
};

export type ChatInputProps = {
  onSendMessage: (message: string, attachments?: ChatAttachment[]) => void;
  onAttachFile: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
};

export type ChatWindowProps = {
  messages: ChatMessage[];
  onSendMessage: (message: string, attachments?: ChatAttachment[]) => void;
  onAttachFile: (file: File) => void;
  isLoading?: boolean;
};
