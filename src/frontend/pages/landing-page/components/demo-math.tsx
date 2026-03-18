import { useState, useEffect, useRef, useCallback } from "react";
import {
	LucideSparkles,
	MessageSquare,
	ArrowLeft,
	ChevronUp,
	ChevronDown,
	ChevronRight,
	ZoomIn,
	ZoomOut,
	RotateCcw,
	Maximize2,
	Plus,
	Camera,
	Undo2,
	Redo2,
	Bold,
	Italic,
	Strikethrough,
	Code,
	Underline,
	Link,
	AlignLeft,
	List,
	ListOrdered,
	Image,
	Save,
	LayoutGrid,
} from "lucide-react";

type DemoStep = "idle" | "screenshotting" | "captured" | "loading" | "streaming" | "done" | "inserting";

const STREAMING_TEXT = `Analyzing the activation functions in your document...

Found 5 functions: Sigmoid, Tanh, ReLU, Leaky ReLU, and Softmax.

Extracting formulas, output ranges, and use cases for each. Building a structured comparison table...`;

const STEP_DURATIONS: Record<DemoStep, number> = {
	idle: 2000,
	screenshotting: 1500,
	captured: 800,
	loading: 1500,
	streaming: 0,
	done: 3500,
	inserting: 4500,
};

const NEXT_STEP: Record<DemoStep, DemoStep> = {
	idle: "screenshotting",
	screenshotting: "captured",
	captured: "loading",
	loading: "streaming",
	streaming: "done",
	done: "inserting",
	inserting: "idle",
};

const TABLE_ROWS = [
	{ name: "Sigmoid", formula: "1 / (1 + e⁻ˣ)", range: "(0, 1)", use: "Binary output" },
	{ name: "Tanh", formula: "(eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)", range: "(−1, 1)", use: "Hidden layers" },
	{ name: "ReLU", formula: "max(0, x)", range: "[0, ∞)", use: "Deep networks" },
	{ name: "Leaky ReLU", formula: "max(0.01x, x)", range: "(−∞, ∞)", use: "Avoid dead ReLU" },
	{ name: "Softmax", formula: "eˣⁱ / Σ eˣʲ", range: "(0, 1)", use: "Multi-class output" },
];

