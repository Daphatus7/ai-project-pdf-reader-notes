import { get, post } from '../core/client';
import { apiConfig } from '../core/config';

export interface SubscriptionData {
	plan: string;
	subscription_status: string | null;
	plan_interval: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
}

export async function getSubscription(): Promise<SubscriptionData> {
	return get<SubscriptionData>(apiConfig.endpoints.billing.subscription);
}

export async function resumeSubscription(): Promise<void> {
	await post(apiConfig.endpoints.billing.resume, {});
}

export async function getCheckoutUrl(interval: 'month' | 'year'): Promise<string> {
	const data = await get<{ checkout_url: string }>(
		`${apiConfig.endpoints.billing.checkout}?interval=${interval}`
	);
	return data.checkout_url;
}

export async function createPortalSession(returnUrl: string): Promise<string> {
	const data = await post<{ portal_url: string }>(
		apiConfig.endpoints.billing.portal,
		{ return_url: returnUrl }
	);
	return data.portal_url;
}
