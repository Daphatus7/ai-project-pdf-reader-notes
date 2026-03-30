import { Link, useNavigate } from "react-router-dom";
import { PricingCards } from "../../features/pricing/PricingCards.tsx";
import { usePayment } from "../../features/pricing/usePayment.ts";
import { useLanguage } from "../../i18n/language-context.tsx";

export default function PricingSection() {
	const navigate = useNavigate();
	const { t } = useLanguage();

	const { startCheckout } = usePayment({
		onNeedsAuth: () => navigate('/signup'),
	});

	const freeAction = (
		<Link
			to="/signup"
			className="flex items-center justify-center h-9 w-full px-4 rounded-lg border border-border bg-transparent text-sm font-medium text-foreground hover:border-[#006aff] hover:text-[#006aff] transition-colors"
		>
			{t.pricing.getStartedFree}
		</Link>
	);

	return (
		<section id="pricing" className="w-full px-4 py-24">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-14">
					{/* Eyebrow label */}
					<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
						Pricing
					</p>
					<h2 className="font-semibold text-3xl md:text-4xl text-foreground mb-3">
						{t.pricing.heading}
					</h2>
					<p className="text-base text-muted-foreground max-w-sm mx-auto">
						{t.pricing.subheading}
					</p>
				</div>

				<PricingCards
					onSelectMonthly={() => startCheckout('month')}
					onSelectYearly={() => startCheckout('year')}
					freeAction={freeAction}
				/>
			</div>
		</section>
	);
}
