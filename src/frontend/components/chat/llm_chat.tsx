import {useState, useRef, useEffect} from "react";
import {Button} from "../ui/button.tsx";
import {Input} from "../ui/input.tsx";
import {Avatar, AvatarFallback} from "../ui/avatar.tsx";
import {
	Image as ImageIcon,
	User,
	FileText,
	ChevronUp
} from "lucide-react";
import {cn} from "../ui/utils.ts";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip.tsx";
import type {Note} from "../../App.tsx";
import {llmService, ApiError, type LLMStructuredOutput} from "../../api";
import {MarkdownRenderer} from "../renderer/markdown-renderer.tsx";
import type {ContentInsertion, SectionType} from "../../features/types/content-insertion.ts";
import {transformContentForInsertion} from "../../features/utils/content-transformer.ts";
import {ResizablePanel} from "../ui/resizable.tsx";
import type {ImperativePanelHandle} from "react-resizable-panels";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	hasImage?: boolean;
	structuredOutput?: LLMStructuredOutput;
}

interface BaseContextItem {
	id: string;
	name?: string;
}

export interface ImageContextItem extends BaseContextItem {
	type: "image";
	userPrompt: string; 
	imageUrls: string[]; // Image URLs
}


interface AssistantMessageProps {
	message: Message;
	onSectionClick?: (sectionType: string, content: string) => void;
}

/**
 * Assistant message component.
 *
 * @param message - The message to display
 * @param onSectionClick - Callback when a section is clicked in MarkdownRenderer
 */
