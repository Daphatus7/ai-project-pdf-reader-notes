# Click-to-Insert Feature Documentation

## Overview

The click-to-insert feature allows users to click on any section in the MarkdownRenderer (displayed in LLMChat) and automatically insert that content into the NoteTaker editor. This provides a seamless way to copy content from AI assistant responses into notes.

## Architecture

### Component Flow

```
MarkdownRenderer (click event)
    ↓ onSectionClick callback
LLMChat (transforms content)
    ↓ onContentInsert callback
LLMChatSection (passes through)
    ↓ onContentInsert callback
App (coordinates)
    ↓ noteTakerRef.insertContent()
NoteTaker (inserts into editor)
```

### Data Flow

1. **User clicks section** in MarkdownRenderer
2. **SelectableWrapper** extracts text content from React nodes
3. **MarkdownRenderer** calls `onSectionClick(sectionType, content)`
4. **LLMChat** receives click, transforms content using `transformContentForInsertion()`
5. **LLMChat** creates `ContentInsertion` payload and calls `onContentInsert()`
6. **App** receives insertion, calls `noteTakerRef.current.insertContent()`
7. **NoteTaker** inserts markdown content at cursor position using TipTap commands
8. **NoteTaker** focuses the editor

## Key Components

### 1. Types (`types/content-insertion.ts`)

Defines TypeScript interfaces:
- `SectionType`: All clickable section types (headings, paragraphs, code blocks, etc.)
- `ContentInsertion`: Payload containing content, type, and metadata
- `NoteTakerHandle`: Imperative handle interface for NoteTaker

### 2. Content Transformer (`utils/content-transformer.ts`)

Transforms raw text content into properly formatted markdown based on section type:
- Headings: Adds appropriate `#` markers
- Code blocks: Wraps in triple backticks
- Inline code: Wraps in single backticks
- Blockquotes: Adds `>` prefix to each line
- Lists: Adds list markers (`-` or numbered)
- Tables: Preserves table structure
- Links: Formats as `[text](url)`

### 3. MarkdownRenderer

- Already had click detection via `SelectableWrapper`
- Extracts text content from React nodes
- Calls `onSectionClick` with section type and content

### 4. LLMChat

- Receives `onContentInsert` callback prop
- Handles section clicks via `handleSectionClick()`
- Transforms content using transformer utility
- Creates `ContentInsertion` payload
- Passes to parent via callback

### 5. LLMChatSection

- Passes through `onContentInsert` callback to LLMChat
- No transformation, just routing

### 6. NoteTaker

- Uses `forwardRef` to expose imperative handle
- Implements `useImperativeHandle` with:
  - `insertContent(content, position)`: Inserts markdown at cursor or end
  - `focus()`: Focuses the editor
  - `getEditor()`: Returns TipTap editor instance
- Handles view switching (ensures editor view is active)
- Uses TipTap `insertContent` command with markdown parsing

### 7. NoteSection

- Forwards `noteTakerRef` to NoteTaker component
- No logic, just ref forwarding

### 8. App

- Creates `noteTakerRef` using `useRef<NoteTakerHandle>()`
- Implements `handleContentInsert()` callback
- Connects LLMChatSection and NoteSection via refs and callbacks

## Usage

### For Users

1. View AI assistant response in LLMChat
2. Click on any section (heading, paragraph, code block, etc.)
3. Content is automatically inserted into the note editor at cursor position
4. Editor is automatically focused

### For Developers

#### Adding New Section Types

1. Add type to `SectionType` in `types/content-insertion.ts`
2. Add transformation logic in `utils/content-transformer.ts`
3. Ensure MarkdownRenderer wraps the element in `SelectableWrapper`

#### Customizing Insertion Behavior

Modify `NoteTaker.insertContent()` to change:
- Insertion position (cursor vs end)
- Content formatting
- View switching behavior
- Focus behavior

## Technical Details

### Content Extraction

MarkdownRenderer extracts plain text from React nodes recursively:
- Handles strings, numbers, arrays, and React elements
- Preserves text content but loses markdown structure
- Transformer reconstructs markdown based on section type

### Content Transformation

The transformer uses section type to add appropriate markdown syntax:
- Ensures proper formatting
- Handles edge cases (already formatted content)
- Preserves content while adding structure

### Editor Integration

TipTap editor supports markdown insertion via:
- `editor.commands.insertContent(markdown, { parseOptions })`
- Automatically parses markdown into editor document structure
- Preserves formatting (headings, code blocks, tables, etc.)

### Error Handling

- Validates editor is ready before insertion
- Validates content is not empty
- Falls back to appending at end if cursor insertion fails
- Logs warnings/errors to console
- Gracefully handles edge cases

## Future Enhancements

Potential improvements:
1. **Multi-select**: Select multiple sections with modifier keys
2. **Insertion preview**: Show preview before inserting
3. **Undo/redo**: Better integration with editor undo stack
4. **Formatting options**: Let users choose formatting style
5. **Position options**: Insert at specific positions (start, end, after selection)
6. **Batch insertion**: Insert multiple sections at once

## Files Modified

- `types/content-insertion.ts` (new)
- `utils/content-transformer.ts` (new)
- `components/MarkdownRenderer.tsx` (documentation)
- `components/LLMChat.tsx` (handler + props)
- `components/LLMChatSection.tsx` (callback passthrough)
- `components/note-taker.tsx` (imperative handle)
- `components/NoteSection.tsx` (ref forwarding)
- `App.tsx` (coordination)

## Testing

To test the feature:
1. Start the application
2. Open a note
3. Send a message to the AI assistant
4. Wait for response
5. Click on any section in the response
6. Verify content is inserted into the note editor
7. Verify editor is focused
8. Verify formatting is preserved

## Notes

- Content is inserted at cursor position by default
- If no cursor, content is appended to end
- Editor view is automatically switched if in markdown view
- All markdown elements are clickable (headings, paragraphs, code, tables, lists, etc.)
- Math expressions are preserved during insertion
- Table structure is maintained



