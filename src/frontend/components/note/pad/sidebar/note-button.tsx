import {type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {Button} from "../../../ui/button.tsx";
import {PanelRight} from "lucide-react";

const AUTO_CLOSE_DELAY = 5000;

interface NoteButtonProps {
	children: ReactNode;
}

export function NoteButton({children}: NoteButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cancelAutoClose = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const startAutoClose = useCallback(() => {
		cancelAutoClose();
		timerRef.current = setTimeout(() => setIsOpen(false), AUTO_CLOSE_DELAY);
	}, [cancelAutoClose]);

	useEffect(() => () => cancelAutoClose(), [cancelAutoClose]);

	const toggle = () => {
		setIsOpen(prev => {
			if (!prev) cancelAutoClose();
			return !prev;
		});
	};

	return (
		<div
			className="relative"
			onMouseEnter={cancelAutoClose}
			onMouseLeave={startAutoClose}
		>
			<Button variant="ghost" size="icon" onClick={toggle}>
				<PanelRight className="w-4 h-4"/>
			</Button>

			{isOpen && (
				<div className="absolute right-0 top-full mt-1 w-[280px] h-[400px] z-50 bg-background border rounded-lg shadow-lg flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
					{children}
				</div>
			)}
		</div>
	);
}
