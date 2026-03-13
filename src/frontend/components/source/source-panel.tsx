import { useState, useEffect } from 'react';
import {
	ArrowLeft,
	FileText,
	Trash2,
	Upload,
	Loader2,
	Crown,
} from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import {
	Collapsible,
} from '@/frontend/components/ui/collapsible';
import { DocumentUpload } from './document-upload';
import { PricingDialog } from '@/frontend/features/pricing/PricingDialog';
import { useSource } from './useSource';

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

interface SourcePanelProps {
	projectId: string;
	projectName: string;
	onBack: () => void;
	onOpenDocument: (documentId: string) => void;
	isLoadingDocument?: boolean;
	canUploadDocument?: boolean;
	onDocumentChange?: () => void;
	onSourceSelectionChange?: (selected: {id: string, document_name: string}[]) => void;
}

export function SourcePanel({
	projectId,
	projectName,
	onBack,
	onOpenDocument,
	isLoadingDocument,
	canUploadDocument = true,
	onDocumentChange,
	onSourceSelectionChange,
}: SourcePanelProps) {
	const source = useSource(projectId);
	const [isSourcesOpen, setIsSourcesOpen] = useState(true);
	const [pricingOpen, setPricingOpen] = useState(false);

	// Pass full document objects (not just IDs) so consumers can display names
	useEffect(() => {
		const selected = source.documents
			.filter(d => source.selectedDocumentIds.includes(d.id))
			.map(d => ({ id: d.id, document_name: d.document_name }));
		onSourceSelectionChange?.(selected);
	}, [source.selectedDocumentIds, source.documents, onSourceSelectionChange]);

	const handleUpload = async (file: File, sourceName?: string) => {
		await source.uploadDocument(file, sourceName);
		onDocumentChange?.();
	};

	const handleDelete = async (documentId: string) => {
		await source.deleteDocument(documentId);
		onDocumentChange?.();
	};

	return (
		<div className="h-full flex flex-col relative">
			{isLoadingDocument && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}
			{/* Header - for source list */}
			<div className="border-b p-3 flex items-center justify-between gap-2 h-13">
				<span className="text-sm font-medium truncate">
					{projectName}
				</span>
				<div className="flex items-center gap-2">
	<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Error */}
			{source.error && (
				<div className="px-3 pt-2">
					<div className="text-sm text-destructive">{source.error}</div>
				</div>
			)}

			{/* Sources Section */}
			<ScrollArea className="flex-1">
				<div className="p-3">
					<Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>

						{/* Upload Area */}
						<div className="mb-4">
							{canUploadDocument ? (
								<DocumentUpload
									onUpload={handleUpload}
									isUploading={source.isUploading}
								/>
							) : (
								<button
									type="button"
									onClick={() => setPricingOpen(true)}
									className="w-full rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-center cursor-pointer hover:bg-amber-100 transition-colors"
								>
									<Crown className="h-6 w-6 mx-auto mb-1 text-amber-500" />
									<p className="text-sm text-amber-700">Document limit reached</p>
									<p className="text-xs text-amber-600">Upgrade to upload more</p>
								</button>
							)}
						</div>

						{/* Documents List */}
						{source.isLoadingDocuments ? (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : source.documents.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
								<p className="text-sm">No documents yet</p>
								<p className="text-xs">Upload a PDF to get started</p>
							</div>
						) : (
							<div className="space-y-1">
								{source.documents.map((doc) => (
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
											onClick={() => handleDelete(doc.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
										<Checkbox
											checked={source.selectedDocumentIds.includes(doc.id)}
											onCheckedChange={() => source.toggleDocumentSelection(doc.id)}
										/>
									</div>
								))}
							</div>
						)}
					</Collapsible>
				</div>
			</ScrollArea>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</div>
	);
}
