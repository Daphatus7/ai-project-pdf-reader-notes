import { useState, useRef } from "react";
import { Header } from "./components/Header";
import { NoteSidebar } from "./components/NoteSidebar";
import { PDFReader } from "./components/PDFReader";
import { LLMChat } from "./components/LLMChat";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./components/ui/resizable";
import {
	PanelLeftOpen,
	PanelRightOpen,
	ChevronDown,
	ChevronUp
} from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import NoteTaker from "./components/note-taker.tsx";
import type {JSONContent} from "@tiptap/react";

export interface Note {
	id: string;
	title: string;
	preview: string;
	format: 'pm_json';
	updatedAt: string;
	content: JSONContent;
}

const initialNotes: Note[] = [
	{
		id: "1",
		title: "Machine Learning Fundamentals",
		preview: "Core ideas of supervised and unsupervised learning.",
		updatedAt: "2 hours ago",
		format: "pm_json",
		content: {
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 1 },
					content: [{ type: "text", text: "Machine Learning Fundamentals" }],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Supervised learning uses labeled data, while unsupervised learning finds structure within unlabeled datasets. Typical algorithms include linear regression, decision trees, k-means, and PCA." },
					],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Mathematically, training minimizes a loss function such as " },
						{ type: "text", marks: [{ type: "code" }], text: "L = (y - ŷ)^2" },
						{ type: "text", text: " to update model parameters." },
					],
				},
			],
		},
	},
	{
		id: "2",
		title: "Neural Network Basics",
		preview: "Understanding perceptrons and gradient descent.",
		updatedAt: "6 hours ago",
		format: "pm_json",
		content: {
			type: "doc",
			content: [
				{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Neural Network Basics" }] },
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "A neural network approximates complex functions by stacking layers of neurons. Each neuron applies an activation function such as ReLU or sigmoid." },
					],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Weights are optimized by gradient descent, where " },
						{ type: "text", marks: [{ type: "code" }], text: "w := w - η * ∂L/∂w" },
						{ type: "text", text: " adjusts parameters in the direction of lower loss." },
					],
				},
			],
		},
	},
	{
		id: "3",
		title: "Data Preprocessing",
		preview: "Normalization and feature scaling essentials.",
		updatedAt: "1 day ago",
		format: "pm_json",
		content: {
			type: "doc",
			content: [
				{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Data Preprocessing" }] },
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Raw data requires cleaning and normalization. Missing values can be imputed, categorical features encoded, and continuous variables standardized." },
					],
				},
				{
					type: "bulletList",
					content: [
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Min–Max scaling maps features to [0,1]." }] }] },
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Z-score normalization sets mean = 0, std = 1." }] }] },
					],
				},
			],
		},
	},
	{
		id: "4",
		title: "Evaluation Metrics",
		preview: "Accuracy, precision, recall, and F1-score explained.",
		updatedAt: "2 days ago",
		format: "pm_json",
		content: {
			type: "doc",
			content: [
				{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Evaluation Metrics" }] },
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Model performance can’t be judged by accuracy alone. For imbalanced datasets, precision and recall are key:" },
					],
				},
				{
					type: "orderedList",
					content: [
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Precision = TP / (TP + FP)" }] }] },
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Recall = TP / (TP + FN)" }] }] },
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "F1 = 2 * Precision * Recall / (Precision + Recall)" }] }] },
					],
				},
			],
		},
	},
	{
		id: "5",
		title: "Overfitting & Regularization",
		preview: "How to reduce variance in complex models.",
		updatedAt: "5 days ago",
		format: "pm_json",
		content: {
			type: "doc",
			content: [
				{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Overfitting & Regularization" }] },
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Overfitting occurs when a model memorizes training data but fails to generalize. Regularization adds a penalty term to the loss function." },
					],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", marks: [{ type: "code" }], text: "L_total = L_data + λ * ||w||²" },
						{ type: "text", text: " controls complexity by discouraging large weights." },
					],
				},
			],
		},
	},
];


interface ScreenshotContext {
	id: string;
	type: "image";
	content: string;
	name: string;
}

