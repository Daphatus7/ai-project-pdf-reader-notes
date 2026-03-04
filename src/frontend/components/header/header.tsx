import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button.tsx";
import {
	User,
	LogIn,
	LogOut,
	CreditCard,
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
import { SubscriptionDialog } from "@/frontend/features/user/SubscriptionDialog.tsx";
import { useAuth } from "@/frontend/features/auth";
import { useQuota } from "@/frontend/features/quota/use-quota";

export function Header() {

	const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeovhE8I9CxKiTGm3Y97c3rNAkuKMSq7UeYnMLKKumXQ_-8Xw/viewform?usp=dialog";
	const [pricingOpen, setPricingOpen] = useState(false);
	const [subscriptionOpen, setSubscriptionOpen] = useState(false);
	const { user, signOut } = useAuth();
	const { quota } = useQuota();
	const isPro = quota?.plan === 'pro';
	const navigate = useNavigate();

	const handleLogin = () => {
		navigate("/login");
	};

	const handleLogout = async () => {
		await signOut();
		navigate("/");
	};

	return (
		<header className=" backdrop-blur px-6 py-2 flex items-center justify-between ml-1 mr-1">
			<div className="flex items-center gap-2 ml-2">
				<img src="/logo.svg" alt="Atlas Notebook AI Logo" className="h-8" />
			</div>

			<div className="flex items-center gap-2 mr-2">
				{/* Show Pro badge when on Pro plan, otherwise show Upgrade button */}
				{isPro ? (
					<span className="text-xs font-semibold rounded-full bg-accent border ">
						Pro
					</span>
				) : (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setPricingOpen(true)}
						className="text-xs h-8 px-3"
					>
						<CreditCard className="w-4 h-4" />
						Upgrade
					</Button>
				)}

				{/* Direct feedback link shown in header */}
				<Button
					variant="ghost"
					size="sm"
					onClick={() => window.open(FEEDBACK_FORM_URL, '_blank')}
					className="text-xs h-8 px-3"
				>
					Feedback
				</Button>
				
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<User className="w-4 h-4 " />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{user ? (
							<>
								<DropdownMenuLabel>{user.email}</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => setSubscriptionOpen(true)}>
									Manage Subscription
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut className="w-4 h-4 mr-2" />
									Logout
								</DropdownMenuItem>
							</>
						) : (
							<>
								<DropdownMenuLabel>My Account</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogin}>
									<LogIn className="w-4 h-4 mr-2" />
									Login / Sign Up
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
			<SubscriptionDialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
		</header>
	);
}
