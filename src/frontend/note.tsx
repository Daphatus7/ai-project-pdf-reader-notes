import React, { useState, useRef, useCallback, useEffect } from "react";
import { Header } from "@@/frontend/components/Header.tsx";
import { NoteSidebar } from "@@/frontend/components/NoteSidebar/NoteSidebar.tsx";
import { PDFSection } from "@@/frontend/components/PDFSection.tsx";
import {type ImageContextItem, LLMChat} from "@@/frontend/components/Chat/LLMChat.tsx";
import { NoteSection } from "@@/frontend/components/NoteSection.tsx";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@@/frontend/components/ui/resizable.tsx";
import {PanelLeftOpen, Menu, PanelRightOpen} from "lucide-react";
import {type ImperativePanelHandle } from "react-resizable-panels";
import type { ContentInsertion, NoteTakerHandle } from "@@/frontend/features/types/content-insertion.ts";
import { Button } from "@@/frontend/components/ui/button.tsx";
import NoteTaker from "@@/frontend/components/note-taker.tsx";

export interface Note {
	id: string;
	title: string;
	preview: string;
	updatedAt: string;
	content: string;
}

export interface imageContext {
	id: string;
	name: string;
	imageUrl: string;
	userMessage: string
}

const initialNotes: Note[] = [
	{
		id: "1",
		title: "Machine Learning Fundamentals",
		preview: "Introduction to supervised and unsupervised learning...",
		updatedAt: "2 hours ago",
		content: `# Machine Learning Fundamentals

## Introduction to Supervised Learning

Supervised learning is a type of machine learning where the model learns from **labeled training data**. The algorithm learns to map input features to output labels.

### Key Concepts:
- Training data with known outcomes
- Feature engineering
- Model evaluation metrics

## Common Algorithms

1. Linear Regression
2. Logistic Regression
3. Decision Trees
4. Random Forests
5. Neural Networks

### Example Code:

\`\`\`python
from sklearn.linear_model import LinearRegression

model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
\`\`\`

## Performance Metrics

| Metric | Use Case | Formula |
|--------|----------|---------|
| Accuracy | Classification | TP+TN / Total |
| Precision | Classification | TP / (TP+FP) |
| Recall | Classification | TP / (TP+FN) |
| RMSE | Regression | √(Σ(y-ŷ)²/n) |

> **Note**: Always validate your model on unseen data to avoid overfitting.

## Next Steps
- Practice with real datasets
- Experiment with hyperparameters
- Compare multiple models`
	},
	{
		id: "2",
		title: "React Best Practices",
		preview: "Component composition and state management patterns...",
		updatedAt: "1 day ago",
		content: `# React Best Practices

## Component Composition

Break down complex UIs into smaller, reusable components. This makes your code more maintainable and testable.

### Benefits:
- **Reusability**: Write once, use everywhere
- **Maintainability**: Easier to debug and update
- **Testability**: Isolated components are easier to test

## State Management

Choose the right state management solution for your needs:

1. **useState** - Local component state
2. **useContext** - Share state across components
3. **useReducer** - Complex state logic
4. **External libraries** - Redux, Zustand, Jotai

### Example:

\`\`\`jsx
const [count, setCount] = useState(0);

function increment() {
  setCount(prev => prev + 1);
}
\`\`\`

## Performance Optimization

- Use React.memo for expensive components
- Implement useMemo for expensive calculations
- Use useCallback for stable function references
- Lazy load components with React.lazy

> Keep your components small and focused on a single responsibility.`
	},
	{
		id: "3",
		title: "Database Design Principles",
		preview: "Normalization, indexing, and query optimization...",
		updatedAt: "3 days ago",
		content: `# Database Design Principles

## Normalization

Normalization is the process of organizing data to minimize redundancy and dependency.

### Normal Forms:
- **1NF**: Atomic values, no repeating groups
- **2NF**: No partial dependencies
- **3NF**: No transitive dependencies
- **BCNF**: Every determinant is a candidate key

## Indexing Strategy

Indexes speed up queries but slow down writes. Use them wisely.

### When to Index:
- Primary keys (automatic)
- Foreign keys
- Columns used in WHERE clauses
- Columns used in JOIN conditions
- Columns used in ORDER BY

\`\`\`sql
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_date ON orders(order_date DESC);
\`\`\`

## Query Optimization

- Use EXPLAIN to analyze query performance
- Avoid SELECT * when possible
- Use appropriate JOINs
- Limit result sets with WHERE clauses
- Consider denormalization for read-heavy applications

| Technique | Impact | Use Case |
|-----------|--------|----------|
| Indexing | High | Frequent queries |
| Caching | Very High | Repeated queries |
| Partitioning | Medium | Large tables |
| Denormalization | Medium | Read-heavy apps |`
	},
	{
		id: "4",
		title: "API Architecture Notes",
		preview: "RESTful design patterns and GraphQL comparisons...",
		updatedAt: "1 week ago",
		content: `# API Architecture Notes

## RESTful Design Patterns

REST (Representational State Transfer) is an architectural style for designing networked applications.

### Key Principles:
- **Stateless**: Each request contains all necessary information
- **Client-Server**: Separation of concerns
- **Cacheable**: Responses must define themselves as cacheable
- **Uniform Interface**: Standardized communication

### HTTP Methods:
\`\`\`
GET    /users       - List all users
GET    /users/:id   - Get specific user
POST   /users       - Create new user
PUT    /users/:id   - Update user
DELETE /users/:id   - Delete user
\`\`\`

## GraphQL vs REST

| Feature | REST | GraphQL |
|---------|------|---------|
| Data Fetching | Multiple endpoints | Single endpoint |
| Over-fetching | Common | Eliminated |
| Versioning | URL-based | Schema evolution |
| Learning Curve | Low | Medium |

### GraphQL Example:
\`\`\`graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
      content
    }
  }
}
\`\`\`

## Best Practices
- Use proper HTTP status codes
- Implement rate limiting
- Version your APIs
- Provide comprehensive documentation
- Use HTTPS for security`
	},
	{
		id: "5",
		title: "CSS Grid & Flexbox",
		preview: "Modern layout techniques for responsive design...",
		updatedAt: "2 weeks ago",
		content: `# CSS Grid & Flexbox

## Flexbox Basics

Flexbox is designed for one-dimensional layouts (rows or columns).

### Common Properties:
\`\`\`css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.item {
  flex: 1;
  /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
}
\`\`\`

## CSS Grid

Grid is designed for two-dimensional layouts (rows and columns).

### Basic Grid:
\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
\`\`\`

### Advanced Grid:
\`\`\`css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 200px;
}
\`\`\`

## When to Use What?

| Use Case | Tool |
|----------|------|
| Navigation bar | Flexbox |
| Card layouts | Grid |
| Centering items | Flexbox |
| Magazine layout | Grid |
| Form controls | Flexbox |

> **Pro Tip**: You can nest flexbox inside grid and vice versa!`
	}
];

