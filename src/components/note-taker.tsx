import React, { useRef, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { JSONContent } from '@tiptap/core';
import type { Note } from '../../App';

interface NoteTakerProps {
    note?: Note;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export const NoteTaker: React.FC<NoteTakerProps> = ({ note }) => {
    const latest = useRef<JSONContent | null>(null);

    const save = useRef(
        debounce((data: JSONContent) => {
            console.log('saved', data);
        }, 1500)
    ).current;

    const editor = useEditor({
        extensions: [StarterKit],
        content: note?.content || '<p>Start taking notes…</p>',
        autofocus: 'end',
        onUpdate: ({ editor, transaction }) => {
            if (!transaction.docChanged) return;        // no-op edits
            const json = editor.getJSON();              // serialize once
            latest.current = json;                      // no React state churn
            save(json);                                 // debounced save
        },
    });

    // Update editor content when note changes
    useEffect(() => {
        if (editor && note) {
            editor.commands.setContent(note.content);
        }
    }, [editor, note?.id, note?.content]);

    // optional: save on unload
    useEffect(() => {
        const handler = () => latest.current && save(latest.current);
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [save]);

    return <EditorContent editor={editor} />;
};

export default NoteTaker;