export default function App() {
	const [notes, setNotes] = useState<Note[]>(initialNotes);
	const [selectedNoteId, setSelectedNoteId] = useState<string>("1");
	const [screenshots, setScreenshots] = useState<ScreenshotContext[]>([]);

	const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);
	const [isPDFCollapsed, setIsPDFCollapsed] = useState(false);
	const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);

	const selectedNote = notes.find(note => note.id === selectedNoteId) || notes[0];

	const handleScreenshotCapture = (imageDataUrl: string, name: string) => {
		const newScreenshot: ScreenshotContext = {
			id: Date.now().toString() + Math.random(),
			type: "image",
			content: imageDataUrl,
			name,
		};
		setScreenshots(prev => [...prev, newScreenshot]);
	};

	const leftPanelRef = useRef<ImperativePanelHandle>(null);
	const centerPanelRef = useRef<ImperativePanelHandle>(null);
	const rightPanelRef = useRef<ImperativePanelHandle>(null);
	const pdfPanelRef = useRef<ImperativePanelHandle>(null);
	const editorPanelRef = useRef<ImperativePanelHandle>(null);

	// Collapse thresholds (based on UI/UX standards like Overleaf)
	const SIDEBAR_COLLAPSE_THRESHOLD = 12; // 12% for sidebars
	const VERTICAL_COLLAPSE_THRESHOLD = 18; // 18% for vertical panels

	const handleLeftResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isLeftCollapsed) {
			leftPanelRef.current?.collapse();
		}
	};

	const handleCenterResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isCenterCollapsed) {
			centerPanelRef.current?.collapse();
		}
	};

	const handleRightResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isRightCollapsed) {
			rightPanelRef.current?.collapse();
		}
	};

	const handlePDFResize = (size: number) => {
		if (size < VERTICAL_COLLAPSE_THRESHOLD && !isPDFCollapsed) {
			pdfPanelRef.current?.collapse();
		}
	};

	const handleEditorResize = (size: number) => {
		if (size < VERTICAL_COLLAPSE_THRESHOLD && !isEditorCollapsed) {
			editorPanelRef.current?.collapse();
		}
	};

	return (
		<DndProvider backend={HTML5Backend}>
			<div className="h-screen flex flex-col bg-background">
				<Header />

				<div className="flex-1 overflow-hidden">
					<ResizablePanelGroup direction="horizontal">
						{/* Left Sidebar - Note Management */}
						<ResizablePanel
							ref={leftPanelRef}
							defaultSize={18}
							minSize={10}
							maxSize={25}
							collapsible
							collapsedSize={1}
							onCollapse={() => setIsLeftCollapsed(true)}
							onExpand={() => setIsLeftCollapsed(false)}
							onResize={handleLeftResize}
						>
							<div className="h-full w-full relative">
								{isLeftCollapsed && (
									<div
										className="absolute inset-0 z-10 group border-r bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
										onClick={() => leftPanelRef.current?.resize(18)}
									>
										<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
											<PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
										</div>
									</div>
								)}
								<div className={isLeftCollapsed ? "hidden" : "h-full"}>
									<NoteSidebar
										notes={notes}
										setNotes={setNotes}
										selectedNoteId={selectedNoteId}
										onSelectNote={setSelectedNoteId}
									/>
								</div>
							</div>
						</ResizablePanel>

						<ResizableHandle withHandle />

						{/* Center Content - PDF Reader and AI Chat */}
						<ResizablePanel
							ref={centerPanelRef}
							defaultSize={52}
							minSize={10}
							collapsible
							collapsedSize={2}
							onCollapse={() => setIsCenterCollapsed(true)}
							onExpand={() => setIsCenterCollapsed(false)}
							onResize={handleCenterResize}
						>
							{isCenterCollapsed ? (
								<div
									className="h-full w-full group border-r bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
									onClick={() => centerPanelRef.current?.resize(52)}
								>
									<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
										<PanelLeftOpen className="w-4 h-4 text-muted-foreground rotate-180" />
									</div>
								</div>
							) : (
								<ResizablePanelGroup direction="vertical">
									{/* PDF Reader */}
									<ResizablePanel
										ref={pdfPanelRef}
										defaultSize={50}
										minSize={15}
										collapsible
										collapsedSize={3}
										onCollapse={() => setIsPDFCollapsed(true)}
										onExpand={() => setIsPDFCollapsed(false)}
										onResize={handlePDFResize}
									>
										<div className="h-full w-full relative">
											{isPDFCollapsed && (
												<div
													className="absolute inset-0 z-10 group border-b bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
													onClick={() => pdfPanelRef.current?.resize(50)}
												>
													<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
														<ChevronDown className="w-4 h-4 text-muted-foreground" />
														<span className="text-xs text-muted-foreground">PDF</span>
													</div>
												</div>
											)}
											<div className={isPDFCollapsed ? "hidden" : "h-full"}>
												<PDFReader onScreenshotCapture={handleScreenshotCapture} />
											</div>
										</div>
									</ResizablePanel>

									<ResizableHandle withHandle />

									{/* LLM Chat */}
									<ResizablePanel
										ref={editorPanelRef}
										defaultSize={50}
										minSize={15}
										collapsible
										collapsedSize={1}
										onCollapse={() => setIsEditorCollapsed(true)}
										onExpand={() => setIsEditorCollapsed(false)}
										onResize={handleEditorResize}
									>
										<div className="h-full w-full relative">
											{isEditorCollapsed && (
												<div
													className="absolute inset-0 z-10 group border-t bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
													onClick={() => editorPanelRef.current?.resize(50)}
												>
													<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
														<ChevronUp className="w-4 h-4 text-muted-foreground" />
														<span className="text-xs text-muted-foreground">AI Chat</span>
													</div>
												</div>
											)}
											<div className={isEditorCollapsed ? "hidden" : "h-full"}>
												<LLMChat note={selectedNote} externalContextItems={screenshots} />
											</div>
										</div>
									</ResizablePanel>
								</ResizablePanelGroup>
							)}
						</ResizablePanel>

						<ResizableHandle withHandle />

						{/* Right Sidebar - Markdown Editor */}
						<ResizablePanel
							ref={rightPanelRef}
							defaultSize={30}
							minSize={5}
							maxSize={98}
							collapsible
							collapsedSize={2}
							onCollapse={() => setIsRightCollapsed(true)}
							onExpand={() => setIsRightCollapsed(false)}
							onResize={handleRightResize}
						>
							<div className="h-full w-full relative">
								{isRightCollapsed && (
									<div
										className="absolute inset-0 z-10 group border-l bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
										onClick={() => rightPanelRef.current?.resize(30)}
									>
										<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
											<PanelRightOpen className="w-4 h-4 text-muted-foreground" />
										</div>
									</div>
								)}
								<div className={isRightCollapsed ? "hidden" : "h-full"}>
									<NoteTaker note={selectedNote} />
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
			</div>
		</DndProvider>
	);
}