/**
 * NotePage component - Main note-taking interface.
 *
 * Coordinates the entire application including:
 * - Note management (sidebar)
 * - PDF reading (center left)
 * - LLM chat with click-to-insert functionality (center right)
 * - Note editing with TipTap editor (right sidebar)
 *
 * Handles content insertion flow:
 * MarkdownRenderer (click) → LLMChat → NotePage → NoteTaker (insert)
 */
export default function NotePage() {

	const [notes, setNotes] = useState<Note[]>(initialNotes);
	const [selectedNoteId, setSelectedNoteId] = useState<string>("1");
	const [screenshots, setScreenshots] = useState<ImageContextItem[]>([]);
	const [pendingImageAnalysis, setPendingImageAnalysis] = useState<ImageContextItem>();

	const [isLeftCollapsed, setIsLeftCollapsed] = useState(true);
	const [isCenterCollapsed, setIsCenterCollapsed] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const selectedNote = notes.find(note => note.id === selectedNoteId) || notes[0];

	const handleScreenshotCapture = (imageDataUrl: string, name: string) => {
		const newScreenshot: ImageContextItem = {
			id: crypto.randomUUID(),
			type: "image",
			name: name,
			userPrompt: "Explain the image",
			imageUrls:[imageDataUrl]
		};

		// Make the screenshot available as context immediately
		setScreenshots(prev => [...prev, newScreenshot]);
		// Trigger one-shot auto analysis inside LLMChat (which owns chat history UI)
		setPendingImageAnalysis(newScreenshot);
	}

	const handleAddNewNote = () => {
		console.log("New Note clicked");
		const newNote: Note = {
			id: crypto.randomUUID(),
			title: "New Note",
			preview: "",
			updatedAt: "Just now",
			content: "",
		};
		setNotes(prevNotes => [newNote, ...prevNotes]);
		setSelectedNoteId(newNote.id);
	}


	const leftPanelRef = useRef<ImperativePanelHandle>(null);
	const centerPanelRef = useRef<ImperativePanelHandle>(null);
	const noteTakerRef = useRef<NoteTakerHandle | null>(null);

	useEffect(() => {
		leftPanelRef.current?.collapse();
	}, []);

	// Collapse thresholds (based on UI/UX standards like Overleaf)
	const SIDEBAR_COLLAPSE_THRESHOLD = 12; // 12% for sidebars

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

	/**
	 * Handles content insertion from LLMChat into NoteTaker.
	 *
	 * Called when user clicks on a section in MarkdownRenderer.
	 * Inserts the formatted markdown content into the note editor.
	 *
	 * @param insertion - Content insertion payload with formatted markdown
	 */
	const handleContentInsert = useCallback((insertion: ContentInsertion) => {
		if (!noteTakerRef.current) {
			console.warn('[NotePage] NoteTaker ref not available, cannot insert content');
			return;
		}

		// Insert content at cursor position
		noteTakerRef.current.insertContent(insertion, 'cursor');

		// Focus the editor after insertion
		noteTakerRef.current.focus();
	}, []);

	const rightPanelRef = useRef<ImperativePanelHandle>(null);
	const [isRightCollapsed, setIsRightCollapsed] = useState(false);

	const handleRightResize = (size: number) => {
		if (size < SIDEBAR_COLLAPSE_THRESHOLD && !isRightCollapsed) {
			rightPanelRef.current?.collapse();
		}
	};

	const handleSaveNote = () => {
		if (noteTakerRef.current && selectedNote) {
			const updatedContent = noteTakerRef.current.getContent();
			setNotes(prevNotes =>
				prevNotes.map(note =>
					note.id === selectedNote.id ? { ...note, content: updatedContent } : note
				)
			);
		}
	}

	return (
		<div className="h-screen w-screen flex flex-col bg-background">
			<Header />

			{/* Floating Sidebar */}
			{isSidebarOpen ? (
				<div className="fixed top-0 left-0 h-20 bg-background shadow-2xl z-50">
					{/* Toggle button attached to sidebar */}
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-4 -right-10 shadow-md bg-background"
						onClick={() => setIsSidebarOpen(false)}
					>
						<Menu className="w-5 h-5" />
					</Button>

					<NoteSidebar
						notes={notes}
						setNotes={setNotes}
						selectedNoteId={selectedNoteId}
						onAddNote={handleAddNewNote}
						onSelectNote={(id) => {
							//Save previous note before switching
							handleSaveNote();
							setSelectedNoteId(id);
						}}
					/>
				</div>
			) : (
				<Button
					variant="ghost"
					size="icon"
					className="fixed top-16 left-4 z-40 shadow-md"
					onClick={() => setIsSidebarOpen(true)}
				>
					<Menu className="w-5 h-5" />
				</Button>
			)}


			<ResizablePanelGroup direction="horizontal">
				{/* Left Sidebar - Note Management */}

				{/* Center Content - PDF Reader and AI Chat */}
				<ResizablePanel
					ref={centerPanelRef}
					defaultSize={33}
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
							<PDFSection onScreenshotCapture={handleScreenshotCapture} />
						</ResizablePanelGroup>
					)}
				</ResizablePanel>
				<ResizableHandle withHandle />

				<LLMChat
					note={selectedNote}
					externalContextItems={screenshots}
					imageContextItem={pendingImageAnalysis}
					onContentInsert={handleContentInsert}
				/>
				<ResizableHandle withHandle />

				{/* Right Sidebar - Markdown Editor */}

				<ResizablePanel
					ref={rightPanelRef}
					collapsible
					defaultSize={33}
					onCollapse={() => setIsRightCollapsed(true)}
					onExpand={() => setIsRightCollapsed(false)}
					onResize={handleRightResize}
				>
					<div className="h-full w-full relative">
						{isRightCollapsed && (
							<div
								className="absolute inset-0 z-10 group border-l bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
								onClick={() => rightPanelRef.current?.resize(50)}
							>
								<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200">
									<PanelRightOpen className="w-4 h-4 text-muted-foreground" />
								</div>
							</div>
						)}
						<div className={isRightCollapsed ? "hidden" : "h-full"}>
							<NoteTaker

								note={selectedNote}
								ref={noteTakerRef} />
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
