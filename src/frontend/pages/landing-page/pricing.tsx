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
			className="flex items-center justify-center h-9 w-full px-4 rounded-md border border-input bg-panel text-sm font-medium text-foreground hover:border-[#006aff] hover:text-[#006aff] transition-colors mb-8"
		>
			{t.pricing.getStartedFree}
		</Link>
	);

	return (
		<section id="pricing" className="w-full px-4 py-20">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="font-bold text-4xl md:text-5xl text-foreground mb-4">
						{t.pricing.heading}
					</h2>
					<p className="text-lg text-muted-foreground">
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