function ActivationTable({ tiny = false }: { tiny?: boolean }) {
	const cell = tiny
		? "py-0.5 px-1 border border-border text-[8px]"
		: "py-1 px-1.5 border border-border text-[9px]";
	return (
		<table className="w-full border-collapse">
			<thead>
				<tr className="bg-secondary/50">
					<th className={`${cell} text-left font-semibold`}>Function</th>
					<th className={`${cell} text-left font-semibold`}>Formula</th>
					<th className={`${cell} text-left font-semibold`}>Range</th>
					<th className={`${cell} text-left font-semibold`}>Use Case</th>
				</tr>
			</thead>
			<tbody>
				{TABLE_ROWS.map((row, i) => (
					<tr key={i} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
						<td className={`${cell} font-medium`}>{row.name}</td>
						<td className={`${cell} font-mono`}>{row.formula}</td>
						<td className={`${cell}`}>{row.range}</td>
						<td className={`${cell} text-muted-foreground`}>{row.use}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export default function DemoMathSection() {
	const [step, setStep] = useState<DemoStep>("idle");
	const [streamedText, setStreamedText] = useState("");
	const [tableInserted, setTableInserted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const streamIndexRef = useRef(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsVisible(entry.isIntersecting),
			{ threshold: 0.3 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const advanceStep = useCallback(() => {
		setStep((prev) => {
			const next = NEXT_STEP[prev];
			if (next === "idle") {
				setStreamedText("");
				setTableInserted(false);
				streamIndexRef.current = 0;
			}
			return next;
		});
	}, []);

	useEffect(() => {
		if (!isVisible) return;
		if (step === "streaming") return;
		const timer = setTimeout(advanceStep, STEP_DURATIONS[step]);
		return () => clearTimeout(timer);
	}, [step, isVisible, advanceStep]);

	useEffect(() => {
		if (step !== "streaming" || !isVisible) return;
		streamIndexRef.current = 0;
		setStreamedText("");
		const interval = setInterval(() => {
			streamIndexRef.current += 1;
			if (streamIndexRef.current >= STREAMING_TEXT.length) {
				clearInterval(interval);
				advanceStep();
				return;
			}
			setStreamedText(STREAMING_TEXT.slice(0, streamIndexRef.current));
		}, 22);
		return () => clearInterval(interval);
	}, [step, isVisible, advanceStep]);

	useEffect(() => {
		if (step === "inserting") setTableInserted(true);
	}, [step]);

	const isScreenshotActive = step === "screenshotting" || step === "captured";
	const showUserBubble = step !== "idle" && step !== "screenshotting";
	const showThinking = step === "loading";
	const showStreaming = step === "streaming";
	const showTable = step === "done" || step === "inserting";
	const showInsertButton = step === "done";
	const askAiActive = step === "screenshotting" || step === "captured";

	return (
		<section className="w-full px-4 py-16" ref={containerRef}>
			{/* Badge + heading */}
			<div className="flex flex-col items-center mb-8 gap-4">
				<div className="bg-secondary border border-border rounded-full px-6 py-2 flex items-center gap-3">
					<LucideSparkles className="size-4" />
					<span className="font-medium text-xs text-foreground">Math &amp; Tables</span>
				</div>
				<h2 className="font-bold text-3xl md:text-4xl text-center text-foreground">
					From equations to structured tables
				</h2>
				<p className="text-muted-foreground text-center max-w-2xl">
					Screenshot any math-heavy section — AI extracts formulas and organizes them into a clean, insertable table.
				</p>
			</div>

			{/* 3-Panel Mockup */}
			<div className="max-w-5/6 mx-auto">
				<div className="grid grid-cols-3 h-[600px]">

					{/* PDF Panel */}
					<div className="bg-panel border rounded-xl ml-2 mr-1 mb-2 shadow hover:shadow-xl flex flex-col overflow-hidden">
						{/* Toolbar */}
						<div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-secondary/50 shrink-0">
							<button className="p-1 hover:bg-border/50 rounded">
								<ArrowLeft className="size-3 text-muted-foreground" />
							</button>
							<div className="w-px h-3.5 bg-border mx-0.5" />
							<div className="flex items-center gap-0.5">
								<button className="p-0.5 hover:bg-border/50 rounded">
									<ChevronUp className="size-2.5 text-muted-foreground" />
								</button>
								<span className="text-[10px] font-medium text-foreground min-w-[28px] text-center">3 / 8</span>
								<button className="p-0.5 hover:bg-border/50 rounded">
									<ChevronDown className="size-2.5 text-muted-foreground" />
								</button>
							</div>
							<div className="w-px h-3.5 bg-border mx-0.5" />
							<div className="flex items-center gap-0.5">
								<button className="p-1 hover:bg-border/50 rounded">
									<ZoomOut className="size-3 text-muted-foreground" />
								</button>
								<span className="text-[10px] text-foreground border border-border rounded px-1">80%</span>
								<button className="p-1 hover:bg-border/50 rounded">
									<ZoomIn className="size-3 text-muted-foreground" />
								</button>
							</div>
							<div className="w-px h-3.5 bg-border mx-0.5" />
							<button className="p-1 hover:bg-border/50 rounded">
								<RotateCcw className="size-3 text-muted-foreground" />
							</button>
							<button className="p-1 hover:bg-border/50 rounded">
								<Maximize2 className="size-3 text-muted-foreground" />
							</button>
							<div className="flex-1" />
							<button
								className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
									askAiActive ? "bg-violet-400 text-white scale-105" : "bg-violet-600 text-white"
								}`}
							>
								<LucideSparkles className="size-2.5" />
								Ask AI
							</button>
						</div>

						{/* PDF Content */}
						<div className="flex-1 px-3 py-2 text-[9px] leading-relaxed overflow-hidden text-foreground">
							<p className="font-bold text-[10px] mb-0.5">Deep Learning — Chapter 4</p>
							<p className="font-semibold mb-2 text-muted-foreground">4.2 Activation Functions</p>
							<p className="text-muted-foreground mb-2 text-[8.5px]">
								An activation function f(x) introduces non-linearity, enabling neural networks to learn complex mappings beyond linear transformations.
							</p>

							{/* Screenshot region — equations */}
							<div
								className={`relative rounded-lg p-2 mb-2 transition-all duration-300 ${
									isScreenshotActive
										? "border-2 border-[#006aff] bg-[#006aff]/5"
										: "border-2 border-dashed border-border"
								}`}
								style={
									step === "screenshotting"
										? { animation: "demo-pulse 0.75s ease-in-out infinite" }
										: undefined
								}
							>
								{isScreenshotActive && (
									<div className="absolute -top-2.5 -right-2.5 bg-[#006aff] text-white rounded-full p-0.5">
										<Camera className="size-3" />
									</div>
								)}
								<div className="space-y-1.5">
									<p className="text-[8px] font-semibold text-muted-foreground mb-1">Common activation functions:</p>
									<div className="font-mono text-[8px] space-y-1.5 text-foreground">
										<div className="flex items-baseline gap-2">
											<span className="text-muted-foreground w-[52px] shrink-0">Sigmoid:</span>
											<span>σ(x) = 1 / (1 + e<sup className="text-[6px]">−x</sup>)</span>
										</div>
										<div className="flex items-baseline gap-2">
											<span className="text-muted-foreground w-[52px] shrink-0">Tanh:</span>
											<span>(e<sup className="text-[6px]">x</sup> − e<sup className="text-[6px]">−x</sup>) / (e<sup className="text-[6px]">x</sup> + e<sup className="text-[6px]">−x</sup>)</span>
										</div>
										<div className="flex items-baseline gap-2">
											<span className="text-muted-foreground w-[52px] shrink-0">ReLU:</span>
											<span>f(x) = max(0, x)</span>
										</div>
										<div className="flex items-baseline gap-2">
											<span className="text-muted-foreground w-[52px] shrink-0">Leaky ReLU:</span>
											<span>f(x) = max(αx, x),  α = 0.01</span>
										</div>
										<div className="flex items-baseline gap-2">
											<span className="text-muted-foreground w-[52px] shrink-0">Softmax:</span>
											<span>σ(x<sub className="text-[6px]">i</sub>) = e<sup className="text-[6px]">xᵢ</sup> / Σ e<sup className="text-[6px]">xʲ</sup></span>
										</div>
									</div>
								</div>
							</div>

							<p className="text-muted-foreground text-[8.5px]">
								The choice of activation significantly impacts gradient flow and model expressiveness.
							</p>
						</div>
					</div>

					{/* AI Chat Panel */}
					<div className="bg-panel border rounded-xl mx-1 mb-2 shadow hover:shadow-xl flex flex-col overflow-hidden">
						{/* Chat Header */}
						<div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50 shrink-0">
							<MessageSquare className="size-3.5 text-muted-foreground" />
							<span className="text-[11px] font-medium text-foreground flex-1">Chat</span>
							<button className="p-1 hover:bg-border/50 rounded">
								<Plus className="size-3 text-muted-foreground" />
							</button>
							<button className="p-1 hover:bg-border/50 rounded">
								<LayoutGrid className="size-3 text-muted-foreground" />
							</button>
						</div>

						{/* Chat Messages */}
						<div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
							<div className="flex-1 space-y-3 overflow-hidden">
								{/* User bubble */}
								{showUserBubble && (
									<div className="flex justify-end animate-[demo-fade-in_0.3s_ease-out]">
										<div className="bg-secondary rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
											<p className="text-[10px] text-muted-foreground mb-1.5">Make a comparison table:</p>
											<div className="bg-[#006aff]/5 border border-[#006aff]/20 rounded p-1.5 text-[9px] text-muted-foreground">
												📐 Activation Functions — Ch. 4.2
											</div>
										</div>
									</div>
								)}

								{/* Thinking dots */}
								{showThinking && (
									<div className="flex items-start animate-[demo-fade-in_0.3s_ease-out]">
										<div className="bg-secondary rounded-xl rounded-tl-sm px-3 py-2.5">
											<div className="flex gap-1">
												<span className="thinking-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0s" }} />
												<span className="thinking-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.15s" }} />
												<span className="thinking-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.3s" }} />
											</div>
										</div>
									</div>
								)}

								{/* Streaming response */}
								{showStreaming && (
									<div className="flex items-start animate-[demo-fade-in_0.3s_ease-out]">
										<div className="rounded-xl rounded-tl-sm px-1 py-2 max-w-[95%]">
											<p className="text-[10px] leading-relaxed text-foreground whitespace-pre-wrap">
												{streamedText}
												<span className="inline-block w-0.5 h-3 bg-foreground ml-0.5 animate-pulse align-middle" />
											</p>
										</div>
									</div>
								)}

								{/* Table revealed after streaming */}
								{showTable && (
									<div className="flex items-start animate-[demo-fade-in_0.4s_ease-out]">
										<div className="rounded-xl rounded-tl-sm px-1 py-2 w-full">
											<p className="text-[10px] text-foreground mb-1.5">Here's the comparison table:</p>
											<ActivationTable />
										</div>
									</div>
								)}
							</div>

							{/* Insert to note button */}
							{showInsertButton && (
								<div className="pt-2 flex justify-end animate-[demo-fade-in_0.3s_ease-out]">
									<div className="flex items-center gap-1.5 bg-secondary border border-border text-foreground rounded-lg px-3 py-1.5 text-[10px] font-medium">
										Insert to note
										<ChevronRight className="size-3" />
									</div>
								</div>
							)}
						</div>

						{/* Chat Input */}
						<div className="px-3 pb-3 shrink-0">
							<div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-panel">
								<span className="text-[10px] text-muted-foreground flex-1">Type your message...</span>
								<button className="bg-secondary text-foreground rounded-lg px-2.5 py-1 text-[10px] font-medium border border-border">
									Send
								</button>
							</div>
						</div>
					</div>

					{/* Notebook Panel */}
					<div className="bg-panel border rounded-xl ml-1 mr-2 mb-2 shadow hover:shadow-xl flex flex-col overflow-hidden">
						{/* Notes Header */}
						<div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-secondary/50 shrink-0">
							<div className="flex items-center gap-0.5">
								<button className="text-[10px] font-medium px-2 py-0.5 rounded text-muted-foreground hover:bg-border/50">
									Markdown
								</button>
								<button className="text-[10px] font-medium px-2 py-0.5 rounded bg-panel border border-border text-foreground">
								Editor
								</button>
							</div>
							<div className="flex-1" />
							<button className="p-1 hover:bg-border/50 rounded">
								<Save className="size-3 text-muted-foreground" />
							</button>
							<button className="p-1 hover:bg-border/50 rounded">
								<Maximize2 className="size-3 text-muted-foreground" />
							</button>
						</div>

						{/* Formatting Toolbar */}
						<div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-secondary/30 shrink-0">
							<button className="p-0.5 hover:bg-border/50 rounded"><Undo2 className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><Redo2 className="size-2.5 text-muted-foreground" /></button>
							<div className="w-px h-3 bg-border mx-0.5" />
							<button className="flex items-center gap-0.5 px-1 py-0.5 hover:bg-border/50 rounded text-[9px] font-semibold text-muted-foreground">
								H<ChevronDown className="size-2" />
							</button>
							<div className="w-px h-3 bg-border mx-0.5" />
							<button className="p-0.5 hover:bg-border/50 rounded"><List className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><ListOrdered className="size-2.5 text-muted-foreground" /></button>
							<div className="w-px h-3 bg-border mx-0.5" />
							<button className="p-0.5 hover:bg-border/50 rounded"><Image className="size-2.5 text-muted-foreground" /></button>
							<div className="w-px h-3 bg-border mx-0.5" />
							<button className="p-0.5 hover:bg-border/50 rounded"><Bold className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><Italic className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><Strikethrough className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><Code className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><Underline className="size-2.5 text-muted-foreground" /></button>
							<div className="w-px h-3 bg-border mx-0.5" />
							<button className="p-0.5 hover:bg-border/50 rounded"><Link className="size-2.5 text-muted-foreground" /></button>
							<button className="p-0.5 hover:bg-border/50 rounded"><AlignLeft className="size-2.5 text-muted-foreground" /></button>
						</div>

						{/* Notes Content */}
						<div className="flex-1 p-4 overflow-hidden">
							<p className="font-bold text-sm mb-0.5 text-foreground">Deep Learning Notes</p>
							<p className="font-medium text-xs mb-2 text-muted-foreground">Ch. 4 — Activation Functions</p>
							<ul className="text-[9px] text-foreground space-y-1 mb-2 list-none">
								<li className="flex gap-1"><span className="text-muted-foreground">•</span>Non-linearity is essential for learning complex functions</li>
								<li className="flex gap-1"><span className="text-muted-foreground">•</span>Sigmoid &amp; Tanh saturate — prone to vanishing gradients</li>
								<li className="flex gap-1"><span className="text-muted-foreground">•</span>ReLU is fast but can "die" when inputs are always negative</li>
							</ul>

							<div className="border-t border-border/50 pt-2 mb-2">
								<p className="text-[9px] text-muted-foreground italic">
									{tableInserted ? "Activation function reference:" : "Activation function reference table will appear here..."}
								</p>
							</div>

							{/* Inserted table */}
							{tableInserted && (
								<div
									className="rounded-lg p-1 transition-all duration-500"
									style={{
										animation: "demo-insert 0.5s ease-out",
										backgroundColor: step === "inserting" ? "rgba(0, 153, 102, 0.08)" : "transparent",
									}}
								>
									<ActivationTable tiny />
								</div>
							)}
						</div>
					</div>

				</div>
			</div>

			<style>{`
        @keyframes demo-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 106, 255, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(0, 106, 255, 0); }
        }
        @keyframes demo-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes demo-insert {
          from { opacity: 0; background-color: rgba(0, 153, 102, 0.15); }
          to { opacity: 1; background-color: rgba(0, 153, 102, 0.08); }
        }
      `}</style>
		</section>
	);
}
