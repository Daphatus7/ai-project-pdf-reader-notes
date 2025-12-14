import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Avatar, AvatarFallback } from "./ui/avatar.tsx";
import {
	Send,
	Image as ImageIcon,
	Sparkles,
	User,
	Plus,
	X,
	FileText,
	ImagePlus,
	GripVertical
} from "lucide-react";
import { cn } from "./ui/utils.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx";
import { Textarea } from "./ui/textarea.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip.tsx";
import type { Note } from "../../App.tsx";
import { useDrag } from "react-dnd";
import { llmService, ApiError, type LLMStructuredOutput } from "../../api";
import { MarkdownRenderer } from "./MarkdownRenderer.tsx";
import type { ContentInsertion, SectionType } from "../types/content-insertion.ts";
import { transformContentForInsertion } from "../utils/content-transformer.ts";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	hasImage?: boolean;
	structuredOutput?: LLMStructuredOutput;
}

interface ContextItem {
	id: string;
	type: "image" | "text";
	content: string; // For images: URL, For text: the text content
	name?: string; // Optional name/title
	preview?: string; // For text: first few characters
}

export const DRAG_TYPE = "AI_MESSAGE";

interface DraggableMessageProps {
	message: Message;
	onSectionClick?: (sectionType: string, content: string) => void;
}

/**
 * Draggable message component that displays assistant messages.
 * 
 * Supports both drag-and-drop and click-to-insert functionality.
 * 
 * @param message - The message to display
 * @param onSectionClick - Callback when a section is clicked in MarkdownRenderer
 */
