import { useState, useEffect, useRef, useCallback } from "react";
import { LucideSparkles, FileText, MessageSquare, NotebookPen, Camera, ArrowRight } from "lucide-react";

type DemoStep = "idle" | "screenshotting" | "captured" | "loading" | "streaming" | "done" | "inserting";

const AI_RESPONSE = `The table summarizes Q3 performance metrics across three regions:

• North America — Revenue grew 12% YoY to $4.2M, driven by enterprise expansion.
• Europe — Steady at $2.8M with improved margins (+3pp).
• Asia Pacific — Fastest growth at 18% YoY, reaching $1.9M.

Total consolidated revenue: $8.9M, up 14% from Q3 last year.`;

const STEP_DURATIONS: Record<DemoStep, number> = {
	idle: 2000,
	screenshotting: 1500,
	captured: 800,
	loading: 1500,
	streaming: 0, // controlled by interval
	done: 3000,
	inserting: 4000,
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

export default function DemoSection() {
	const [step, setStep] = useState<DemoStep>("idle");
	const [streamedText, setStreamedText] = useState("");
	const [insertedText, setInsertedText] = useState("");
	const [isVisible, setIsVisible] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const streamIndexRef = useRef(0);

	// IntersectionObserver — start/pause when in view
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
				setInsertedText("");
				streamIndexRef.current = 0;
			}
			return next;
		});
	}, []);

	// Timer-driven step transitions
	useEffect(() => {
		if (!isVisible) return;
		if (step === "streaming") return; // streaming handled separately

		const duration = STEP_DURATIONS[step];
		const timer = setTimeout(advanceStep, duration);
		return () => clearTimeout(timer);
	}, [step, isVisible, advanceStep]);

	// Streaming text effect
	useEffect(() => {
		if (step !== "streaming" || !isVisible) return;

		streamIndexRef.current = 0;
		setStreamedText("");

		const interval = setInterval(() => {
			streamIndexRef.current += 1;
			if (streamIndexRef.current >= AI_RESPONSE.length) {
				clearInterval(interval);
				advanceStep();
				return;
			}
			setStreamedText(AI_RESPONSE.slice(0, streamIndexRef.current));
		}, 20);

		return () => clearInterval(interval);
	}, [step, isVisible, advanceStep]);

	// Insert text into notebook
	useEffect(() => {
		if (step === "inserting") {
			setInsertedText(AI_RESPONSE);
		}
	}, [step]);

	const isScreenshotActive = step === "screenshotting" || step === "captured";
	const showUserBubble = step !== "idle" && step !== "screenshotting";
	const showThinking = step === "loading";
	const showAiResponse = step === "streaming" || step === "done" || step === "inserting";
	const showInsertButton = step === "done";

	return (
		<section className="w-full px-4 py-16" ref={containerRef}>
			{/* Demo Badge */}
			<div className="flex justify-center mb-8">
				<div className="bg-secondary border border-border rounded-full px-6 py-2 flex items-center gap-3">
					<LucideSparkles className="size-4" />
					<span className="font-medium text-xs text-foreground">Demo</span>
				</div>
			</div>

			{/* 3-Panel Mockup */}
			<div className="max-w-5/6 mx-auto">
				<div className="grid grid-cols-3 h-[420px]">

					{/* PDF Panel */}
					<div className="bg-panel border rounded-xl ml-2 mr-1 mb-2 shadow  hover:shadow-xl">
						<div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
							<FileText className="size-3.5 text-muted-foreground" />
							<span className="text-[11px] font-medium text-muted-foreground">PDF Viewer</span>
						</div>
						<div className="flex-1 p-4 text-[11px] leading-relaxed text-foreground overflow-hidden">
							<p className="font-bold text-xs mb-2">Quarterly Performance Report</p>
							<p className="text-muted-foreground mb-3">
								The following table outlines key performance indicators across our three primary operating regions for Q3 2025.
							</p>

							{/* Screenshot region */}
							<div
								className={`relative rounded-lg p-2 transition-all duration-300 ${
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
								<table className="w-full text-[10px]">
									<thead>
									<tr className="border-b border-border">
										<th className="text-left py-1 font-semibold">Region</th>
										<th className="text-right py-1 font-semibold">Revenue</th>
										<th className="text-right py-1 font-semibold">YoY</th>
									</tr>
									</thead>
									<tbody className="text-muted-foreground">
									<tr className="border-b border-border/50">
										<td className="py-1">North America</td>
										<td className="text-right">$4.2M</td>
										<td className="text-right text-green-600">+12%</td>
									</tr>
									<tr className="border-b border-border/50">
										<td className="py-1">Europe</td>
										<td className="text-right">$2.8M</td>
										<td className="text-right text-green-600">+8%</td>
									</tr>
									<tr>
										<td className="py-1">Asia Pacific</td>
										<td className="text-right">$1.9M</td>
										<td className="text-right text-green-600">+18%</td>
									</tr>
									</tbody>
								</table>
							</div>

							<p className="text-muted-foreground mt-3">
								Overall trajectory remains positive with consolidated growth exceeding projections.
							</p>
						</div>
					</div>

					{/* AI Chat Panel */}
					<div className="bg-panel border rounded-xl ml-2 mr-1 mb-2 shadow  hover:shadow-xl">
						<div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
							<MessageSquare className="size-3.5 text-muted-foreground" />
							<span className="text-[11px] font-medium text-muted-foreground">AI Chat</span>
						</div>
						<div className="flex-1 p-3 overflow-hidden flex flex-col">
							<div className="flex-1 space-y-3 overflow-hidden">
								{/* User bubble */}
								{showUserBubble && (
									<div className="flex justify-end animate-[demo-fade-in_0.3s_ease-out]">
										<div className="bg-secondary rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
											<p className="text-[10px] text-muted-foreground mb-1.5">Analyze this table:</p>
											<div className="bg-[#006aff]/5 border border-[#006aff]/20 rounded p-1.5 text-[9px] text-muted-foreground">
												📊 Table: Regional Performance Q3
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

								{/* AI response */}
								{showAiResponse && (
									<div className="flex items-start animate-[demo-fade-in_0.3s_ease-out]">
										<div className="bg-secondary rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%]">
											<p className="text-[10px] leading-relaxed text-foreground whitespace-pre-wrap">
												{step === "streaming" ? streamedText : AI_RESPONSE}
												{step === "streaming" && (
													<span className="inline-block w-0.5 h-3 bg-foreground ml-0.5 animate-pulse align-middle" />
												)}
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Insert button */}
							{showInsertButton && (
								<div className="pt-2 flex justify-end animate-[demo-fade-in_0.3s_ease-out]">
									<div className="flex items-center gap-1.5 bg-[#006aff] text-white rounded-lg px-3 py-1.5 text-[10px] font-medium">
										Insert to notebook
										<ArrowRight className="size-3" />
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Notebook Panel */}
					<div className="bg-panel border rounded-xl ml-2 mr-1 mb-2 shadow hover:shadow-xl">
						<div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
							<NotebookPen className="size-3.5 text-muted-foreground" />
							<span className="text-[11px] font-medium text-muted-foreground">Notebook</span>
						</div>
						<div className="flex-1 p-4 text-[11px] leading-relaxed overflow-hidden">
							<p className="font-bold text-xs mb-1.5 text-foreground">Research Notes</p>
							<p className="text-muted-foreground mb-3">
								This document covers the key findings from our quarterly analysis of regional performance data.
							</p>
							<div className="border-t border-border/50 pt-2 mb-2">
								<p className="text-[10px] text-muted-foreground italic">Key takeaways from the data...</p>
							</div>

							{/* Inserted content */}
							{insertedText && (
								<div
									className="rounded-lg p-2 text-[10px] leading-relaxed text-foreground whitespace-pre-wrap transition-all duration-500"
									style={{
										animation: "demo-insert 0.5s ease-out",
										backgroundColor: step === "inserting" ? "rgba(0, 153, 102, 0.08)" : "transparent",
									}}
								>
									{insertedText}
								</div>
							)}
						</div>
					</div>

				</div>
			</div>

			{/* Inline keyframes */}
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
