import ReaderTab from "./reader_tab";
import React from "react";
import {ReaderTabType} from "./reader_data_structure";

export type ReaderTabItem = {
	id: string;
	title: string;
	readerTabType?: ReaderTabType;
	file?: File | Blob | string;
};


interface ReaderTabsProps {
	tabs: ReaderTabItem[];
	activeTabId?: string;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onClose: (id: string) => void;
}

/**
 * Tab strip for switching between PDF pages and creating new ones
 */
const ReaderTabs: React.FC<ReaderTabsProps> = ({ tabs, activeTabId, onSelect, onAdd, onClose }) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "4px",
				padding: "8px",
				borderBottom: "1px solid #d4d4d4",
				background: "#fafafa",
			}}
		>
			{tabs.map(tab => (
				<button
					key={tab.id}
					type="button"
					onClick={() => onSelect(tab.id)}
					style={{
						background: "transparent",
						border: "none",
						padding: 0,
						cursor: "pointer",
						outline: "none",
						flex: "0 0 auto",
					}}
				>
					<ReaderTab 
						readerTabType={tab.id === activeTabId ? ReaderTabType.ACTIVE : ReaderTabType.INACTIVE} 
						title={tab.title} 
						id={tab.id} 
						file={tab.file}
						onClose={onClose}
					/>
				</button>
			))}
			<button
				type="button"
				onClick={onAdd}
				style={{
					background: "transparent",
					border: "none",
					padding: 0,
					cursor: "pointer",
					outline: "none",
					flex: "0 0 auto",
				}}
			>
				<ReaderTab readerTabType={ReaderTabType.NEW} title= id= file={undefined}/>
			</button>
		</div>
	);
};

export default ReaderTabs;