function DraggableMessage({ message, onSectionClick }: DraggableMessageProps) {
	const [{ isDragging }, drag, preview] = useDrag(() => ({
		type: DRAG_TYPE,
		item: { content: message.content },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	return (
		<div
			className={cn(
				"flex gap-3 justify-start group",
				isDragging && "opacity-50"
			)}
		>
			<Avatar className="h-8 w-8 shrink-0">
				<AvatarFallback className="bg-primary text-primary-foreground">
					<Sparkles className="w-4 h-4" />
				</AvatarFallback>
			</Avatar>

			<div
				ref={(node) => {
					preview(node);
				}}
				className={cn(
					"rounded-lg px-4 py-2 max-w-[85%] bg-muted relative"
				)}
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								ref={(node) => {
									drag(node);
								}}
								className={cn(
									"absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
									"bg-muted border border-border rounded p-1 hover:bg-primary/10 hover:border-primary"
								)}
							>
								<GripVertical className="w-4 h-4 text-muted-foreground" />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p className="text-xs">Drag to insert into markdown editor</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<MarkdownRenderer 
					content={message.content} 
					className="text-sm"
					onSectionClick={onSectionClick}
				/>
			</div>
		</div>
	);
}

interface LLMChatProps {
	note: Note;
	externalContextItems?: ContextItem[];
	pendingImageAnalysis?: {
		id: string;
		imageDataUrl: string;
		name: string;
	} | null;
	onPendingImageAnalysisHandled?: (id: string) => void;
	/**
	 * Callback when content should be inserted into the note editor.
	 * 
	 * @param insertion - Content insertion payload with formatted markdown
	 */
	onContentInsert?: (insertion: ContentInsertion) => void;
}

const mockMessages: Message[] = [
	{
		id: "1",
		role: "assistant",
		content: "Hello! I'm your AI assistant. I can help you understand your documents, expand your notes, and answer questions about the current note. How can I help you today?"
	}
];

/**
 * LLM Chat component for interacting with AI assistant.
 * 
 * Features:
 * - Chat interface with message history
 * - Context items (images and text) for enhanced prompts
 * - Click-to-insert: Click any section in assistant messages to insert into notes
 * - Drag-and-drop: Drag entire messages to insert into notes
 * 
 * @param note - Current note being edited
 * @param externalContextItems - External context items (e.g., screenshots)
 * @param onContentInsert - Callback when content should be inserted into notes
 */
export function LLMChat({
	note,
	externalContextItems = [],
	pendingImageAnalysis = null,
	onPendingImageAnalysisHandled,
	onContentInsert
}: LLMChatProps) {
	const [messages, setMessages] = useState<Message[]>(mockMessages);
	const [input, setInput] = useState("");
	const [contextItems, setContextItems] = useState<ContextItem[]>([]);
	const [isAddContextOpen, setIsAddContextOpen] = useState(false);
	const [newContextText, setNewContextText] = useState("");
	const [newContextName, setNewContextName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const lastHandledPendingImageIdRef = useRef<string | null>(null);

	// Merge external context items (like screenshots) with manual context items
	const allContextItems = [...contextItems, ...externalContextItems];

	type LLMStreamEvent = { type: string; content?: string; data?: unknown; message?: string };

	const buildSystemMessage = useCallback(() => {
		return `You are a helpful assistant helping the user with their note: "${note.title}". 
			The user is working on a document and may ask questions about it or request help expanding their notes.
			${allContextItems.length > 0 ? 'The user has provided additional context items (images or text) that may be relevant to their question.' : ''}
			
			MATH FORMATTING (CRITICAL - follow EXACTLY):
			
			1. ALWAYS wrap ALL math in $...$ delimiters:
			   - Variables: $P(t)$, $c_n$, $\\omega$
			   - Equations: $P(t) = A\\cos(\\omega t)$
			   - Subscripts: $c_{-1}$, $e^{j\\omega t}$
			
			2. Use LaTeX commands, NEVER Unicode:
			   - WRONG: ∑, ∞, ω, π (Unicode)
			   - CORRECT: $\\sum$, $\\infty$, $\\omega$, $\\pi$
			
			3. Display math: $$ on separate lines, NOT inside bullets
			
			WRONG: P(t) = ∑ c_n e^{jnωt}, c_{-n} = c_n^*
			CORRECT: $P(t) = \\sum c_n e^{jn\\omega t}$, $c_{-n} = c_n^*$
			
			Use # ## ### for headers, \`\`\`lang for code, - for bullets.`;
	}, [note.title, allContextItems.length]);

	const consumeStructuredStream = useCallback(async (
		stream: AsyncGenerator<LLMStreamEvent, void, unknown>,
		aiMessageId: string
	) => {
		let accumulatedContent = "";
		let currentStructuredOutput: LLMStructuredOutput | undefined = undefined;

		for await (const event of stream) {
			if (event.type === 'text' && event.content) {
				accumulatedContent += event.content;

				setMessages(prev => prev.map(msg =>
					msg.id === aiMessageId
						? {
							...msg,
							content: accumulatedContent,
							structuredOutput: currentStructuredOutput
						}
						: msg
				));
			} else if (event.type === 'structured' && event.data) {
				currentStructuredOutput = event.data as LLMStructuredOutput;

				setMessages(prev => prev.map(msg =>
					msg.id === aiMessageId
						? {
							...msg,
							content: currentStructuredOutput?.content || accumulatedContent,
							structuredOutput: currentStructuredOutput
						}
						: msg
				));
			} else if (event.type === 'error') {
				throw new Error(event.message || 'Streaming error occurred');
			} else if (event.type === 'done') {
				break;
			}
		}
	}, []);

	const sendImagesToLLM = 
		useCallback(async (params: { messageText: string; imageUrls: string[]; hasImage?: boolean }) => {
		if (isLoading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: params.messageText,
			hasImage: params.hasImage ?? true,
		};

		setMessages(prev => [...prev, userMessage]);
		setIsLoading(true);

		// Create AI message placeholder while loading
		const aiMessageId = (Date.now() + 1).toString();
		const aiMessage: Message = {
			id: aiMessageId,
			role: "assistant",
			content: "Thinking..."
		};
		setMessages(prev => [...prev, aiMessage]);

		try {
			const systemMessage = buildSystemMessage();
			await consumeStructuredStream(llmService.chatStructuredStreamImage({
				message: params.messageText,
				system_message: systemMessage,
				image_urls: params.imageUrls
			}) as AsyncGenerator<LLMStreamEvent, void, unknown>, aiMessageId);
		} catch (error) {
			console.error('Error sending image message:', error);

			setMessages(prev => prev.map(msg =>
				msg.id === aiMessageId
					? {
						...msg,
						content: error instanceof ApiError
							? `**Error:** ${error.message}`
							: '**Error:** Sorry, I encountered an error processing your image message. Please try again.'
					}
					: msg
			));
		} finally {
			setIsLoading(false);
		}
	}, [buildSystemMessage, consumeStructuredStream, isLoading]);
	/**
	 * Handles section clicks from MarkdownRenderer.
	 * 
	 * Transforms the raw content into properly formatted markdown
	 * and notifies the parent component to insert it into the note editor.
	 * 
	 * @param sectionType - Type of section that was clicked
	 * @param content - Raw content extracted from the section
	 * @param htmlContent - HTML content extracted from the section
	 */
	const handleSectionClick = 
		useCallback((sectionType: string, content: string, htmlContent: string = '') => {
		if (!onContentInsert) {
			console.warn('[LLMChat] onContentInsert callback not provided');
			return;
		}

		// Transform content based on section type
		const transformedContent = transformContentForInsertion({
			sectionType: sectionType as SectionType,
			rawContent: content,
			preserveFormatting: true,
		});

		// Create insertion payload with HTML content
		const insertion: ContentInsertion = {
			content: transformedContent,
			htmlContent: htmlContent,
			sectionType: sectionType as SectionType,
			source: 'markdown-renderer',
			metadata: {
				preserveFormatting: true,
			},
		};

		// Notify parent
		onContentInsert(insertion);
	}, [onContentInsert]);

	// Auto-scroll to bottom when messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Auto-analyze a pending screenshot/image request (triggered by App)
	useEffect(() => {
		if (!pendingImageAnalysis) return;
		if (isLoading) return;
		if (pendingImageAnalysis.id === lastHandledPendingImageIdRef.current) return;

		lastHandledPendingImageIdRef.current = pendingImageAnalysis.id;

		// Clear the pending event early to prevent duplicate sends on re-render.
		onPendingImageAnalysisHandled?.(pendingImageAnalysis.id);

		const messageText = `Explain the attached screenshot "${pendingImageAnalysis.name}" and extract the relevant content for note-taking. Use clear headings, bullet points, and LaTeX for math.`;
		void sendImagesToLLM({
			messageText,
			imageUrls: [pendingImageAnalysis.imageDataUrl],
			hasImage: true,
		});
	}, [pendingImageAnalysis, isLoading, onPendingImageAnalysisHandled, sendImagesToLLM]);

	// Reset messages when note changes
	useEffect(() => {
		setMessages([
			{
				id: Date.now().toString(),
				role: "assistant",
				content: `
# Perceptron Activation Functions — Comparison

| Activation | Formula | Output range | Differentiability | Pros | Cons | Typical usage |
|---|---|---|---|---|---|---|
| Step (Heaviside) | $f(x) = \\begin{cases} 1, & x \\ge 0 \\\\ 0, & x < 0 \\end{cases}$ | $\\{0,1\\}$ | Not differentiable at $x=0$ (derivative 0 for $x \\neq 0$) | Simple threshold behavior | Not differentiable; not suitable for gradient-based learning | Classic perceptron; binary decision boundaries |
| Sign | $f(x) = \\begin{cases} 1, & x \\ge 0 \\\\ -1, & x < 0 \\end{cases}$ | $\\{-1,1\\}$ | Not differentiable at $x=0$ | Clear class decision | Not differentiable; rarely used in modern nets | Historical perceptron variants |
| Sigmoid (Logistic) | $f(x) = \\sigma(x) = \\dfrac{1}{1+e^{-x}}$ | $(0,1)$ | Yes; $f'(x) = f(x)(1-f(x))$ | Smooth; probabilistic interpretation | Vanishing gradient for large $|x|$ | Binary classification; some hidden layers (older nets) |
| Tanh | $f(x) = \\tanh(x)$ | $(-1,1)$ | Yes; $f'(x) = 1 - \\tanh^2(x)$ | Zero-centered; often faster training | Vanishing gradient for large $|x|$ | Hidden layers; faster convergence than sigmoid in some cases |
| ReLU | $f(x) = \\max(0,x)$ | $[0,\\infty)$ | Not differentiable at $x=0$ | Simple; sparse activations; no vanishing gradient for $x>0$ | Dead neurons for negative inputs | Deep neural networks |
| Leaky ReLU | $f(x) = \\begin{cases} x, & x \\ge 0 \\\\ \\alpha x, & x < 0 \\end{cases}$, $\\alpha \\in (0,1)$ | $(-\\infty,\\infty)$ | Not differentiable at $x=0$ | Mitigates dead neurons | Slightly more compute; still piecewise linear | Alternatives to ReLU |
| Softplus | $f(x) = \\log(1+e^{x})$ | $(0,\\infty)$ | Yes; $f'(x) = \\dfrac{1}{1+e^{-x}}$ | Smooth approximation to ReLU | More expensive to compute | Hidden layers requiring smoothness |
| ELU | $f(x) = \\begin{cases} x, & x > 0 \\\\ \\alpha (e^{x}-1), & x \\le 0 \\end{cases}$, $\\alpha>0$ | $(-\\alpha,\\infty)$ | Yes | Smooth for negative inputs; improves robustness | Slightly heavier compute | Deep nets needing negative activations |
| Swish | $f(x) = x \\cdot \\sigma(x)$ | All real numbers | Yes; $f'(x) = \\sigma(x) + x \\sigma(x)(1-\\sigma(x))$ | Smooth; non-monotone; can improve performance | More compute than ReLU variants | Modern networks (e.g., some experiments show gains) |
| GELU | $f(x) = x \\cdot \\Phi(x)$, $\\Phi(x) = \\dfrac{1}{2}\\left[1+\\operatorname{erf}\\left(\\dfrac{x}{\\sqrt{2}}\\right)\\right]$ | All real numbers | Yes; $f'(x) = \\Phi(x) + x \\phi(x)$, $\\phi(x) = \\dfrac{1}{\\sqrt{2\\pi}} e^{-x^{2}/2}$ | Smooth with probabilistic interpretation | Computation heavier | State-of-the-art variants in some transformers |

If you’d like, I can tailor this to a specific framework (e.g., PyTorch or TensorFlow) or add columns for gradient behavior in practice.
- 1. a
- 2. b
- 3. c
`
			}
		]);
	}, [note.id]);

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input
		};

		setMessages(prev => [...prev, userMessage]);
		const messageText = input;
		setInput("");
		setIsLoading(true);

		// Create AI message placeholder while loading
		const aiMessageId = (Date.now() + 1).toString();
		const aiMessage: Message = {
			id: aiMessageId,
			role: "assistant",
			content: "Thinking..."
		};
		setMessages(prev => [...prev, aiMessage]);

		try {
			const systemMessage = buildSystemMessage();
			await consumeStructuredStream(llmService.chatStructuredStream({
				message: messageText,
				system_message: systemMessage
			}) as AsyncGenerator<LLMStreamEvent, void, unknown>, aiMessageId);
		} catch (error) {
			console.error('Error sending message:', error);

			// Update the placeholder message with error
			setMessages(prev => prev.map(msg =>
				msg.id === aiMessageId
					? {
						...msg,
						content: error instanceof ApiError
							? `**Error:** ${error.message}`
							: '**Error:** Sorry, I encountered an error processing your message. Please try again.'
					}
					: msg
			));
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Sends an image-based prompt to the LLM using the existing structured streaming image endpoint.
	 *
	 * Uses any context images currently attached (manual uploads + external screenshots).
	 * If there is no text input, a default instruction prompt is used.
	 */
	const handleSendImage = async () => {
		if (isLoading) return;

		const imageUrls = allContextItems
			.filter((item) => item.type === "image")
			.map((item) => item.content)
			.filter(Boolean);

		if (imageUrls.length === 0) {
			setIsAddContextOpen(true);
			return;
		}

		const messageText = input.trim().length > 0
			? input
			: "Analyze the attached image(s) and extract the relevant content for note-taking. Use clear headings, bullet points, and LaTeX for math.";
		setInput("");
		await sendImagesToLLM({ messageText, imageUrls, hasImage: true });
	};

	const handleAddTextContext = () => {
		if (!newContextText.trim()) return;

		const newContext: ContextItem = {
			id: Date.now().toString(),
			type: "text",
			content: newContextText,
			name: newContextName || "Text Context",
			preview: newContextText.slice(0, 50)
		};

		setContextItems([...contextItems, newContext]);
		setNewContextText("");
		setNewContextName("");
		setIsAddContextOpen(false);
	};

	const handleAddImageContext = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const newContext: ContextItem = {
					id: Date.now().toString() + Math.random(),
					type: "image",
					content: event.target?.result as string,
					name: file.name
				};
				setContextItems(prev => [...prev, newContext]);
			};
			reader.readAsDataURL(file);
		});

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const removeContext = (id: string) => {
		setContextItems(contextItems.filter(item => item.id !== id));
	};

	return (
		<div className="h-full min-h-0 flex flex-col bg-background">
			{/* Chat Header */}
			<div className="border-b px-4 py-3 bg-muted/30">
				<div className="flex items-center justify-between gap-2">
					{/* <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-sm">AI Assistant</h2>
          </div> */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>

							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-xs">
								<p className="text-xs mb-1">Current Document Context</p>
								<p className="text-xs">{note.title}</p>
								<p className="text-xs text-muted-foreground mt-1">
									The AI has access to the full content of this note
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			{/* Messages */}
			<div className="scroll-y flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3" data-testid="chat-messages">
				{messages.map((message) => (
					message.role === "assistant" ? (
						<DraggableMessage 
							key={message.id} 
							message={message}
							onSectionClick={handleSectionClick}
						/>
					) : (
						<div key={message.id} className="flex gap-3 justify-end">
							<div className="rounded-lg px-4 py-2 max-w-[85%] bg-primary text-primary-foreground">
								<p className="text-sm whitespace-pre-wrap">{message.content}</p>
							</div>

							<Avatar className="h-8 w-8 shrink-0">
								<AvatarFallback>
									<User className="w-4 h-4" />
								</AvatarFallback>
							</Avatar>
						</div>
					)
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="border-t p-4 bg-muted/20">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="icon"
						className="shrink-0"
						onClick={handleSendImage}
						disabled={isLoading}
					>
						<ImageIcon className="w-4 h-4" />
					</Button>

					<div className="flex-1 relative">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSend()}
							placeholder={`Ask about "${note.title}"...`}
							className="pr-32"
						/>

						{/* Context items cascade in input */}
						<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
							{/* Current document context - always visible */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div
											className="relative"
											style={{ zIndex: 100 }}
										>
											<div
												className={cn(
													"h-7 w-7 rounded-md border-2 border-background flex items-center justify-center",
													"bg-primary/20 border-primary/40"
												)}
											>
												<FileText className="w-3.5 h-3.5 text-primary" />
											</div>
										</div>
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-xs">
										<div>
											<p className="text-xs mb-1 font-medium">{note.title}</p>
											<p className="text-xs text-muted-foreground">
												Current document (always in context)
											</p>
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							{allContextItems.length > 0 && (
								<div className="flex items-center -space-x-2">
									{allContextItems.slice(0, 3).map((item, index) => (
										<TooltipProvider key={item.id}>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className="relative group"
														style={{ zIndex: allContextItems.length - index }}
													>
														<div
															className={cn(
																"h-7 w-7 rounded-md border-2 border-background flex items-center justify-center cursor-pointer transition-all",
																"bg-muted hover:border-primary hover:shadow-md hover:scale-110"
															)}
														>
															{item.type === "image" ? (
																<div className="w-full h-full rounded-sm overflow-hidden">
																	<img
																		src={item.content}
																		alt={item.name || "Context"}
																		className="w-full h-full object-cover"
																	/>
																</div>
															) : (
																<FileText className="w-3.5 h-3.5 text-primary" />
															)}
														</div>

														{/* Delete button on hover - only for manual context items */}
														{contextItems.find(ci => ci.id === item.id) && (
															<button
																onClick={() => removeContext(item.id)}
																className={cn(
																	"absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground",
																	"flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
																	"hover:bg-destructive/90 shadow-sm"
																)}
															>
																<X className="w-2.5 h-2.5" />
															</button>
														)}
													</div>
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-xs">
													{item.type === "image" ? (
														<div>
															<p className="text-xs mb-1">{item.name}</p>
															<img
																src={item.content}
																alt={item.name || "Context"}
																className="max-h-32 rounded"
															/>
														</div>
													) : (
														<div>
															<p className="text-xs mb-1">{item.name}</p>
															<p className="text-xs text-muted-foreground max-w-xs">
																{item.content.length > 100
																	? item.content.slice(0, 100) + "..."
																	: item.content}
															</p>
														</div>
													)}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									))}
									{allContextItems.length > 3 && (
										<div className="h-7 w-7 rounded-md border-2 border-background bg-muted flex items-center justify-center text-xs">
											+{allContextItems.length - 3}
										</div>
									)}
								</div>
							)}

							{/* Add Context Button */}
							<Dialog open={isAddContextOpen} onOpenChange={setIsAddContextOpen}>
								<DialogTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 ml-1"
									>
										<Plus className="w-4 h-4" />
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Add Context</DialogTitle>
									</DialogHeader>

									<div className="space-y-4 pt-4">
										{/* Add Image */}
										<div>
											<input
												ref={fileInputRef}
												type="file"
												accept="image/*"
												multiple
												className="hidden"
												onChange={handleAddImageContext}
											/>
											<Button
												variant="outline"
												className="w-full"
												onClick={() => fileInputRef.current?.click()}
											>
												<ImagePlus className="w-4 h-4 mr-2" />
												Upload Images
											</Button>
										</div>

										<div className="relative">
											<div className="absolute inset-0 flex items-center">
												<span className="w-full border-t" />
											</div>
											<div className="relative flex justify-center text-xs uppercase">
												<span className="bg-background px-2 text-muted-foreground">Or</span>
											</div>
										</div>

										{/* Add Text */}
										<div className="space-y-3">
											<div>
												<label className="text-sm mb-1.5 block">Context Name</label>
												<Input
													placeholder="e.g., Important Notes, Background Info"
													value={newContextName}
													onChange={(e) => setNewContextName(e.target.value)}
												/>
											</div>

											<div>
												<label className="text-sm mb-1.5 block">Text Content</label>
												<Textarea
													placeholder="Enter text context that will help the AI understand your question..."
													value={newContextText}
													onChange={(e) => setNewContextText(e.target.value)}
													rows={6}
												/>
											</div>

											<Button
												className="w-full"
												onClick={handleAddTextContext}
												disabled={!newContextText.trim()}
											>
												<FileText className="w-4 h-4 mr-2" />
												Add Text Context
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</div>

					<Button onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0">
						<Send className="w-4 h-4" />
					</Button>
				</div>

				<p className="text-xs text-muted-foreground mt-2">
					AI has context of current note: <span className="text-primary">{note.title}</span>. Add images or text for additional context.
				</p>
			</div>
		</div>
	);
}
