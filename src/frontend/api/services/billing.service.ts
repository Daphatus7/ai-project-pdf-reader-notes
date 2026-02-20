import { get, post } from '../core/client';
import { apiConfig } from '../core/config';

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
