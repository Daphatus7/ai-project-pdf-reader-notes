/**
 * TypeScript types matching backend Pydantic models
 */

export interface ChatRequest {
  message: string;
  system_message?: string;
}

export interface ChatResponse {
  response: string;
  usage?: Record<string, unknown> | null;
}

export interface StreamChatRequest {
  message: string;
  system_message?: string;
}

// Structured Output Types

export type ContentType = 'explanation' | 'summary' | 'answer' | 'analysis' | 'code' | 'table' | 'list';

export interface CodeBlock {
  language: string;
  code: string;
  explanation?: string;
}

export interface MathExpression {
  latex: string;
  description?: string;
  is_block?: boolean;
}

export interface Section {
  heading: string;
  content: string;
}

/**
 * Structured output from LLM with markdown, LaTeX, and GFM support.
 * Ensures consistent, parseable output format.
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

export interface StructuredChatRequest {
  message: string;
  system_message?: string;
  expected_content_type?: ContentType;
}

export interface StructuredChatResponse {
  structured_output: LLMStructuredOutput;
  usage?: Record<string, unknown> | null;
}

