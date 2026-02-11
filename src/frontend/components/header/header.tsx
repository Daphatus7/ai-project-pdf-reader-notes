import { useState } from "react";
import { Button } from "../ui/button.tsx";
import {
	FileText,
	Settings,
	User,
	LogIn,
	CreditCard, LucideMail
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import {PricingDialog} from "@/frontend/features/pricing/PricingDialog.tsx";

export function Header() {
	const [pricingOpen, setPricingOpen] = useState(false);

	return (
		<header className=" backdrop-blurpx-6 py-2 flex items-center justify-between ml-2 mr-2">
			<div className="flex items-center gap-2 ml-2"
			>
				<img src="/logo.svg" alt="Atlas Notebook AI Logo" className="h-8" />
			</div>

			<div className="flex items-center gap-2 mr-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setPricingOpen(true)}
					className="text-xs h-8 px-3"
				>
					<CreditCard className="w-4 h-4" />
					Upgrade
				</Button>

				<Button variant="ghost" size="icon" className="h-8 w-8">
					<LucideMail className="w-4 h-4 mr-2" />
				</Button>

				<Button variant="ghost" size="icon" className="h-8 w-8">
					<img className="w-4 h-4 mr-2" src="public/discord-logo.svg"
					 alt="discord portal"/>
				</Button>
				
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<Settings className="w-4 h-4 " />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Settings</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							API Key Configuration
						</DropdownMenuItem>
						<DropdownMenuItem>
							Preferences
						</DropdownMenuItem>
						<DropdownMenuItem>
							Export Settings
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<User className="w-4 h-4 " />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>My Account</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<LogIn className="w-4 h-4 mr-2" />
							Login / Sign Up
						</DropdownMenuItem>
						<DropdownMenuItem>
							Profile Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							Logout
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</header>
	);
}
