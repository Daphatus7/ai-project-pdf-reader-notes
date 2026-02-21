import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { useSubscription } from './useSubscription.ts';
import { createPortalSession, resumeSubscription } from '../../api/services/billing.service.ts';
import { PricingDialog } from '../pricing/PricingDialog.tsx';

interface SubscriptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string | null): string {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function SubscriptionDialog({ open, onOpenChange }: SubscriptionDialogProps) {
	const { data, loading, refresh } = useSubscription();
	const [pricingOpen, setPricingOpen] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);

	const handleManage = async () => {
		setActionLoading(true);
		try {
			const url = await createPortalSession(window.location.href);
			window.location.href = url;
		} finally {
			setActionLoading(false);
		}
	};

	const handleResume = async () => {
		setActionLoading(true);
		try {
			await resumeSubscription();
			await refresh();
		} finally {
			setActionLoading(false);
		}
	};

	const isPro = data?.plan === 'pro';
	const isCancelling = isPro && data?.cancel_at_period_end;
	const dateLabel = isCancelling
		? `Cancels on ${formatDate(data?.current_period_end ?? null)}`
		: `Renews on ${formatDate(data?.current_period_end ?? null)}`;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Current Plan</DialogTitle>
					</DialogHeader>

					{loading ? (
						<div className="flex justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : isPro ? (
						<div className="space-y-4 pt-1">
							<div>
								<p className="text-2xl font-semibold">
									Pro · {data?.plan_interval === 'year' ? 'Yearly' : 'Monthly'}
								</p>
								{data?.current_period_end && (
									<p className={`text-sm mt-1 ${isCancelling ? 'text-destructive' : 'text-muted-foreground'}`}>
										{dateLabel}
									</p>
								)}
							</div>

							{isCancelling ? (
								<Button className="w-full" disabled={actionLoading} onClick={handleResume}>
									{actionLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
									Resume subscription
								</Button>
							) : (
								<Button variant="outline" className="w-full" disabled={actionLoading} onClick={handleManage}>
									{actionLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
									Manage subscription
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-4 pt-1">
							<div>
								<p className="text-2xl font-semibold">Free</p>
								<p className="text-sm text-muted-foreground mt-1">Forever free · No card required</p>
							</div>
							<Button
								className="w-full text-white"
								style={{ backgroundImage: 'linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)' }}
								onClick={() => { onOpenChange(false); setPricingOpen(true); }}
							>
								Upgrade to Pro
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</>
	);
}
