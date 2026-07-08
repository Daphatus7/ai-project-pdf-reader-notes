import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button.tsx";
import {
	User,
	LogIn,
	LogOut,
	CreditCard,
	Mail,
	Moon,
	Sun,
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
import { useLanguage } from "@/frontend/i18n/language-context";

export function Header() {

	const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeovhE8I9CxKiTGm3Y97c3rNAkuKMSq7UeYnMLKKumXQ_-8Xw/viewform?usp=dialog";
	const [pricingOpen, setPricingOpen] = useState(false);
	const [subscriptionOpen, setSubscriptionOpen] = useState(false);
	const { user, signOut } = useAuth();
	const { quota } = useQuota();
	const isPro = quota?.plan === 'pro';
	const navigate = useNavigate();
	const { t } = useLanguage();

	/* Dark mode toggle state — reads current class on mount */
	const [isDark, setIsDark] = useState<boolean>(
		document.documentElement.classList.contains("dark")
	);
	const toggleTheme = () => {
		const next = !isDark;
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("theme", next ? "dark" : "light");
		setIsDark(next);
	};

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

			<div className="flex items-center gap-1 mr-1">
				{/* Show Pro badge when on Pro plan, otherwise show Upgrade button */}
				{isPro ? (
					<span className="text-xs font-semibold  ">
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
						{t.header.upgrade}
					</Button>
				)}

				{/* Direct feedback link shown in header */}
				<Button
					variant="ghost"
					size="sm"
					onClick={() => window.open(FEEDBACK_FORM_URL, '_blank')}
					className="text-xs h-8 px-3"
				>
					{t.header.feedback}
				</Button>

				{/* Dark / light mode toggle */}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={toggleTheme}
					aria-label={isDark ? t.header.switchToLight : t.header.switchToDark}
				>
					{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
									{t.header.manageSubscription}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								{/* Contact via email */}
								<DropdownMenuItem onClick={() => window.location.href = 'mailto:support.atlasnotebook@gmail.com'}>
									<Mail className="w-4 h-4 mr-2" />
									{t.header.contact}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut className="w-4 h-4 mr-2" />
									{t.header.logout}
								</DropdownMenuItem>
							</>
						) : (
							<>
								<DropdownMenuLabel>{t.header.myAccount}</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{/* Contact via email */}
								<DropdownMenuItem onClick={() => window.location.href = 'mailto:example@example.com'}>
									<Mail className="w-4 h-4 mr-2" />
									{t.header.contactUs}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogin}>
									<LogIn className="w-4 h-4 mr-2" />
									{t.header.loginSignUp}
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
