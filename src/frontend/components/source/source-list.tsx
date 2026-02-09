import { useState } from 'react';
import {
	ArrowLeft,
	FileText,
	Trash2,
	Upload,
} from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import {
	Collapsible,
} from '@/frontend/components/ui/collapsible';
import { DocumentUpload } from './document-upload';
import type { Project, Document } from './type';

const FADE_GRADIENT = 'linear-gradient(to right, black 90%, transparent)';

function FadeText({ text, maxChars = 120 }: { text: string; maxChars?: number }) {
	const isLong = text.length > maxChars;
	return (
		<span
			className="text-sm "
			style={isLong ? { maskImage: FADE_GRADIENT, WebkitMaskImage: FADE_GRADIENT } : undefined}
		>
			{isLong ? text.slice(0, maxChars) : text}
		</span>
	);
}

interface SourceListProps {
	currentProject: Project;
	documents: Document[];
	selectedDocumentIds: string[];
	isLoadingDocuments: boolean;
	isUploading: boolean;
	error: string | null;
	onGoBack: () => void;
	onUploadDocument: (file: File, sourceName?: string) => Promise<void>;
	onDeleteDocument: (documentId: string) => Promise<void>;
	onToggleSelection: (documentId: string) => void;
	onOpenDocument: (documentId: string) => void;
}

export function SourceList({
	currentProject,
	documents,
	selectedDocumentIds,
	isLoadingDocuments,
	isUploading,
	error,
	onGoBack,
	onUploadDocument,
	onDeleteDocument,
	onToggleSelection,
	onOpenDocument,
}: SourceListProps) {
	const [isSourcesOpen, setIsSourcesOpen] = useState(true);

	return (
		<div className="h-full flex flex-col">
			{/* Header with back button and project name */}
			<div className="border-b p-3 flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={onGoBack}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<span className="text-sm font-medium truncate">
					{currentProject.name}
				</span>
			</div>

			{/* Error */}
			{error && (
				<div className="px-3 pt-2">
					<div className="text-sm text-destructive">{error}</div>
				</div>
			)}

			{/* Sources Section */}
			<ScrollArea className="flex-1">
				<div className="p-3">
					<Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>

						{/* Upload Area */}
						<div className="mb-4">
							<DocumentUpload
								onUpload={onUploadDocument}
								isUploading={isUploading}
							/>
						</div>

						{/* Documents List */}
						{isLoadingDocuments ? (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : documents.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
								<p className="text-sm">No documents yet</p>
								<p className="text-xs">Upload a PDF to get started</p>
							</div>
						) : (
							<div className="space-y-1">
								{documents.map((doc) => (
									<div
										key={doc.id}
										className="flex items-center gap-2 p-2 hover:bg-accent rounded-md group"
									>
										<button
											onClick={() => onOpenDocument(doc.id)}
											className="flex-1 flex items-center gap-2 text-left min-w-0"
										>
											<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
											<FadeText text={doc.document_name} />
										</button>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
											onClick={() => onDeleteDocument(doc.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
										<Checkbox
											className="border-r-8"
											checked={selectedDocumentIds.includes(doc.id)}
											onCheckedChange={() => onToggleSelection(doc.id)}
										/>
									</div>
								))}
							</div>
						)}
					</Collapsible>
				</div>
			</ScrollArea>
		</div>
	);
}
