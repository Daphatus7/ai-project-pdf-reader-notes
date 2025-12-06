import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { cn } from './ui/utils.ts';

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!ref.current) return;

		renderMathInElement(ref.current, {
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '\\[', right: '\\]', display: true },
				{ left: '$', right: '$', display: false },
				{ left: '\\(', right: '\\)', display: false },
			],
			throwOnError: false,
		});
	}, [content]);

	return (
		<div ref={ref} className={cn('markdown-renderer', className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// 代码块
					code({ inline, className, children, ...props }) {
						const match = /language-(\w+)/.exec(className || '');
						const language = match ? match[1] : '';

						if (inline) {
							return (
								<code
									className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
									{...props}
								>
									{children}
								</code>
							);
						}

						return (
							<div className="relative my-4">
								{language && (
									<div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded-bl rounded-tr">
										{language}
									</div>
								)}
								<pre className="overflow-x-auto p-4 rounded-lg bg-muted/50 border">
                  <code className={cn('text-sm font-mono', className)} {...props}>
                    {children}
                  </code>
                </pre>
							</div>
						);
					},

					// 表格（GFM）
					table({ children }) {
						return (
							<div className="my-4 overflow-x-auto">
								<table className="min-w-full border-collapse border border-border">
									{children}
								</table>
							</div>
						);
					},
					thead({ children }) {
						return <thead className="bg-muted/50">{children}</thead>;
					},
					th({ children }) {
						return (
							<th className="border border-border px-4 py-2 text-left font-semibold">
								{children}
							</th>
						);
					},
					td({ children }) {
						return (
							<td className="border border-border px-4 py-2">
								{children}
							</td>
						);
					},

					// 标题
					h1({ children }) {
						return (
							<h1 className="text-2xl font-bold mt-6 mb-4 border-b pb-2">
								{children}
							</h1>
						);
					},
					h2({ children }) {
						return (
							<h2 className="text-xl font-bold mt-5 mb-3 border-b pb-1">
								{children}
							</h2>
						);
					},
					h3({ children }) {
						return (
							<h3 className="text-lg font-semibold mt-4 mb-2">
								{children}
							</h3>
						);
					},
					h4({ children }) {
						return (
							<h4 className="text-base font-semibold mt-3 mb-2">
								{children}
							</h4>
						);
					},

					// 段落
					p({ children }) {
						return <p className="my-2 leading-relaxed">{children}</p>;
					},

					// 列表
					ul({ children }) {
						return <ul className="my-2 ml-6 list-disc space-y-1">{children}</ul>;
					},
					ol({ children }) {
						return <ol className="my-2 ml-6 list-decimal space-y-1">{children}</ol>;
					},
					li({ children }) {
						return <li className="leading-relaxed">{children}</li>;
					},

					// 引用
					blockquote({ children }) {
						return (
							<blockquote className="my-4 pl-4 border-l-4 border-primary/50 italic text-muted-foreground">
								{children}
							</blockquote>
						);
					},

					// 链接
					a({ href, children }) {
						return (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline underline-offset-2 hover:text-primary/80"
							>
								{children}
							</a>
						);
					},

					// 其它基础元素
					hr() {
						return <hr className="my-6 border-t border-border" />;
					},
					strong({ children }) {
						return <strong className="font-semibold">{children}</strong>;
					},
					em({ children }) {
						return <em className="italic">{children}</em>;
					},
					del({ children }) {
						return (
							<del className="line-through text-muted-foreground">
								{children}
							</del>
						);
					},
					img({ src, alt }) {
						return (
							<img
								src={src}
								alt={alt || ''}
								className="my-4 max-w-full h-auto rounded-lg"
							/>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
