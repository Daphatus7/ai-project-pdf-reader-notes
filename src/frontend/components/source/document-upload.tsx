import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Progress } from '@/frontend/components/ui/progress';
import { useLanguage } from '@/frontend/i18n/language-context';

interface DocumentUploadProps {
	onUpload: (file: File, sourceName?: string) => Promise<void>;
	isUploading: boolean;
}

export function DocumentUpload({ onUpload, isUploading }: DocumentUploadProps) {
	const { t } = useLanguage();
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const files = Array.from(e.dataTransfer.files);
			const pdfFile = files.find((f) => f.type === 'application/pdf');
			if (pdfFile) {
				await onUpload(pdfFile);
			}
		},
		[onUpload],
	);

	const handleFileInput = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file && file.type === 'application/pdf') {
				await onUpload(file);
			}
			e.target.value = '';
		},
		[onUpload],
	);

	return (
		<div
			className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
				isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
			}`}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
		>
			{isUploading ? (
				<div className="space-y-2">
					<p className="text-sm text-center text-muted-foreground">{t.documentUpload.uploading}</p>
					<Progress className="h-1" />
				</div>
			) : (
				<div className="text-center">
					<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
					<p className="text-sm text-muted-foreground mb-2">{t.documentUpload.dragDrop}</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
					>
						{t.documentUpload.browseFiles}
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/pdf"
						className="hidden"
						onChange={handleFileInput}
						disabled={isUploading}
					/>
				</div>
			)}
		</div>
	);
}
