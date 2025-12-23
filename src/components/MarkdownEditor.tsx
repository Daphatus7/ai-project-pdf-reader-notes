import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Link,
  Image,
  Code,
  Table,
  Heading1,
  Heading2,
  FileDown
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import type { Note } from "../App";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDrop } from "react-dnd";
import { cn } from "./ui/utils";
import { DRAG_TYPE } from "./LLMChat";

interface MarkdownEditorProps {
  note: Note;
}

export function MarkdownEditor({ note }: MarkdownEditorProps) {
  const [content, setContent] = useState(note.content);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dropLineIndex, setDropLineIndex] = useState<number | null>(null);
  const savedScrollPositionRef = useRef(0);
  
  // Fixed dimensions matching the textarea styling
  const LINE_HEIGHT = 20;
  const PADDING_TOP = 24; // p-6 = 1.5rem = 24px

  // Update content when note changes
  useEffect(() => {
    setContent(note.content);
  }, [note.id, note.content]);

  // Restore scroll position when switching back to edit mode
  useEffect(() => {
    if (activeTab === "edit" && textareaRef.current) {
      textareaRef.current.scrollTop = savedScrollPositionRef.current;
    } else if (activeTab === "preview" && textareaRef.current) {
      // Save scroll position when leaving edit mode
      savedScrollPositionRef.current = textareaRef.current.scrollTop;
    }
  }, [activeTab]);

  const getLineFromMousePosition = (clientY: number): number => {
    const textarea = textareaRef.current;
    if (!textarea) return 0;

    const rect = textarea.getBoundingClientRect();
    const scrollTop = textarea.scrollTop;
    
    // Calculate Y position relative to the textarea's text content start
    const relativeY = (clientY - rect.top) - PADDING_TOP + scrollTop;
    
    // Calculate which line, using floor for the line we're currently over
    const lineIndex = Math.max(0, Math.floor(relativeY / LINE_HEIGHT));
    
    // Debug logging
    if (lineIndex <= 5) {
      console.log('[Line Calc]', {
        clientY,
        'rect.top': rect.top,
        PADDING_TOP,
        scrollTop,
        relativeY,
        'relativeY/LINE_HEIGHT': relativeY / LINE_HEIGHT,
        lineIndex
      });
    }
    
    return lineIndex;
  };

  const getCharPositionForLine = (lineIndex: number): number => {
    // Use textarea's actual current value instead of state to avoid stale closures
    const currentContent = textareaRef.current?.value || content;
    const lines = currentContent.split('\n');
    if (lineIndex >= lines.length) {
      return currentContent.length;
    }
    
    let position = 0;
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    return position;
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPE,
    hover: (item, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const lineIndex = getLineFromMousePosition(clientOffset.y);
        setDropLineIndex(lineIndex);
      }
    },
    drop: (item: { content: string }, monitor) => {
      const textarea = textareaRef.current;
      if (!textarea || dropLineIndex === null) return;

      // Save current scroll position
      const savedScrollTop = textarea.scrollTop;

      // Get current content from textarea to avoid stale state
      const currentContent = textarea.value;

      // Get insertion position based on drop line
      const insertPosition = getCharPositionForLine(dropLineIndex);
      const beforeDrop = currentContent.substring(0, insertPosition);
      const afterDrop = currentContent.substring(insertPosition);

      // Smart newline handling
      let newContent: string;
      let addedChars: number;
      
      if (beforeDrop.length === 0) {
        // Inserting at the very beginning
        newContent = `${item.content}\n${afterDrop}`;
        addedChars = item.content.length + 1;
      } else if (beforeDrop.endsWith('\n') || beforeDrop.endsWith('\n\n')) {
        // Already have newline, just insert content
        newContent = `${beforeDrop}${item.content}\n${afterDrop}`;
        addedChars = item.content.length + 1;
      } else {
        // Need to add newline before content
        newContent = `${beforeDrop}\n${item.content}\n${afterDrop}`;
        addedChars = item.content.length + 2;
      }
      
      // Update state - this will trigger React re-render
      setContent(newContent);

      // Reset drop line indicator
      setDropLineIndex(null);

      // Restore scroll position and set cursor at insertion point immediately
      // Use requestAnimationFrame to ensure React has updated the DOM
      requestAnimationFrame(() => {
        if (textarea) {
          // Restore the scroll position first
          textarea.scrollTop = savedScrollTop;
          
          // Set cursor at the end of inserted content without scrolling
          const newCursorPosition = insertPosition + addedChars;
          textarea.focus({ preventScroll: true });
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          
          // Ensure scroll position is maintained after selection
          textarea.scrollTop = savedScrollTop;
        }
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [content, dropLineIndex]);

  // Reset drop line when not hovering
  useEffect(() => {
    if (!isOver) {
      setDropLineIndex(null);
    }
  }, [isOver]);

  const insertMarkdown = (syntax: string, placeholder: string = "") => {
    // Simple implementation - in production, this would handle cursor position
    setContent(content + `\n${syntax}${placeholder}${syntax}\n`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Editor Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm">
          <FileDown className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Toolbar */}
      {activeTab === "edit" && (
        <div className="border-b px-4 py-2 flex items-center gap-1 bg-muted/10 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => insertMarkdown("# ", "Heading")}
                >
                  <Heading1 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Heading 1</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => insertMarkdown("## ", "Heading")}
                >
                  <Heading2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Heading 2</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => insertMarkdown("**", "bold text")}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Bold</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => insertMarkdown("*", "italic text")}
                >
                  <Italic className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Italic</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => insertMarkdown("`", "code")}
                >
                  <Code className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Inline Code</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setContent(content + "\n- List item\n")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Bullet List</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setContent(content + "\n1. List item\n")}
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Numbered List</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setContent(content + "\n[link text](url)\n")}
                >
                  <Link className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Link</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setContent(content + "\n![alt text](image-url)\n")}
                >
                  <Image className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Image</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setContent(content + "\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n")}
                >
                  <Table className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Table</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "edit" ? (
          <div 
            ref={(node) => {
              drop(node);
              dropZoneRef.current = node;
            }}
            className={cn(
              "h-full relative",
              isOver && canDrop && "ring-2 ring-primary ring-inset"
            )}
          >
            {/* Line highlight indicator during drag */}
            {isOver && canDrop && dropLineIndex !== null && (
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
              onChange={(e) => setContent(e.target.value)}
              className="h-full w-full border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm p-6 bg-transparent relative z-10"
              placeholder="Start writing your notes in Markdown..."
              style={{ lineHeight: '20px' }}
            />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
