import { useState } from 'react';
import { useAuth } from '../auth';
import { getCheckoutUrl } from '../../api/services/billing.service.ts';

interface UsePaymentOptions {
	onNeedsAuth: (interval: 'month' | 'year') => void;
}

export function usePayment({ onNeedsAuth }: UsePaymentOptions) {
	const { user } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const redirectToCheckout = async (interval: 'month' | 'year') => {
		setLoading(true);
		setError(null);
		try {
			const url = await getCheckoutUrl(interval);
			window.location.href = url;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start checkout');
			setLoading(false);
		}
	};

	const startCheckout = (interval: 'month' | 'year') => {
		if (user) {
			redirectToCheckout(interval);
		} else {
			onNeedsAuth(interval);
		}
	};

	return { startCheckout, redirectToCheckout, loading, error };
}
