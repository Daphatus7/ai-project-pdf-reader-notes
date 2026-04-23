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
			className="flex items-center justify-center h-9 w-full px-4 rounded-lg border border-[#ececec] bg-transparent text-sm font-medium text-[#0f172a] hover:border-[#0fa478] hover:text-[#0fa478] transition-colors"
		>
			{t.pricing.getStartedFree}
		</Link>
	);

	return (
		<section id="pricing" className="w-full bg-[#fafaf7] px-4 py-24">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-14">
					<p className="text-[#0fa478] text-xs font-medium tracking-widest uppercase mb-6">
						Pricing
					</p>
					<h2 className="font-semibold text-3xl md:text-5xl text-[#0f172a] tracking-tight mb-4">
						{t.pricing.heading}
					</h2>
					<p className="text-base text-[#6b7280] max-w-sm mx-auto">
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
