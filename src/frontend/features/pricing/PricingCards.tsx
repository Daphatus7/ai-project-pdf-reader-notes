import { CheckCircle2, X, Zap } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import pricingData from "../../pages/landing-page/pricing.json";
import { useLanguage } from "../../i18n/language-context.tsx";

interface PricingCardsProps {
	onSelectMonthly: () => void;
	onSelectYearly: () => void;
	freeAction?: React.ReactNode;
}

export function PricingCards({ onSelectMonthly, onSelectYearly, freeAction }: PricingCardsProps) {
	const { t } = useLanguage();

	// Merge translated labels with the original `included` flags from pricing.json
	const freeFeatures = pricingData.free.map((item, i) => ({
		included: item.included,
		label: t.pricing.freeFeatures[i] ?? item.label,
	}));
	const monthlyFeatures = pricingData.monthly.map((item, i) => ({
		included: item.included,
		label: t.pricing.monthlyFeatures[i] ?? item.label,
	}));
	const yearlyFeatures = t.pricing.yearlyFeatures;

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">

			{/* Free */}
			<div className="bg-card rounded-2xl p-8 border border-border flex flex-col ">
				<div className="mb-6">
					<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Free</p>
					<div className="flex items-end gap-1 mb-1">
						<span className="text-5xl font-bold text-foreground">$0</span>
					</div>
					<p className="text-sm text-muted-foreground mt-1">{t.pricing.foreverFree}</p>
				</div>

				{freeAction ?? (
					<Button variant="outline" disabled className="mb-8">
						Current Plan
					</Button>
				)}

				<ul className="space-y-3 flex-1">
					{freeFeatures.map(({ included, label }) => (
						<li key={label} className="flex items-start gap-2.5">
							{included
								? <CheckCircle2 className="size-4 text-[#006aff] shrink-0 mt-0.5" />
								: <X className="size-4 text-border shrink-0 mt-0.5" />}
							<span className={`text-sm ${included ? "text-foreground" : "text-muted-foreground/60"}`}>
								{label}
							</span>
						</li>
					))}
				</ul>
			</div>

			{/* Monthly Pro */}
			<div className="bg-card rounded-2xl p-8 border-2 border-[#006aff] flex flex-col relative">
				<div className="absolute -top-4 left-1/2 -translate-x-1/2">
					<span className="bg-[#006aff] text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
						{t.pricing.mostPopular}
					</span>
				</div>

				<div className="mb-6">
					<p className="text-xs font-semibold uppercase tracking-widest text-[#006aff] mb-3">Pro Monthly</p>
					<div className="flex items-end gap-1 mb-1">
						<span className="text-5xl font-bold text-foreground">$15</span>
						<span className="text-muted-foreground pb-1.5 ml-1">/ month</span>
					</div>
					<p className="text-sm text-muted-foreground mt-1">{t.pricing.billedMonthly}</p>
				</div>

				<Button
					className="mb-8 text-white font-medium hover:opacity-90"
					style={{ backgroundImage: "linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)" }}
					onClick={onSelectMonthly}
				>
					{t.pricing.upgradeMonthly}
				</Button>

				<ul className="space-y-3 flex-1">
					{monthlyFeatures.map(({ label }) => (
						<li key={label} className="flex items-start gap-2.5">
							<CheckCircle2 className="size-4 text-[#006aff] shrink-0 mt-0.5" />
							<span className="text-sm text-foreground">{label}</span>
						</li>
					))}
				</ul>

				<p className="text-xs text-muted-foreground text-center mt-6">{t.pricing.cancelMonthly}</p>
			</div>

			{/* Yearly Pro */}
			<div
				className="rounded-2xl p-8 flex flex-col relative "
				style={{ backgroundImage: "linear-gradient(163.293deg, rgb(15, 23, 43) 0%, rgb(29, 41, 61) 55%, rgb(49, 44, 133) 100%)" }}
			>
				<div className="absolute -top-4 left-1/2 -translate-x-1/2">
					<span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1">
						<Zap className="size-3" /> {t.pricing.bestValue}
					</span>
				</div>

				<div className="mb-6 relative">
					<p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">Pro Yearly</p>
					<div className="flex items-end gap-1 mb-1">
						<span className="text-5xl font-bold text-white">$12.42</span>
						<span className="text-white/50 pb-1.5 ml-1">/ month</span>
					</div>
					<p className="text-sm text-white/60 mt-1">{t.pricing.billedYearly}</p>
				</div>

				<Button
					className="mb-8 relative bg-white text-[#1a1a2e] font-semibold hover:bg-white/90"
					onClick={onSelectYearly}
				>
					{t.pricing.upgradeYearly}
				</Button>

				<ul className="space-y-3 flex-1 relative">
					{yearlyFeatures.map((label) => (
						<li key={label} className="flex items-start gap-2.5">
							<CheckCircle2 className="size-4 text-green-400 shrink-0 mt-0.5" />
							<span className="text-sm text-white/80">{label}</span>
						</li>
					))}
				</ul>

				<p className="text-xs text-white/30 text-center mt-6 relative">{t.pricing.cancelYearly}</p>
			</div>

		</div>
	);
}
