/**
 * @file        note-share-popover.tsx
 * @description Share button + popover for publishing a read-only public
 *              snapshot of the current note. Opening the popover publishes
 *              (or refreshes) the snapshot and shows the copyable link.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Share2, Copy, Check, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover.tsx'
import { Button } from '@/frontend/components/ui/button.tsx'
import { Input } from '@/frontend/components/ui/input.tsx'
import { notesService } from '@/frontend/api/services/notes.service'
import { useLanguage } from '@/frontend/i18n/language-context'

interface NoteSharePopoverProps {
	noteId: string
}

export function NoteSharePopover({ noteId }: NoteSharePopoverProps) {
	const { t } = useLanguage()
	const [open, setOpen] = useState(false)
	const [shareUrl, setShareUrl] = useState<string | null>(null)
	const [isBusy, setIsBusy] = useState(false)
	const [copied, setCopied] = useState(false)

	const handleOpenChange = async (next: boolean) => {
		setOpen(next)
		if (!next || !noteId) return
		setCopied(false)
		setIsBusy(true)
		try {
			// Publishes on first open, refreshes the snapshot on subsequent opens
			const res = await notesService.shareNote(noteId)
			setShareUrl(`${window.location.origin}${res.share_url}`)
		} catch {
			toast.error(t.share.shareFailed)
			setOpen(false)
		} finally {
			setIsBusy(false)
		}
	}

	const handleCopy = async () => {
		if (!shareUrl) return
		await navigator.clipboard.writeText(shareUrl)
		setCopied(true)
		toast.success(t.share.linkCopied)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleUnshare = async () => {
		setIsBusy(true)
		try {
			await notesService.unshareNote(noteId)
			setShareUrl(null)
			setOpen(false)
			toast.success(t.share.unshared)
		} catch {
			toast.error(t.share.unshareFailed)
		} finally {
			setIsBusy(false)
		}
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" disabled={!noteId} title={t.share.share}>
					<Share2 className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<div className="flex flex-col gap-3">
					<div>
						<h4 className="text-sm font-medium">{t.share.shareTitle}</h4>
						<p className="mt-1 text-xs text-muted-foreground">{t.share.shareDescription}</p>
					</div>

					{isBusy && !shareUrl ? (
						<div className="flex items-center justify-center py-2">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : shareUrl ? (
						<>
							<div className="flex items-center gap-2">
								<Input
									readOnly
									value={shareUrl}
									className="h-8 text-xs"
									onFocus={e => e.currentTarget.select()}
								/>
								<Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
									{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
								</Button>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="self-start text-destructive hover:text-destructive"
								onClick={handleUnshare}
								disabled={isBusy}
							>
								{t.share.stopSharing}
							</Button>
						</>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	)
}
