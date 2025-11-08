import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Note } from '../App';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { useDrop } from 'react-dnd';
import { cn } from './ui/utils';
import { DRAG_TYPE } from './LLMChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteTakerProps {
    note?: Note;
}

type ViewMode = 'markdown' | 'preview' | 'editor';

export const NoteTaker: React.FC<NoteTakerProps> = ({ note }) => {
    const [content, setContent] = useState(note?.content || '');
    const [activeView, setActiveView] = useState<ViewMode>('editor');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [dropLineIndex, setDropLineIndex] = useState<number | null>(null);
    const savedScrollPositionRef = useRef(0);

    const LINE_HEIGHT = 20;
    const PADDING_TOP = 24;

    const isUpdatingFromEditor = useRef(false);
    const isUpdatingFromExternal = useRef(false);

    const editor = useEditor({
        extensions: [StarterKit, Markdown],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full p-4',
            },
        },
        onUpdate: ({ editor }) => {
            if (isUpdatingFromExternal.current) return;
            
            isUpdatingFromEditor.current = true;
            try {
                const markdown = (editor.storage.markdown as any)?.getMarkdown?.() || 
                                (editor.storage.markdown as any)?.serializer?.serialize?.(editor.getJSON()) ||
                                content;
                if (markdown !== content) {
                    setContent(markdown);
                }
            } catch (e) {
                // If markdown extraction fails, keep current content
            } finally {
                isUpdatingFromEditor.current = false;
            }
        },
    });

    useEffect(() => {
        if (note?.content !== undefined && note.content !== content) {
            isUpdatingFromExternal.current = true;
            setContent(note.content);
            if (editor && !isUpdatingFromEditor.current) {
                editor.commands.setContent(note.content);
            }
            setTimeout(() => {
                isUpdatingFromExternal.current = false;
            }, 100);
        }
    }, [note?.id, note?.content, editor]);

    useEffect(() => {
        if (editor && !isUpdatingFromEditor.current && content !== note?.content) {
            isUpdatingFromExternal.current = true;
            editor.commands.setContent(content);
            setTimeout(() => {
                isUpdatingFromExternal.current = false;
            }, 100);
        }
    }, [content]);

    useEffect(() => {
        if (activeView === 'markdown' && textareaRef.current) {
            textareaRef.current.scrollTop = savedScrollPositionRef.current;
        } else if (activeView !== 'markdown' && textareaRef.current) {
            savedScrollPositionRef.current = textareaRef.current.scrollTop;
        }
    }, [activeView]);

    const getLineFromMousePosition = (clientY: number): number => {
        const textarea = textareaRef.current;
        if (!textarea) return 0;

        const rect = textarea.getBoundingClientRect();
        const scrollTop = textarea.scrollTop;
        const relativeY = (clientY - rect.top) - PADDING_TOP + scrollTop;
        const lineIndex = Math.max(0, Math.floor(relativeY / LINE_HEIGHT));
        
        return lineIndex;
    };

    const getCharPositionForLine = (lineIndex: number): number => {
        const currentContent = textareaRef.current?.value || content;
        const lines = currentContent.split('\n');
        if (lineIndex >= lines.length) {
            return currentContent.length;
        }
        
        let position = 0;
        for (let i = 0; i < lineIndex; i++) {
            position += lines[i].length + 1;
        }
        
        return position;
    };

    const [{ isOver, canDrop }, drop] = useDrop<{ content: string }, unknown, { isOver: boolean; canDrop: boolean }>(() => ({
        accept: DRAG_TYPE,
        hover: (_item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            if (clientOffset && activeView === 'markdown') {
                const lineIndex = getLineFromMousePosition(clientOffset.y);
                setDropLineIndex(lineIndex);
            }
        },
        drop: (item) => {
            if (activeView !== 'markdown') return;
            
            const textarea = textareaRef.current;
            if (!textarea || dropLineIndex === null) return;

            const savedScrollTop = textarea.scrollTop;
            const currentContent = textarea.value;
            const insertPosition = getCharPositionForLine(dropLineIndex);
            const beforeDrop = currentContent.substring(0, insertPosition);
            const afterDrop = currentContent.substring(insertPosition);

            let newContent: string;
            let addedChars: number;
            
            if (beforeDrop.length === 0) {
                newContent = `${item.content}\n${afterDrop}`;
                addedChars = item.content.length + 1;
            } else if (beforeDrop.endsWith('\n') || beforeDrop.endsWith('\n\n')) {
                newContent = `${beforeDrop}${item.content}\n${afterDrop}`;
                addedChars = item.content.length + 1;
            } else {
                newContent = `${beforeDrop}\n${item.content}\n${afterDrop}`;
                addedChars = item.content.length + 2;
            }
            
            setContent(newContent);
            if (editor) {
                editor.commands.setContent(newContent);
            }
            setDropLineIndex(null);

            requestAnimationFrame(() => {
                if (textarea) {
                    textarea.scrollTop = savedScrollTop;
                    const newCursorPosition = insertPosition + addedChars;
                    textarea.focus({ preventScroll: true });
                    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                    textarea.scrollTop = savedScrollTop;
                }
            });
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [content, dropLineIndex, activeView, editor]);

    useEffect(() => {
        if (!isOver) {
            setDropLineIndex(null);
        }
    }, [isOver]);

    const handleMarkdownChange = (newContent: string) => {
        setContent(newContent);
        if (editor) {
            editor.commands.setContent(newContent);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as ViewMode)} className="h-full flex flex-col">
                <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
                    <TabsList>
                        <TabsTrigger value="markdown">Markdown</TabsTrigger>
						<TabsTrigger value="editor">Editor</TabsTrigger>
						<TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <TabsContent value="markdown" className="h-full m-0">
                        <div 
                            ref={(node) => {
                                drop(node);
                            }}
                            className={cn(
                                "h-full relative",
                                isOver && canDrop && activeView === 'markdown' && "ring-2 ring-primary ring-inset"
                            )}
                        >
                            {isOver && canDrop && activeView === 'markdown' && dropLineIndex !== null && (
                                <div 
                                    className="absolute left-0 right-0 pointer-events-none z-20"
                                    style={{
                                        top: `${PADDING_TOP + dropLineIndex * LINE_HEIGHT - (textareaRef.current?.scrollTop || 0)}px`,
                                        height: `${LINE_HEIGHT}px`,
                                        marginLeft: `${PADDING_TOP}px`,
                                        marginRight: `${PADDING_TOP}px`,
                                    }}
                                >
                                    <div className="h-full bg-primary/20 border-l-2 border-primary rounded-sm" />
                                </div>
                            )}
                            
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => handleMarkdownChange(e.target.value)}
                                className="h-full w-full border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm p-6 bg-transparent relative z-10"
                                placeholder="Start writing your notes in Markdown..."
                                style={{ lineHeight: '20px' }}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="editor" className="h-full m-0">
                        {editor && (
                            <ScrollArea className="h-full">
                                <EditorContent editor={editor} />
                            </ScrollArea>
                        )}
                    </TabsContent>
					<TabsContent value="preview" className="h-full m-0">
						<ScrollArea className="h-full">
							<div className="p-6 prose prose-sm max-w-none dark:prose-invert">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={{
										code({ node, inline, className, children, ...props }: any) {
											return inline ? (
												<code className={className} {...props}>
													{children}
												</code>
											) : (
												<pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                </pre>
											);
										},
									}}
								>
									{content}
								</ReactMarkdown>
							</div>
						</ScrollArea>
					</TabsContent>

				</div>
            </Tabs>
        </div>
    );
};

export default NoteTaker;
