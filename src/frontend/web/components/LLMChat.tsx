import { useState, useRef, useEffect } from "react";
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
}

function DraggableMessage({ message }: DraggableMessageProps) {
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
				ref={preview}
				className={cn(
					"rounded-lg px-4 py-2 max-w-[85%] bg-muted relative"
				)}
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								ref={drag}
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

				<MarkdownRenderer content={message.content} className="text-sm" />
			</div>
		</div>
	);
}

interface LLMChatProps {
	note: Note;
	externalContextItems?: ContextItem[];
}

const mockMessages: Message[] = [
	{
		id: "1",
		role: "assistant",
		content: "Hello! I'm your AI assistant. I can help you understand your documents, expand your notes, and answer questions about the current note. How can I help you today?"
	}
];

export function LLMChat({ note, externalContextItems = [] }: LLMChatProps) {
	const [messages, setMessages] = useState<Message[]>(mockMessages);
	const [input, setInput] = useState("");
	const [contextItems, setContextItems] = useState<ContextItem[]>([]);
	const [isAddContextOpen, setIsAddContextOpen] = useState(false);
	const [newContextText, setNewContextText] = useState("");
	const [newContextName, setNewContextName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Merge external context items (like screenshots) with manual context items
	const allContextItems = [...contextItems, ...externalContextItems];

	// Auto-scroll to bottom when messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Reset messages when note changes
	useEffect(() => {
		setMessages([
			{
				id: Date.now().toString(),
				role: "assistant",
				content: "# Bayes' Theorem (Bayes' Formula)\n" +
					"\n" +
					"Bayes' theorem relates the probability of a hypothesis to the evidence provided by data. It’s fundamental in probabilistic reasoning and is widely used in machine learning (e.g., Naive Bayes, Bayesian inference).\n" +
					"\n" +
					"## The formula\n" +
					"\n" +
					"- Discrete form (with hypotheses H1, H2, ..., Hn and data D):\n" +
					"  $$P(H_i \\mid D) = \\frac{P(D \\mid H_i)\\,P(H_i)}{\\displaystyle \\sum_{j=1}^n P(D \\mid H_j)\\,P(H_j)}$$\n" +
					"\n" +
					"- Alternatively, using a single hypothesis H:\n" +
					"  $$P(H \\mid D) = \\frac{P(D \\mid H)\\,P(H)}{P(D)}$$\n" +
					"\n" +
					"Where:\n" +
					"- \\(P(H)\\) is the prior probability of the hypothesis before seeing data.\n" +
					"- \\(P(D \\mid H)\\) is the likelihood: the probability of the data given the hypothesis.\n" +
					"- \\(P(D)\\) is the evidence (the total probability of the data under all hypotheses):  \n" +
					"  \\(P(D) = \\sum_j P(D \\mid H_j) P(H_j)\\) (discrete case) or\n" +
					"  \\(P(D) = \\int P(D \\mid \\theta) P(\\theta) \\, d\\theta\\) (continuous case).\n" +
					"\n" +
					"- The posterior \\(P(H \\mid D)\\) is the updated belief after observing data.\n" +
					"\n" +
					"In the continuous (densities) form:\n" +
					"$$\n" +
					"f(\\theta \\mid D) = \\frac{f(D \\mid \\theta)\\,f(\\theta)}{f(D)}, \\quad\n" +
					"f(D) = \\int f(D \\mid \\theta)\\,f(\\theta)\\,d\\theta\n" +
					"$$\n" +
					"\n" +
					"## Intuition\n" +
					"\n" +
					"- Start with a prior belief about which hypothesis is true.\n" +
					"- Observe data and compute how likely that data is under each hypothesis (the likelihood).\n" +
					"- Update beliefs by weighing priors by their likelihoods, then normalize by the total probability of the data (the evidence).\n" +
					"\n" +
					"## Worked example: medical testing\n" +
					"\n" +
					"Suppose:\n" +
					"- Disease prevalence \\(P(D) = 0.01\\) (1%)\n" +
					"- Test sensitivity: \\(P(\\text{Pos} \\mid D) = 0.99\\)\n" +
					"- Test false positive rate: \\(P(\\text{Pos} \\mid \\neg D) = 0.05\\)\n" +
					"\n" +
					"Question: If the test result is positive, what's \\(P(D \\mid \\text{Pos})\\)?\n" +
					"\n" +
					"1) Compute the evidence:\n" +
					"- \\(P(\\text{Pos}) = P(\\text{Pos} \\mid D)P(D) + P(\\text{Pos} \\mid \\neg D)P(\\neg D)\\)\n" +
					"- \\(P(\\text{Pos}) = 0.99 \\times 0.01 + 0.05 \\times 0.99 = 0.0099 + 0.0495 = 0.0594\\)\n" +
					"\n" +
					"2) Compute the posterior:\n" +
					"- \\(P(D \\mid \\text{Pos}) = \\dfrac{P(\\text{Pos} \\mid D) P(D)}{P(\\text{Pos})} = \\dfrac{0.0099}{0.0594} \\approx 0.167\\)\n" +
					"\n" +
					"So, given a positive test, the probability you actually have the disease is about 16.7%.\n" +
					"\n" +
					"## Quick derivations (idea)\n" +
					"\n" +
					"- Start from the joint distribution symmetry: \\(P(H, D) = P(D \\mid H) P(H) = P(H \\mid D) P(D)\\).\n" +
					"- Solve for the posterior: \\(P(H \\mid D) = \\frac{P(D \\mid H) P(H)}{P(D)}\\).\n" +
					"- Use the law of total probability to compute \\(P(D)\\) (the evidence).\n" +
					"\n" +
					"## Why this matters in ML\n" +
					"\n" +
					"- Bayesian inference treats probabilities as degrees of belief and updates them with data.\n" +
					"- Naive Bayes classifiers use Bayes’ rule with the assumption of feature independence to compute posteriors efficiently.\n" +
					"- Bayesian methods provide posterior distributions over parameters, enabling uncertainty quantification.\n" +
					"- The posterior predictive distribution for a new observation is:\n" +
					"  $$P(D_{\\text{new}} \\mid \\text{data}) = \\sum_{\\text{hypotheses}} P(D_{\\text{new}} \\mid H) P(H \\mid \\text{data})$$\n" +
					"  or, in the continuous case, an integral over parameters.\n" +
					"\n" +
					"## Minimal Python example\n" +
					"\n" +
					"```python\n" +
					"def bayes_posterior(prior, likelihood):\n" +
					"    \"\"\"\n" +
					"    prior: list or array of P(H_i)\n" +
					"    likelihood: list or array of P(D | H_i)\n" +
					"    returns: posterior probabilities P(H_i | D) and the evidence P(D)\n" +
					"    \"\"\"\n" +
					"    import numpy as np\n" +
					"    prior = np.asarray(prior, dtype=float)\n" +
					"    likelihood = np.asarray(likelihood, dtype=float)\n" +
					"    unnorm = prior * likelihood\n" +
					"    evidence = unnorm.sum()\n" +
					"    posterior = unnorm / evidence\n" +
					"    return posterior, evidence\n" +
					"\n" +
					"# Example: two hypotheses\n" +
					"prior = [0.6, 0.4]\n" +
					"likelihood = [0.7, 0.2]  # P(D | H1) and P(D | H2)\n" +
					"post, ev = bayes_posterior(prior, likelihood)\n" +
					"print(\"Posterior:\", post)\n" +
					"print(\"Evidence:\", ev)\n" +
					"```\n" +
					"\n" +
					"If you’d like, I can tailor this explanation to your notes or add more ML-specific examples (e.g., Naive Bayes, conjugate priors)."
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
			// Build system message with note context
			const systemMessage = `
			You are a helpful assistant helping the user with their note: "${note.title}". 
			The user is working on a document and may ask questions about it or request help expanding their notes.
			${allContextItems.length > 0 ? 'The user has provided additional context items (images or text) that may be relevant to their question.' : ''}
			
			Always respond with well-structured markdown content including:
			- Headers for organization
			- Code blocks with language specification when showing code
			- LaTeX math expressions using $...$ for inline and $$...$$ for block equations
			- GFM tables when presenting tabular data
			- Bullet points and numbered lists for clarity`;

			// Use structured streaming API
			let accumulatedContent = "";
			let currentStructuredOutput: LLMStructuredOutput | undefined = undefined;
			
			for await (const event of llmService.chatStructuredStream({
				message: messageText,
				system_message: systemMessage
			})) {
				if (event.type === 'text' && event.content) {
					// Accumulate text chunks
					accumulatedContent += event.content;
					
					// Update message with accumulated content
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
					// Update structured output
					currentStructuredOutput = event.data as LLMStructuredOutput;
					
					// Update message with structured output
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
					// Streaming complete
					break;
				}
			}
			console.log(accumulatedContent);
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
						<DraggableMessage key={message.id} message={message} />
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
