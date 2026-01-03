/**
 * LLM API types matching backend Pydantic models
 */

import type { InputContent } from './common';

/**
 * Content types for structured LLM responses
 */
export type ContentType = 'explanation' | 'summary' | 'answer' | 'analysis' | 'code' | 'table' | 'list';

/**
 * Code block in structured output
 */
export interface CodeBlock {
  language: string;
  code: string;
  explanation?: string;
}

/**
 * LaTeX math expression in structured output
 */
export interface MathExpression {
  latex: string;
  description?: string;
  is_block?: boolean;
}

/**
 * Section in structured output
 */
export interface Section {
  heading: string;
  content: string;
}

/**
 * Basic chat request
 */
export interface ChatRequest {
  contents: InputContent[];
  system_message?: string;
}

/**
 * Basic chat response
 */
export interface ChatResponse {
  response: string;
  usage?: Record<string, unknown> | null;
}

/**
 * Streaming chat request
 */
export interface StreamChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}

/**
 * Structured output from LLM with markdown, LaTeX, and GFM support
 * Ensures consistent, parseable output format
 */
export interface LLMStructuredOutput {
  content: string;
  content_type: ContentType;
  title?: string;
  sections?: Section[];
  key_points?: string[];
  code_blocks?: CodeBlock[];
  math_expressions?: MathExpression[];
  references?: string[];
  suggested_followups?: string[];
}

/**
 * Structured chat request
 */
export interface StructuredChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}

/**
 * Structured chat response
 */
export interface StructuredChatResponse {
  structured_output: LLMStructuredOutput;
  usage?: Record<string, unknown> | null;
}

/**
 * Structured image chat request (alias for StructuredChatRequest)
 */
export interface StructuredImageChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}
