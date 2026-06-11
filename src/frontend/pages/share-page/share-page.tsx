/**
 * @file        share-page.tsx
 * @description Public read-only view of a shared note snapshot.
 *              No auth required; renders markdown with the same typography
 *              as the in-app renderer. Visitors cannot edit anything.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { MarkdownRenderer } from '@/frontend/components/renderer/markdown-renderer';
import { Skeleton } from '@/frontend/components/ui/skeleton.tsx';
import { publicService } from '@/frontend/api/services/public.service';
import type { PublicNote } from '@/frontend/api/types/note/note.ts';
import { useLanguage } from '@/frontend/i18n/language-context';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export default function SharePage() {
	const { token } = useParams<{ token: string }>();
	const { t } = useLanguage();
	const [note, setNote] = useState<PublicNote | null>(null);
	const [state, setState] = useState<LoadState>('loading');

	useEffect(() => {
		if (!token) {
			setState('not-found');
			return;
		}
		let cancelled = false;
		publicService
			.getPublicNote(token)
			.then(data => {
				if (cancelled) return;
				setNote(data);
				setState('ready');
				if (data.title) document.title = data.title;
			})
			.catch(err => {
				if (cancelled) return;
				setState(err?.statusCode === 404 ? 'not-found' : 'error');
			});
		return () => {
			cancelled = true;
		};
	}, [token]);

	if (state === 'loading') {
		return (
			<div className="min-h-screen bg-background">
				<div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-4">
					<Skeleton className="h-9 w-2/3" />
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-4 w-full mt-6" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</div>
		);
	}

	if (state !== 'ready' || !note) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center px-6">
				<div className="flex flex-col items-center gap-3 text-center">
					<FileQuestion className="h-10 w-10 text-muted-foreground" />
					<h1 className="text-xl font-semibold">{t.share.notFoundTitle}</h1>
					<p className="text-sm text-muted-foreground max-w-sm">
						{state === 'error' ? t.share.loadError : t.share.notFoundDescription}
					</p>
					<Link to="/" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
						{t.share.backHome}
					</Link>
				</div>
			</div>
		);
	}

	const updatedAt = new Date(note.updated_at).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<div className="min-h-screen bg-background">
			<nav className="border-b print:hidden">
				<div className="max-w-3xl mx-auto px-6 py-3">
					<Link to="/">
						<img src="/logo.svg" alt="Atlas Notebook AI Logo" className="h-8" />
					</Link>
				</div>
			</nav>
			<article className="max-w-3xl mx-auto px-6 py-12 print:py-0">
				<header className="mb-8 border-b pb-6">
					<h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.share.updatedAt} {updatedAt}
					</p>
				</header>

				<MarkdownRenderer content={note.content_markdown} />

				<footer className="mt-12 border-t pt-6 print:hidden">
					<p className="text-xs text-muted-foreground">
						{t.share.madeWith}{' '}
						<Link to="/" className="underline underline-offset-4 hover:text-foreground">
							Atlas Notebook
						</Link>
					</p>
				</footer>
			</article>
		</div>
	);
}
