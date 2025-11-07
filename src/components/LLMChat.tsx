import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  Send, 
  Image as ImageIcon, 
  Sparkles,
  User,
  Plus,
  X,
  FileText,
  ImagePlus,
  GripVertical
} from "lucide-react";
import { cn } from "./ui/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import type { Note } from "../App";
import { useDrag } from "react-dnd";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  hasImage?: boolean;
}

interface ContextItem {
  id: string;
  type: "image" | "text";
  content: string; // For images: URL, For text: the text content
  name?: string; // Optional name/title
  preview?: string; // For text: first few characters
}

export const DRAG_TYPE = "AI_MESSAGE";

interface DraggableMessageProps {
  message: Message;
}

function DraggableMessage({ message }: DraggableMessageProps) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: DRAG_TYPE,
    item: { content: message.content },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      className={cn(
        "flex gap-3 justify-start group",
        isDragging && "opacity-50"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Sparkles className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      
      <div
        ref={preview}
        className={cn(
          "rounded-lg px-4 py-2 max-w-[85%] bg-muted relative"
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                ref={drag}
                className={cn(
                  "absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
                  "bg-muted border border-border rounded p-1 hover:bg-primary/10 hover:border-primary"
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Drag to insert into markdown editor</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

interface LLMChatProps {
  note: Note;
  externalContextItems?: ContextItem[];
}

const mockMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I'm your AI assistant. I can help you understand your documents, expand your notes, and answer questions about the current note. How can I help you today?"
  }
];

export function LLMChat({ note, externalContextItems = [] }: LLMChatProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isAddContextOpen, setIsAddContextOpen] = useState(false);
  const [newContextText, setNewContextText] = useState("");
  const [newContextName, setNewContextName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge external context items (like screenshots) with manual context items
  const allContextItems = [...contextItems, ...externalContextItems];

  // Reset messages when note changes
  useEffect(() => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `I'm now viewing your note: "${note.title}". I have access to the full content of this note. How can I help you with it?`
      }
    ]);
  }, [note.id]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };
    
    setMessages([...messages, newMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I've analyzed your question. This is a simulated response. In production, this would connect to your configured LLM API."
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleAddTextContext = () => {
    if (!newContextText.trim()) return;
    
    const newContext: ContextItem = {
      id: Date.now().toString(),
      type: "text",
      content: newContextText,
      name: newContextName || "Text Context",
      preview: newContextText.slice(0, 50)
    };
    
    setContextItems([...contextItems, newContext]);
    setNewContextText("");
    setNewContextName("");
    setIsAddContextOpen(false);
  };

  const handleAddImageContext = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newContext: ContextItem = {
          id: Date.now().toString() + Math.random(),
          type: "image",
          content: event.target?.result as string,
          name: file.name
        };
        setContextItems(prev => [...prev, newContext]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeContext = (id: string) => {
    setContextItems(contextItems.filter(item => item.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          {/* <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-sm">AI Assistant</h2>
          </div> */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>

              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs mb-1">Current Document Context</p>
                <p className="text-xs">{note.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The AI has access to the full content of this note
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            message.role === "assistant" ? (
              <DraggableMessage key={message.id} message={message} />
            ) : (
              <div
                key={message.id}
                className="flex gap-3 justify-end"
              >
                <div className="rounded-lg px-4 py-2 max-w-[85%] bg-primary text-primary-foreground">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-muted/20">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={`Ask about "${note.title}"...`}
              className="pr-32"
            />
            
            {/* Context items cascade in input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {/* Current document context - always visible */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="relative"
                      style={{ zIndex: 100 }}
                    >
                      <div
                        className={cn(
                          "h-7 w-7 rounded-md border-2 border-background flex items-center justify-center",
                          "bg-primary/20 border-primary/40"
                        )}
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div>
                      <p className="text-xs mb-1 font-medium">{note.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Current document (always in context)
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {allContextItems.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {allContextItems.slice(0, 3).map((item, index) => (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="relative group"
                            style={{ zIndex: allContextItems.length - index }}
                          >
                            <div
                              className={cn(
                                "h-7 w-7 rounded-md border-2 border-background flex items-center justify-center cursor-pointer transition-all",
                                "bg-muted hover:border-primary hover:shadow-md hover:scale-110"
                              )}
                            >
                              {item.type === "image" ? (
                                <div className="w-full h-full rounded-sm overflow-hidden">
                                  <img 
                                    src={item.content} 
                                    alt={item.name || "Context"} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-primary" />
                              )}
                            </div>
                            
                            {/* Delete button on hover - only for manual context items */}
                            {contextItems.find(ci => ci.id === item.id) && (
                              <button
                                onClick={() => removeContext(item.id)}
                                className={cn(
                                  "absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground",
                                  "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                  "hover:bg-destructive/90 shadow-sm"
                                )}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {item.type === "image" ? (
                            <div>
                              <p className="text-xs mb-1">{item.name}</p>
                              <img 
                                src={item.content} 
                                alt={item.name || "Context"} 
                                className="max-h-32 rounded"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs mb-1">{item.name}</p>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                {item.content.length > 100 
                                  ? item.content.slice(0, 100) + "..." 
                                  : item.content}
                              </p>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  {allContextItems.length > 3 && (
                    <div className="h-7 w-7 rounded-md border-2 border-background bg-muted flex items-center justify-center text-xs">
                      +{allContextItems.length - 3}
                    </div>
                  )}
                </div>
              )}
              
              {/* Add Context Button */}
              <Dialog open={isAddContextOpen} onOpenChange={setIsAddContextOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Context</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 pt-4">
                    {/* Add Image */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleAddImageContext}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    {/* Add Text */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm mb-1.5 block">Context Name</label>
                        <Input
                          placeholder="e.g., Important Notes, Background Info"
                          value={newContextName}
                          onChange={(e) => setNewContextName(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm mb-1.5 block">Text Content</label>
                        <Textarea
                          placeholder="Enter text context that will help the AI understand your question..."
                          value={newContextText}
                          onChange={(e) => setNewContextText(e.target.value)}
                          rows={6}
                        />
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={handleAddTextContext}
                        disabled={!newContextText.trim()}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Add Text Context
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          AI has context of current note: <span className="text-primary">{note.title}</span>. Add images or text for additional context.
        </p>
      </div>
    </div>
  );
}
