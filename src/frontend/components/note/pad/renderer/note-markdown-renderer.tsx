import { useState, useEffect } from 'react'

interface NoteMarkdownRendererProps {
	value: string
	onChange: (value: string) => void
}

export function NoteMarkdownRenderer({ value, onChange }: NoteMarkdownRendererProps) {
	const [localValue, setLocalValue] = useState(value)

	useEffect(() => {
		setLocalValue(value)
	}, [value])

	return (
		<textarea
			className="markdown-input w-full h-full font-mono p-4 resize-none outline-none bg-panel text-foreground"
			value={localValue}
			onChange={e => {
				setLocalValue(e.target.value)
				onChange(e.target.value)
			}}
			spellCheck={false}
		/>
	)
}
