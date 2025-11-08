import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Note } from '../App';

import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

interface NoteTakerProps {
    note?: Note;
}

export const NoteTaker: React.FC<NoteTakerProps> = ({ note }) => {
	const editor = useEditor({
		extensions: [StarterKit, Markdown],
		content: note?.content || '',
		editorProps: {
			attributes: {
				class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full p-4',
			},
		},
	})

	React.useEffect(() => {
		if (editor && note?.content !== undefined) {
			editor.commands.setContent(note.content)
		}
	}, [editor, note?.content])
	
    return <EditorContent editor={editor} />;
};

export default NoteTaker;
