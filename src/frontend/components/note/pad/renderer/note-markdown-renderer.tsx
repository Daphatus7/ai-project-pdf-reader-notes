interface NoteMarkdownRendererProps {
	value: string
	onChange: (value: string) => void
}

export function NoteMarkdownRenderer({ value, onChange }: NoteMarkdownRendererProps) {
	return (
		<textarea
			className="markdown-input w-full h-full font-mono p-4 resize-none outline-none bg-background text-foreground"
			value={value}
			onChange={e => onChange(e.target.value)}
			spellCheck={false}
		/>
	)
}
