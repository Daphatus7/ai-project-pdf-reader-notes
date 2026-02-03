/**
 * Common types used across API requests
 */

/**
 * Text content for API requests
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content for API requests
 * Base64-encoded image (no data URI prefix)
 */
export interface ImageContent {
  type: 'image';
  data: string; // Base64-encoded image (no data URI prefix)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

/**
 * Union type for all input content types
 */
export type ChatContent = TextContent | ImageContent;

// ============ Output Content Types (API Response) ============

/**
 * Text content in AI response
 */
export interface TextOutput {
  type: 'text';
  text: string;
}

/**
 * Image content in AI response (e.g., generated images)
 */
export interface ImageOutput {
  type: 'image';
  data: string; // Base64-encoded image (no data URI prefix)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
}

