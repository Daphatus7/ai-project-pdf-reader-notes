import { Link, useNavigate } from "react-router-dom";
import { PricingCards } from "../../features/pricing/PricingCards.tsx";
import { usePayment } from "../../features/pricing/usePayment.ts";
import pricingData from "./pricing.json";

export default function PricingSection() {
	const navigate = useNavigate();

	const { startCheckout } = usePayment({
		onNeedsAuth: () => navigate('/signup'),
	});

	const freeAction = (
		<Link
			to="/signup"
			className="block text-center py-2.5 px-6 rounded-xl border-2 border-border text-foreground font-medium hover:border-[#006aff] hover:text-[#006aff] transition-colors mb-8"
		>
			Get started free
		</Link>
	);

	return (
		<section id="pricing" className="w-full px-4 py-20">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="font-bold text-4xl md:text-5xl text-foreground mb-4">
						{pricingData.heading}
					</h2>
					<p className="text-lg text-muted-foreground">
						{pricingData.subheading}
					</p>
				</div>

				<PricingCards
					onSelectMonthly={() => startCheckout('month')}
					onSelectYearly={() => startCheckout('year')}
					freeAction={freeAction}
				/>

				<p className="text-sm text-muted-foreground text-center mt-10">
					All plans include end-to-end encryption, automatic backups, and version history.
				</p>
			</div>
		</section>
	);
}
