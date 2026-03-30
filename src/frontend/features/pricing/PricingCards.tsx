import { Check, Zap } from "lucide-react";
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
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto items-stretch">

			{/* ── Free — neutral, no-frills ── */}
			<div className="bg-card rounded-xl border border-border flex flex-col p-7">
				{/* Price block */}
				<div className="mb-7">
					<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
						Free
					</p>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-foreground leading-none">$0</span>
					</div>
					<p className="text-xs text-muted-foreground mt-2">{t.pricing.foreverFree}</p>
				</div>

				{/* CTA */}
				<div>
					{freeAction ?? (
						<Button variant="outline" disabled className="w-full text-sm h-9">
							Current Plan
						</Button>
					)}
				</div>

				{/* Feature list — separated by a rule */}
				<div className="border-t border-border mt-6 pt-6">
					<ul className="space-y-2.5">
						{freeFeatures.map(({ included, label }) => (
							<li key={label} className="flex items-start gap-2.5">
								{included ? (
									<Check className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
								) : (
									<span className="size-3.5 shrink-0 mt-0.5 flex items-center justify-center text-muted-foreground/30 text-sm leading-none select-none">
										–
									</span>
								)}
								<span className={`text-sm leading-snug ${included ? "text-foreground" : "text-muted-foreground/40"}`}>
									{label}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* ── Pro Monthly — inverted "featured" card (brand navy) ── */}
			<div className="rounded-xl flex flex-col p-7 bg-white border border-border">
				{/* Price block */}
				<div className="mb-7">
					<div className="flex items-center justify-between mb-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
							Pro
						</p>
						<span className="text-[11px] font-semibold bg-[#006aff] text-white px-2.5 py-1 rounded-md">
							{t.pricing.mostPopular}
						</span>
					</div>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-gray-900 leading-none">$15</span>
						<span className="text-gray-400 text-sm ml-1.5">/ mo</span>
					</div>
					<p className="text-xs text-gray-400 mt-2">{t.pricing.billedMonthly}</p>
				</div>

				{/* CTA — blue button */}
				<button
					className="w-full h-9 rounded-lg bg-[#006aff] text-white text-sm font-medium hover:bg-[#0055cc] transition-colors cursor-pointer"
					onClick={onSelectMonthly}
				>
					{t.pricing.upgradeMonthly}
				</button>

				{/* Feature list */}
				<div className="border-t border-gray-100 mt-6 pt-6">
					<ul className="space-y-2.5">
						{monthlyFeatures.map(({ label }) => (
							<li key={label} className="flex items-start gap-2.5">
								<Check className="size-3.5 text-[#006aff] shrink-0 mt-0.5" />
								<span className="text-sm leading-snug text-gray-700">{label}</span>
							</li>
						))}
					</ul>
				</div>

				<p className="text-[11px] text-gray-300 text-center mt-6">{t.pricing.cancelMonthly}</p>
			</div>

			{/* ── Pro Yearly — clean with inline savings badge ── */}
			<div className="bg-card rounded-xl border border-border flex flex-col p-7">
				{/* Price block */}
				<div className="mb-7">
					<div className="flex items-center justify-between mb-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							Pro Yearly
						</p>
						<span className="text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 px-2.5 py-1 rounded-md flex items-center gap-1">
							<Zap className="size-2.5" /> Save 17%
						</span>
					</div>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-foreground leading-none">$12.42</span>
						<span className="text-muted-foreground text-sm ml-1.5">/ mo</span>
					</div>
					<p className="text-xs text-muted-foreground mt-2">{t.pricing.billedYearly}</p>
				</div>

				{/* CTA — ghost button, accent on hover */}
				<button
					className="w-full h-9 rounded-lg border border-border bg-transparent text-foreground text-sm font-medium hover:border-[#006aff] hover:text-[#006aff] transition-colors cursor-pointer"
					onClick={onSelectYearly}
				>
					{t.pricing.upgradeYearly}
				</button>

				{/* Feature list */}
				<div className="border-t border-border mt-6 pt-6">
					<ul className="space-y-2.5">
						{yearlyFeatures.map((label) => (
							<li key={label} className="flex items-start gap-2.5">
								<Check className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
								<span className="text-sm leading-snug text-foreground">{label}</span>
							</li>
						))}
					</ul>
				</div>

				<p className="text-[11px] text-muted-foreground/40 text-center mt-6">{t.pricing.cancelYearly}</p>
			</div>

		</div>
	);
}
