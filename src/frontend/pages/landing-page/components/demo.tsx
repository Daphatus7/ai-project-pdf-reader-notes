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

const AI_RESPONSE = `The table summarizes Q3 performance metrics across three regions:

• North America — Revenue grew 12% YoY to $4.2M, driven by enterprise expansion.
• Europe — Steady at $2.8M with improved margins (+3pp).
• Asia Pacific — Fastest growth at 18% YoY, reaching $1.9M.

Total consolidated revenue: $8.9M, up 14% from Q3 last year.`;

const STEP_DURATIONS: Record<DemoStep, number> = {
	idle: 600,
	screenshotting: 500,
	captured: 400,   // brief pause: screenshot captured
	loading: 600,
	streaming: 0,
	done: 1200,      // brief pause: full AI response visible
	inserting: 1000, // brief pause: content inserted into notes
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
	

	return (
		<section id="solutions">
		</section>
	);
}
