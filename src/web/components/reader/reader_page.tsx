import React, { useMemo, useState, useEffect, useRef } from "react";
import { ScreenCapture } from "react-screen-capture";
import { ReaderSection } from "./reader_section";
import ReaderTabs, { ReaderTabItem } from "./reader_tabs";
import { SelectionRect } from "./pdf_selection_overlay";
import { 
	loadTabsFromStorage, 
	saveTabsToStorage, 
	loadActiveTabFromStorage, 
	saveActiveTabToStorage,
	clearTabsFromStorage
} from "../../../utils/tabPersistence";

type ReaderTabState = ReaderTabItem & {
	file?: File | Blob | string;
};

/**
 * Entire reader experience with tabs, toolbar (future), and PDF viewer
 */
const buildTabId = () => `tab-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export const ReaderPage: React.FC = () => {
	const [tabs, setTabs] = useState<ReaderTabState[]>(() => {
		// Try to load from localStorage first
		const savedTabs = loadTabsFromStorage();
		return savedTabs; // Remove fallback default tab
	});
	
	const [activeTabId, setActiveTabId] = useState<string>(() => {
		// Try to load active tab from localStorage
		const savedActiveTab = loadActiveTabFromStorage();
		if (savedActiveTab && tabs.some(tab => tab.id === savedActiveTab)) {
			return savedActiveTab;
		}
		// Fallback to first tab
		return tabs[0]?.id ?? ;
	});

	// Selection state management
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [currentSelection, setCurrentSelection] = useState<SelectionRect | null>(null);
	const [capturedImage, setCapturedImage] = useState<string>('');
	const [lastSavedFilename, setLastSavedFilename] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const readerSectionRef = useRef<HTMLDivElement>(null);

	const activeTab = useMemo(
		() => tabs.find(tab => tab.id === activeTabId) ?? tabs[0],
		[tabs, activeTabId]
	);

	// Save tabs to localStorage whenever tabs change
	useEffect(() => {
		saveTabsToStorage(tabs);
	}, [tabs]);

	// Save active tab to localStorage whenever activeTabId changes
	useEffect(() => {
		if (activeTabId) {
			saveActiveTabToStorage(activeTabId);
		}
	}, [activeTabId]);

	const handleTabSelect = (id: string) => {
		setActiveTabId(id);
	};

	const handleAddTab = () => {
		// Create a hidden file input element
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'application/pdf';
		fileInput.style.display = 'none';
		
		fileInput.onchange = (event) => {
			const target = event.target as HTMLInputElement;
			const file = target.files?.[0];
			
			if (file) {
				const newId = buildTabId();
				const newTab: ReaderTabState = {
					id: newId,
					title: file.name,
					file: file
				};
				
				setTabs(prev => [...prev, newTab]);
				setActiveTabId(newId);
			}
			
			// Clean up the temporary input element
			document.body.removeChild(fileInput);
		};
		
		// Add to DOM temporarily and trigger click
		document.body.appendChild(fileInput);
		fileInput.click();
	};

	const handleFileChange = (tabId: string, file?: File) => {
		if (!tabId || !file) return;
		setTabs(prev => prev.map(tab => {
			if (tab.id !== tabId) return tab;
			return {
				...tab,
				file,
				title: file.name || tab.title,
			};
		}));
	};

	const handleCloseTab = (tabId: string) => {
		setTabs(prev => {
			const newTabs = prev.filter(tab => tab.id !== tabId);
			return newTabs;
		});
		
		// If we're closing the active tab, switch to another tab or clear activeTabId
		if (activeTabId === tabId) {
			setTabs(prev => {
				const remainingTabs = prev.filter(tab => tab.id !== tabId);
				if (remainingTabs.length > 0) {
					setActiveTabId(remainingTabs[0].id);
				} else {
					setActiveTabId();
				}
				return remainingTabs;
			});
		}
	};

	const handleClearAllTabs = () => {
		clearTabsFromStorage();
		setTabs([]);
		setActiveTabId();
	};

	// Screen capture handlers
	const handleScreenCapture = (screenCapture: string): void => {
		setCapturedImage(screenCapture);
		
		// Automatically save the captured image
		if (screenCapture) {
			setIsSaving(true);
			try {
				// Generate filename based on PDF name and timestamp
				const pdfName = activeTab?.title?.replace(/\.pdf$/i, '') || 'pdf';
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
				const filename = `${pdfName}-capture-${timestamp}.png`;
				
				// Create download link
				const link = document.createElement('a');
				link.href = screenCapture;
				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				
				// Update state to show success
				setLastSavedFilename(filename);
				
				// Clear the success message after 3 seconds
				setTimeout(() => {
					setLastSavedFilename(null);
				}, 3000);
				
			} catch (error) {
				console.error('Failed to auto-save screenshot:', error);
			} finally {
				setIsSaving(false);
			}
		}
	};

	// Legacy selection handler (for compatibility with existing overlay)
	const handleSelection = (selection: SelectionRect) => {
		setCurrentSelection(selection);
		console.log('Selection made:', selection);
	};

	const handleClearSelection = () => {
		setCurrentSelection(null);
	};

	const toggleSelectionMode = () => {
		setIsSelectionMode(prev => !prev);
		if (isSelectionMode) {
			setCurrentSelection(null);
		}
	};


	const handlePreviewScreenshot = () => {
		if (!capturedImage) {
			alert('No captured image to preview. Please capture a screenshot first.');
			return;
		}

		// Create a new window to display the screenshot
		const newWindow = window.open();
		if (newWindow) {
			newWindow.document.write(`
				<html>
					<head><title>Screenshot Preview</title></head>
					<body style="margin: 0; padding: 20px; background: #f5f5f5;">
						<h2>Screenshot Preview</h2>
						<img src="${capturedImage}" style="max-width: 100%; border: 1px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
						<p style="margin-top: 20px; color: #666;">
							Captured screenshot from PDF viewer
						</p>
					</body>
				</html>
			`);
		}
	};

	return (
		<ScreenCapture onEndCapture={handleScreenCapture}>
			{({ onStartCapture }) => (
				<div style={{ 
					display: "flex", 
					flexDirection: "column", 
					height: "100%",
					overflow: 'hidden' // Prevent the entire reader from scrolling
				}}>
					{/* Fixed header with tabs */}
					<div style={{ flexShrink: 0 }}>
						<ReaderTabs
							tabs={tabs}
							activeTabId={activeTabId}
							onSelect={handleTabSelect}
							onAdd={handleAddTab}
							onClose={handleCloseTab}
						/>
					</div>

					{/* Fixed toolbar - only show when tabs exist */}
					{tabs.length > 0 && (
						<div style={{ 
							padding: '8px 16px', 
							borderBottom: '1px solid #e0e0e0',
							display: 'flex',
							gap: '8px',
							alignItems: 'center',
							flexShrink: 0 // Prevent toolbar from shrinking
						}}>
							<button
								onClick={onStartCapture}
								style={{
									padding: '6px 12px',
									border: '1px solid #28a745',
									borderRadius: '4px',
									background: '#28a745',
									color: '#fff',
									cursor: 'pointer',
									fontSize: '14px',
									transition: 'all 0.2s ease'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = '#218838';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = '#28a745';
								}}
							>
								📸 Capture Screenshot
							</button>

							{capturedImage && (
								<button
									onClick={handlePreviewScreenshot}
									style={{
										padding: '6px 12px',
										border: '1px solid #007bff',
										borderRadius: '4px',
										background: '#007bff',
										color: '#fff',
										cursor: 'pointer',
										fontSize: '14px',
										transition: 'all 0.2s ease'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = '#0056b3';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = '#007bff';
									}}
								>
									👁️ Preview Screenshot
								</button>
							)}

							{isSaving && (
								<div style={{ 
									fontSize: '12px', 
									color: '#007acc',
									marginLeft: '8px',
									fontWeight: '500'
								}}>
									💾 Auto-saving...
								</div>
							)}

							{lastSavedFilename && (
								<div style={{ 
									fontSize: '12px', 
									color: '#28a745',
									marginLeft: '8px',
									fontWeight: '500'
								}}>
									✅ Saved: {lastSavedFilename}
								</div>
							)}
						</div>
					)}

					{/* Scrollable PDF content area */}
					<div ref={readerSectionRef} style={{ 
						flex: 1,
						overflow: 'auto', // Only the PDF content area should scroll
						minHeight: 0 // Important for flexbox to work properly
					}}>
						{tabs.length === 0 ? (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
								padding: '40px',
								textAlign: 'center',
								background: '#fafafa'
							}}>
								<div style={{
									fontSize: '48px',
									marginBottom: '16px',
									opacity: 0.6
								}}>
									📄
								</div>
								<h2 style={{
									fontSize: '24px',
									fontWeight: '500',
									color: '#333',
									margin: '0 0 8px 0'
								}}>
									No PDF files loaded
								</h2>
								<p style={{
									fontSize: '16px',
									color: '#666',
									margin: '0 0 24px 0',
									maxWidth: '400px',
									lineHeight: '1.5'
								}}>
									Click the button below to open a PDF file and start taking notes
								</p>
								<button
									onClick={handleAddTab}
									style={{
										padding: '12px 24px',
										fontSize: '16px',
										fontWeight: '500',
										border: '2px solid #007bff',
										borderRadius: '8px',
										background: '#007bff',
										color: '#fff',
										cursor: 'pointer',
										transition: 'all 0.2s ease',
										boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = '#0056b3';
										e.currentTarget.style.borderColor = '#0056b3';
										e.currentTarget.style.transform = 'translateY(-1px)';
										e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = '#007bff';
										e.currentTarget.style.borderColor = '#007bff';
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
									}}
								>
									📁 Open PDF file
								</button>
							</div>
						) : (
							<ReaderSection
								file={activeTab?.file}
								onFileChange={file => handleFileChange(activeTab?.id ?? , file)}
								showFileInput={false}
								isSelectionMode={isSelectionMode}
								onSelection={handleSelection}
								onClearSelection={handleClearSelection}
								currentSelection={currentSelection}
							/>
						)}
					</div>
				</div>
			)}
		</ScreenCapture>
	);
};
