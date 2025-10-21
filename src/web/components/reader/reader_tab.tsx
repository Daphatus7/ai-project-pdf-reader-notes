import React, { useState } from "react";
import {ReaderTabType} from "./reader_data_structure";
import {ReaderTabItem} from "./reader_tabs";



interface ReaderTabProps extends ReaderTabItem {
	onClose?: (id: string) => void;
}

/**
 * Visual wrapper for a single reader tab label - Essentially a tab button
 * 
 */
const ReaderTab: React.FC<ReaderTabProps> = ({title, readerTabType, id, onClose }) => {
	const [isHovered, setIsHovered] = useState(false);
	
	if (readerTabType === ReaderTabType.NEW) {
		return (
			<div
				style={{
					padding: "6px 12px",
					borderRadius: "6px 6px 0 0",
					fontSize: 16,
					fontWeight: 400,
					color: "#666",
					background: "#f8f8f8",
					border: "1px solid #e0e0e0",
					borderBottom: "1px solid #f5f5f5",
					minWidth: 40,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					transition: "all 0.2s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#e8e8e8";
					e.currentTarget.style.color = "#333";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "#f8f8f8";
					e.currentTarget.style.color = "#666";
				}}
			>
				+
			</div>
		);
	}
	else if (readerTabType === ReaderTabType.ACTIVE) {
		return (
			<div
				style={{
					padding: "8px 16px",
					borderRadius: "8px 8px 0 0",
					fontSize: 14,
					fontWeight: 500,
					color: "#333",
					background: "#ffffff",
					border: "1px solid #d0d0d0",
					borderBottom: "2px solid #007acc",
					maxWidth: 200,
					minWidth: 80,
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					position: "relative",
					zIndex: 1,
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
					{title}
				</span>
				{isHovered && onClose && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClose(id);
						}}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "2px",
							borderRadius: "2px",
							color: "#666",
							fontSize: "12px",
							lineHeight: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: "16px",
							height: "16px",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#ff4444";
							e.currentTarget.style.color = "#fff";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "none";
							e.currentTarget.style.color = "#666";
						}}
					>
						×
					</button>
				)}
			</div>
		);
	}
	else {
		return (
			<div
				style={{
					padding: "8px 16px",
					borderRadius: "8px 8px 0 0",
					fontSize: 14,
					fontWeight: 400,
					color: "#666",
					background: "#f5f5f5",
					border: "1px solid #d0d0d0",
					borderBottom: "1px solid #d0d0d0",
					maxWidth: 200,
					minWidth: 80,
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					cursor: "pointer",
					transition: "all 0.2s ease",
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#e8e8e8";
					e.currentTarget.style.color = "#333";
					setIsHovered(true);
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "#f5f5f5";
					e.currentTarget.style.color = "#666";
					setIsHovered(false);
				}}
			>
				<span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
					{title}
				</span>
				{isHovered && onClose && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClose(id);
						}}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "2px",
							borderRadius: "2px",
							color: "#666",
							fontSize: "12px",
							lineHeight: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: "16px",
							height: "16px",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#ff4444";
							e.currentTarget.style.color = "#fff";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "none";
							e.currentTarget.style.color = "#666";
						}}
					>
						×
					</button>
				)}
			</div>
		);
	}
}
export default ReaderTab;
