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
import NoteTaker from "@@/components/note-taker.tsx";

export interface Note {
	id: string;
	title: string;
	preview: string;
	updatedAt: string;
	content: string;
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
