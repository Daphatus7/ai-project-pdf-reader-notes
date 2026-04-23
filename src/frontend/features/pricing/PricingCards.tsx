import { Check, Zap } from "lucide-react";
import pricingData from "../../pages/landing-page/pricing.json";
import { useLanguage } from "../../i18n/language-context.tsx";

interface PricingCardsProps {
	onSelectMonthly: () => void;
	onSelectYearly: () => void;
	freeAction?: React.ReactNode;
}

export function PricingCards({ onSelectMonthly, onSelectYearly, freeAction }: PricingCardsProps) {
	const { t } = useLanguage();

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

			{/* ── Free ── */}
			<div className="bg-white border border-[#ececec] rounded-2xl flex flex-col p-7">
				<div className="mb-7">
					<p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] mb-4">
						Free
					</p>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-[#0f172a] leading-none">$0</span>
					</div>
					<p className="text-xs text-[#6b7280] mt-2">{t.pricing.foreverFree}</p>
				</div>

				<div>
					{freeAction ?? (
						<button disabled className="w-full h-9 rounded-lg border border-[#ececec] bg-transparent text-[#6b7280] text-sm font-medium cursor-not-allowed">
							Current Plan
						</button>
					)}
				</div>

				<div className="border-t border-[#ececec] mt-6 pt-6">
					<ul className="space-y-2.5">
						{freeFeatures.map(({ included, label }) => (
							<li key={label} className="flex items-start gap-2.5">
								{included ? (
									<Check className="size-3.5 text-[#6b7280] shrink-0 mt-0.5" />
								) : (
									<span className="size-3.5 shrink-0 mt-0.5 flex items-center justify-center text-[#6b7280]/30 text-sm leading-none select-none">
										–
									</span>
								)}
								<span className={`text-sm leading-snug ${included ? "text-[#0f172a]" : "text-[#6b7280]/40"}`}>
									{label}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* ── Pro Monthly — featured ── */}
			<div className="bg-white border-2 border-[#0fa478] rounded-2xl flex flex-col p-7">
				<div className="mb-7">
					<div className="flex items-center justify-between mb-4">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
							Pro
						</p>
						<span className="text-[11px] font-semibold bg-[#0fa478] text-white px-2.5 py-1 rounded-md">
							{t.pricing.mostPopular}
						</span>
					</div>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-[#0f172a] leading-none">$20</span>
						<span className="text-[#6b7280] text-sm ml-1.5">/ mo</span>
					</div>
					<p className="text-xs text-[#6b7280] mt-2">{t.pricing.billedMonthly}</p>
				</div>

				<button
					className="w-full h-9 rounded-lg bg-[#0fa478] text-white text-sm font-medium hover:bg-[#0d8f68] transition-colors cursor-pointer"
					onClick={onSelectMonthly}
				>
					{t.pricing.upgradeMonthly}
				</button>

				<div className="border-t border-[#ececec] mt-6 pt-6">
					<ul className="space-y-2.5">
						{monthlyFeatures.map(({ label }) => (
							<li key={label} className="flex items-start gap-2.5">
								<Check className="size-3.5 text-[#0fa478] shrink-0 mt-0.5" />
								<span className="text-sm leading-snug text-[#0f172a]">{label}</span>
							</li>
						))}
					</ul>
				</div>

				<p className="text-[11px] text-[#6b7280]/60 text-center mt-6">{t.pricing.cancelMonthly}</p>
			</div>

			{/* ── Pro Yearly ── */}
			<div className="bg-white border border-[#ececec] rounded-2xl flex flex-col p-7">
				<div className="mb-7">
					<div className="flex items-center justify-between mb-4">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
							Pro Yearly
						</p>
						<span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md flex items-center gap-1">
							<Zap className="size-2.5" /> Save 20%
						</span>
					</div>
					<div className="flex items-baseline gap-1 mb-1.5">
						<span className="text-[2.5rem] font-semibold tracking-tight text-[#0f172a] leading-none">$16</span>
						<span className="text-[#6b7280] text-sm ml-1.5">/ mo</span>
					</div>
					<p className="text-xs text-[#6b7280] mt-2">{t.pricing.billedYearly}</p>
				</div>

				<button
					className="w-full h-9 rounded-lg border border-[#ececec] bg-transparent text-[#0f172a] text-sm font-medium hover:border-[#0fa478] hover:text-[#0fa478] transition-colors cursor-pointer"
					onClick={onSelectYearly}
				>
					{t.pricing.upgradeYearly}
				</button>

				<div className="border-t border-[#ececec] mt-6 pt-6">
					<ul className="space-y-2.5">
						{yearlyFeatures.map((label) => (
							<li key={label} className="flex items-start gap-2.5">
								<Check className="size-3.5 text-[#6b7280] shrink-0 mt-0.5" />
								<span className="text-sm leading-snug text-[#0f172a]">{label}</span>
							</li>
						))}
					</ul>
				</div>

				<p className="text-[11px] text-[#6b7280]/40 text-center mt-6">{t.pricing.cancelYearly}</p>
			</div>

		</div>
	);
}
