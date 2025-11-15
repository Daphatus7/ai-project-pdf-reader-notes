import { ChatAttachment } from '@@/frontend/web/types.ts';
import { llmClient } from './client/llm_client.ts';

export interface ChatService {
  /**
   * Send a message to the LLM and get a response
   * @param message The user's message
   * @param attachments Optional file attachments
   * @param context Optional context from PDF or previous messages
   * @returns Promise that resolves to the AI response
   */
  sendMessage(
    message: string, 
    attachments?: ChatAttachment[], 
    context?: string
  ): Promise<string>;

  /**
   * Send a message with streaming response
   * @param message The user's message
   * @param attachments Optional file attachments
   * @param context Optional context from PDF or previous messages
   * @returns AsyncGenerator that yields response chunks
   */
  sendMessageStream(
    message: string, 
    attachments?: ChatAttachment[], 
    context?: string
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Process an image attachment and get a description or analysis
   * @param imageUrl The URL of the image to process
   * @param prompt Optional custom prompt for image analysis
   * @returns Promise that resolves to the image analysis
   */
  analyzeImage(imageUrl: string, prompt?: string): Promise<string>;

  /**
   * Generate a table of contents for the current PDF
   * @param pdfContent The content of the PDF
   * @returns Promise that resolves to a formatted table of contents
   */
  generateTableOfContents(pdfContent: string): Promise<string>;
}

export class RealChatService implements ChatService {
  private client = llmClient;
  
  async sendMessage(message: string, attachments?: ChatAttachment[], context?: string): Promise<string> {
    try {
      // Convert attachments to image URLs
      const images = attachments
        ?.filter(attachment => attachment.type === 'image')
        ?.map(attachment => attachment.url) || [];
      console.log("sending message ", message);
      const response = await this.client.sendMessage(message, images, context);
      return response.content;
    } catch (error) {
      console.error('Error in RealChatService.sendMessage:', error);
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  async *sendMessageStream(
    message: string, 
    attachments?: ChatAttachment[], 
    context?: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Convert attachments to image URLs
      const images = attachments
        ?.filter(attachment => attachment.type === 'image')
        ?.map(attachment => attachment.url) || [];
      
      for await (const chunk of this.client.sendMessageStream(message, images, context)) {
        if ('error' in chunk) {
          throw new Error(chunk.error);
        }
        yield chunk.content;
      }
    } catch (error) {
      console.error('Error in RealChatService.sendMessageStream:', error);
      throw new Error(`Failed to send message: ${error}`);
    }
  }
  
  async analyzeImage(imageUrl: string, prompt?: string): Promise<string> {
    try {
      const response = await this.client.analyzeImage(imageUrl, prompt);
      return response.content;
    } catch (error) {
      console.error('Error in RealChatService.analyzeImage:', error);
      throw new Error(`Failed to analyze image: ${error}`);
    }
  }
  
  async generateTableOfContents(pdfContent: string): Promise<string> {
    try {
      const response = await this.client.generateTableOfContents(pdfContent);
      return response.content;
    } catch (error) {
      console.error('Error in RealChatService.generateTableOfContents:', error);
      throw new Error(`Failed to generate table of contents: ${error}`);
    }
  }
}
