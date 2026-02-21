import { useState, useEffect, useCallback } from 'react';
import { getSubscription, type SubscriptionData } from '../../api/services/billing.service';

export function useSubscription() {
	const [data, setData] = useState<SubscriptionData | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getSubscription();
			setData(result);
		} catch (err) {
			console.error('[useSubscription] Failed to fetch subscription:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { data, loading, refresh };
}
