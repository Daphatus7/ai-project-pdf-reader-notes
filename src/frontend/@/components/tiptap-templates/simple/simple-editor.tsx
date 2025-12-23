"use client"

import { useEffect, useRef, useState } from "react"
import {type Editor, EditorContent, EditorContext} from "@tiptap/react"

// --- UI Primitives ---
import { Button } from "@@/frontend/@/components/tiptap-ui-primitive/button"

import { Spacer } from "@@/frontend/@/components/tiptap-ui-primitive/spacer"
import {
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "@@/frontend/@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import "@@/frontend/@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@@/frontend/@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@@/frontend/@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@@/frontend/@/components/tiptap-node/list-node/list-node.scss"
import "@@/frontend/@/components/tiptap-node/image-node/image-node.scss"
import "@@/frontend/@/components/tiptap-node/heading-node/heading-node.scss"
import "@@/frontend/@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@@/frontend/@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@@/frontend/@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@@/frontend/@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@@/frontend/@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@@/frontend/@/components/tiptap-ui/code-block-button"
import {
	ColorHighlightPopover,
	ColorHighlightPopoverContent,
	ColorHighlightPopoverButton,
} from "@@/frontend/@/components/tiptap-ui/color-highlight-popover"
import {
	LinkPopover,
	LinkContent,
	LinkButton,
} from "@@/frontend/@/components/tiptap-ui/link-popover"
import { MarkButton } from "@@/frontend/@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@@/frontend/@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@@/frontend/@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@@/frontend/@/components/tiptap-icons/arrow-left-icon.tsx"
import { HighlighterIcon } from "@@/frontend/@/components/tiptap-icons/highlighter-icon.tsx"
import { LinkIcon } from "@@/frontend/@/components/tiptap-icons/link-icon.tsx"

// --- Hooks ---
import { useIsMobile } from "@@/frontend/@/hooks/use-mobile.ts"
import { useWindowSize } from "@@/frontend/@/hooks/use-window-size.ts"
import { useCursorVisibility } from "@@/frontend/@/hooks/use-cursor-visibility.ts"

// --- Components ---
import { ThemeToggle } from "@@/frontend/@/components/tiptap-templates/simple/theme-toggle.tsx"

// --- Styles ---
import "@@/frontend/@/components/tiptap-templates/simple/simple-editor.scss"



const MainToolbarContent = ({
								onHighlighterClick,
								onLinkClick,
								isMobile,
							}: {
	onHighlighterClick: () => void
	onLinkClick: () => void
	isMobile: boolean
}) => {
	return (
		<>
			<Spacer />

			<ToolbarGroup>
				<UndoRedoButton action="undo" />
				<UndoRedoButton action="redo" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
				<ListDropdownMenu
					types={["bulletList", "orderedList", "taskList"]}
					portal={isMobile}
				/>
				<BlockquoteButton />
				<CodeBlockButton />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="bold" />
				<MarkButton type="italic" />
				<MarkButton type="strike" />
				<MarkButton type="code" />
				<MarkButton type="underline" />
				{!isMobile ? (
					<ColorHighlightPopover />
				) : (
					<ColorHighlightPopoverButton onClick={onHighlighterClick} />
				)}
				{!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="superscript" />
				<MarkButton type="subscript" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<TextAlignButton align="left" />
				<TextAlignButton align="center" />
				<TextAlignButton align="right" />
				<TextAlignButton align="justify" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<ImageUploadButton text="Add" />
			</ToolbarGroup>

			<Spacer />

			{isMobile && <ToolbarSeparator />}

			<ToolbarGroup>
				<ThemeToggle />
			</ToolbarGroup>
		</>
	)
}

const MobileToolbarContent = ({
								  type,
								  onBack,
							  }: {
	type: "highlighter" | "link"
	onBack: () => void
}) => (
	<>
		<ToolbarGroup>
			<Button data-style="ghost" onClick={onBack}>
				<ArrowLeftIcon className="tiptap-button-icon" />
				{type === "highlighter" ? (
					<HighlighterIcon className="tiptap-button-icon" />
				) : (
					<LinkIcon className="tiptap-button-icon" />
				)}
			</Button>
		</ToolbarGroup>

		<ToolbarSeparator />

		{type === "highlighter" ? (
			<ColorHighlightPopoverContent />
		) : (
			<LinkContent />
		)}
	</>
)

export function SimpleEditor({ editor }: { editor: Editor }) {
	const isMobile = useIsMobile()
	const { height } = useWindowSize()
	const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
		"main"
	)
	const toolbarRef = useRef<HTMLDivElement>(null)

	const rect = useCursorVisibility({
		editor,
		overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
	})

	useEffect(() => {
		if (!isMobile && mobileView !== "main") {
			setMobileView("main")
		}
	}, [isMobile, mobileView])

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
			}}
			className="simple-editor-wrapper">
			<EditorContext.Provider value={{ editor }}>
				<Toolbar
					ref={toolbarRef}
					style={{
						...(isMobile
							? {
								bottom: `calc(100% - ${height - rect.y}px)`,
							}
							: {}),
					}}
				>
					{mobileView === "main" ? (
						<MainToolbarContent
							onHighlighterClick={() => setMobileView("highlighter")}
							onLinkClick={() => setMobileView("link")}
							isMobile={isMobile}
						/>
					) : (
						<MobileToolbarContent
							type={mobileView === "highlighter" ? "highlighter" : "link"}
							onBack={() => setMobileView("main")}
						/>
					)}
				</Toolbar>

				<EditorContent
					editor={editor}
					role="presentation"
					className="simple-editor-content"
				/>
			</EditorContext.Provider>
		</div>
	)
}