function AssistantMessage({message, onSectionClick}: AssistantMessageProps) {
	return (
		<div className="flex gap-3 justify-start">
			<div className="rounded-lg px-4 py-2 max-w-[100%]  relative">
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
	defaultSize?: number,
	minSize?: number,
	collapsedSize?: number,
	note: Note,
	externalContextItems?: BaseContextItem[],
	/**
	 * Callback when content should be inserted into the note editor.
	 *
	 * @param insertion - Content insertion payload with formatted markdown
	 */

	onContentInsert?: (insertion: ContentInsertion) => void,
	imageContextItem?: ImageContextItem
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
export function Llm_chat({
							note,
							defaultSize = 50,
							minSize = 15,
							collapsedSize = 1,
							onContentInsert,
							imageContextItem
						}: LLMChatProps) {
	const editorPanelRef = useRef<ImperativePanelHandle>(null);
	const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
	const [messages, setMessages] = useState<Message[]>(mockMessages);
	const [input, setInput] = useState("");

	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const VERTICAL_COLLAPSE_THRESHOLD = 18;

	const handleEditorResize = (size: number) => {
		if (size < VERTICAL_COLLAPSE_THRESHOLD && !isEditorCollapsed) {
			editorPanelRef.current?.collapse();
		}
	};

	// Merge external context items (like screenshots) with manual context items

	type LLMStreamEvent = { type: string; content?: string; data?: unknown; message?: string };

	const buildSystemMessage = () => {
		return defaultInstruction() + buildMessageFormat() + buildMessageContext();
	};

	const buildMessageFormat = () => {
		return `
			The format of the output if there is a table or math formulae
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
	}

	const buildMessageContext = () => {
		return "";
	}

	const defaultInstruction = () => {
		return "your a helpful assistant "
	}

	const imageInstruction = () => {
		return "explain the image";
	}
	
	const consumeStructuredStream = async (
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
	};

	const sendImagesToLLM =
		async (imageContext: ImageContextItem) => {

			const userMessage: Message = {
				id: Date.now().toString(),
				role: "user",
				content: imageContext.userPrompt,
			};

			setMessages(prev => [...prev, userMessage]);
			setIsLoading(true);

			const aiMessageId = (Date.now() + 1).toString();
			const aiMessage: Message = {
				id: aiMessageId,
				role: "assistant",
				content: "Thinking..."
			};
			setMessages(prev => [...prev, aiMessage]);

			try {
				const systemMessage = imageInstruction();
				await consumeStructuredStream(
					llmService.sendMessageWithImages(imageContext.userPrompt,
						imageContext.imageUrls,
						systemMessage) as
						AsyncGenerator<LLMStreamEvent, void, unknown>,
					aiMessageId
				);
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
		};
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
	const handleSectionClick = (sectionType: string, content: string, htmlContent: string = '') => {
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
	};

	// Auto-scroll to bottom when messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages]);

	// Auto-analyze a pending screenshot/image request (triggered by App)
	useEffect(() => {
		//插入image 到llm 直接发起对话
		if (imageContextItem) {
			sendImagesToLLM(imageContextItem,)
		}
	}, [imageContextItem]);

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


	// 简单的AI 信息
	const handleSend = async () => {
		if (!input.trim()) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input
		};

		setMessages(prev => [...prev, userMessage]);
		const messageText = input;
		setInput("");

		const aiMessageId = (Date.now() + 1).toString();
		const aiMessage: Message = {
			id: aiMessageId,
			role: "assistant",
			content: "Thinking..."
		};
		setMessages(prev => [...prev, aiMessage]);

		try {
			const systemMessage = buildSystemMessage();
			await consumeStructuredStream(
				llmService.sendMessage(messageText, systemMessage) as AsyncGenerator<LLMStreamEvent, void, unknown>,
				aiMessageId
			);
		} catch (error) {
			console.error('Error sending message:', error);
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

	// Ai 配合图片
	
	return (
		<ResizablePanel
			ref={editorPanelRef}
			defaultSize={defaultSize}
			minSize={minSize}
			collapsible
			collapsedSize={collapsedSize}
			onCollapse={() => setIsEditorCollapsed(true)}
			onExpand={() => setIsEditorCollapsed(false)}
			onResize={handleEditorResize}
		>
			<div className="h-full w-full relative min-h-0">
				{isEditorCollapsed && (
					<div
						className="absolute inset-0 z-10 group border-t bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
						onClick={() => editorPanelRef.current?.resize(defaultSize)}
					>
						<div
							className="opacity-40 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
							<ChevronUp className="w-4 h-4 text-muted-foreground"/>
							<span className="text-xs text-muted-foreground">AI Chat</span>
						</div>
					</div>
				)}
				<div className={isEditorCollapsed ? "hidden" : "h-full min-h-0"}>
					<div className="h-full min-h-0 flex flex-col bg-background">
						{/* Chat Header */}
						<div className="border-b px-4 py-3 bg-muted/30">
							<div className="flex items-center justify-between gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div/>
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
						<div className="scroll-y flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3"
							 data-testid="chat-messages">
							{messages.map((message) => (
								message.role === "assistant" ? (
									<AssistantMessage
										key={message.id}
										message={message}
										onSectionClick={handleSectionClick}
									/>
								) : (
									<div key={message.id} className="flex gap-3 justify-end">
										<div
											className="rounded-lg px-4 py-2 max-w-[85%] bg-primary text-primary-foreground">
											<p className="text-sm whitespace-pre-wrap">{message.content}</p>
										</div>

										<Avatar className="h-8 w-8 shrink-0">
											<AvatarFallback>
												<User className="w-4 h-4"/>
											</AvatarFallback>
										</Avatar>
									</div>
								)
							))}
							<div ref={messagesEndRef}/>
						</div>

						{/* Input Area */}
						<div className="border-t p-4 bg-muted/20">
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									// onClick={handleSendImage}
									disabled={isLoading}
								>
									<ImageIcon className="w-4 h-4"/>
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
										{/* 当前Context*/}
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className="relative"
														style={{zIndex: 100}}
													>
														<div
															className={cn(
																"h-7 w-7 rounded-md border-2 border-background flex items-center justify-center",
																"bg-primary/20 border-primary/40"
															)}
														>
															<FileText className="w-3.5 h-3.5 text-primary"/>
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
										
									</div>
								</div>
							</div>

							<p className="text-xs text-muted-foreground mt-2">
								AI has context of current note: <span className="text-primary">{note.title}</span>. Add
								images or text for additional context.
							</p>
						</div>
					</div>
				</div>
			</div>
		</ResizablePanel>
	);
}
