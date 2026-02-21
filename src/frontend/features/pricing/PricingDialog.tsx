import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { PricingCards } from "./PricingCards.tsx";
import { usePayment } from "./usePayment.ts";
import { registerViaApi, loginViaApi } from "../../api/services/auth.service.ts";

interface PricingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type View = 'plans' | 'auth' | 'redirecting';
type AuthTab = 'register' | 'login';

export function PricingDialog({ open, onOpenChange }: PricingDialogProps) {
	const [view, setView] = useState<View>('plans');
	const [pendingInterval, setPendingInterval] = useState<'month' | 'year'>('month');
	const [authTab, setAuthTab] = useState<AuthTab>('register');

	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [authError, setAuthError] = useState<string | null>(null);
	const [authLoading, setAuthLoading] = useState(false);

	const { startCheckout, redirectToCheckout } = usePayment({
		onNeedsAuth: (interval) => {
			setPendingInterval(interval);
			setView('auth');
		},
	});

	const resetAuth = () => {
		setEmail('');
		setUsername('');
		setPassword('');
		setAuthError(null);
		setAuthLoading(false);
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			setView('plans');
			resetAuth();
		}
		onOpenChange(open);
	};

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);
		setAuthLoading(true);
		try {
			if (authTab === 'register') {
				await registerViaApi({ email, username, password });
			}
			await loginViaApi(email, password);
			setView('redirecting');
			await redirectToCheckout(pendingInterval);
		} catch (err) {
			setAuthError(err instanceof Error ? err.message : 'Something went wrong');
			setAuthLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">

				{/* ── Plans view ── */}
				{view === 'plans' && (
					<>
						<DialogHeader className="mb-6">
							<DialogTitle className="text-center text-xl sm:text-2xl">
								Unlock Your Full Potential
							</DialogTitle>
							<DialogDescription className="text-center text-sm mt-1">
								Start for free. Upgrade when you're ready to work without limits.
							</DialogDescription>
						</DialogHeader>

						<PricingCards
							onSelectMonthly={() => startCheckout('month')}
							onSelectYearly={() => startCheckout('year')}
						/>

						<p className="text-xs text-muted-foreground text-center mt-6">
							All plans include end-to-end encryption and automatic backups.
						</p>
					</>
				)}

				{/* ── Auth view ── */}
				{view === 'auth' && (
					<>
						<DialogHeader>
							<DialogTitle className="text-center text-xl">
								{authTab === 'register' ? 'Create your account' : 'Sign in to continue'}
							</DialogTitle>
							<DialogDescription className="text-center text-sm mt-1">
								{authTab === 'register'
									? 'One quick step before checkout'
									: 'Welcome back — sign in to complete your upgrade'}
							</DialogDescription>
						</DialogHeader>

						<div className="flex rounded-lg border border-border overflow-hidden mt-4">
							<button
								className={`flex-1 py-2 text-sm font-medium transition-colors ${authTab === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
								onClick={() => { setAuthTab('register'); setAuthError(null); }}
							>
								Create account
							</button>
							<button
								className={`flex-1 py-2 text-sm font-medium transition-colors ${authTab === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
								onClick={() => { setAuthTab('login'); setAuthError(null); }}
							>
								Sign in
							</button>
						</div>

						<form className="space-y-4 mt-4" onSubmit={handleAuth}>
							{authError && (
								<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
									{authError}
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="auth-email">Email</Label>
								<Input
									id="auth-email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={authLoading}
								/>
							</div>

							{authTab === 'register' && (
								<div className="space-y-2">
									<Label htmlFor="auth-username">Username</Label>
									<Input
										id="auth-username"
										type="text"
										placeholder="johndoe"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required
										disabled={authLoading}
									/>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="auth-password">Password</Label>
								<Input
									id="auth-password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={authLoading}
								/>
							</div>

							<Button type="submit" className="w-full" disabled={authLoading}>
								{authLoading
									? <><Loader2 className="size-4 mr-2 animate-spin" />Please wait…</>
									: authTab === 'register' ? 'Create account & continue' : 'Sign in & continue'
								}
							</Button>
						</form>

						<button
							className="text-xs text-muted-foreground hover:text-foreground text-center w-full mt-3 transition-colors"
							onClick={() => { setView('plans'); resetAuth(); }}
						>
							← Back to plans
						</button>
					</>
				)}

				{/* ── Redirecting view ── */}
				{view === 'redirecting' && (
					<div className="flex flex-col items-center justify-center py-16 gap-4">
						<Loader2 className="size-10 animate-spin text-primary" />
						<p className="text-sm text-muted-foreground">Redirecting to checkout…</p>
					</div>
				)}

			</DialogContent>
		</Dialog>
	);
}
