import { Link } from "react-router-dom";
import { CheckCircle2, X, Zap } from "lucide-react";
import pricingData from "./pricing.json";

export default function PricingSection() {
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

				{/* Pricing Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">

					{/* Free */}
					<div className="bg-card rounded-2xl p-8 border border-border flex flex-col transition-transform duration-500 ease-out hover:-translate-y-1">
						<div className="mb-6">
							<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Free</p>
							<div className="flex items-end gap-1 mb-1">
								<span className="text-5xl font-bold text-foreground">$0</span>
							</div>
							<p className="text-sm text-muted-foreground mt-1">Forever free · No card required</p>
						</div>

						<Link
							to="/signup"
							className="block text-center py-2.5 px-6 rounded-xl border-2 border-border text-foreground font-medium hover:border-[#006aff] hover:text-[#006aff] transition-colors mb-8"
						>
							Get started free
						</Link>

						<ul className="space-y-3 flex-1">
							{pricingData.free.map(({ included, label }) => (
								<li key={label} className="flex items-start gap-2.5">
									{included
										? <CheckCircle2 className="size-4 text-[#006aff] shrink-0 mt-0.5" />
										: <X className="size-4 text-border shrink-0 mt-0.5" />}
									<span className={`text-sm ${included ? "text-foreground" : "text-muted-foreground/60"}`}>{label}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Monthly Pro */}
					<div className="bg-card rounded-2xl p-8 border-2 border-[#006aff] flex flex-col relative transition-transform duration-500 ease-out hover:-translate-y-1">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2">
							<span className="bg-[#006aff] text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
								Most Popular
							</span>
						</div>

						<div className="mb-6">
							<p className="text-xs font-semibold uppercase tracking-widest text-[#006aff] mb-3">Pro Monthly</p>
							<div className="flex items-end gap-1 mb-1">
								<span className="text-5xl font-bold text-foreground">$20</span>
								<span className="text-muted-foreground pb-1.5 ml-1">/ month</span>
							</div>
							<p className="text-sm text-muted-foreground mt-1">Billed monthly · Cancel anytime</p>
						</div>

						<Link
							to="/signup"
							className="block text-center py-2.5 px-6 rounded-xl text-white font-medium hover:opacity-90 transition-opacity mb-8"
							style={{ backgroundImage: "linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)" }}
						>
							Start 7-day free trial
						</Link>

						<ul className="space-y-3 flex-1">
							{pricingData.monthly.map(({ label }) => (
								<li key={label} className="flex items-start gap-2.5">
									<CheckCircle2 className="size-4 text-[#006aff] shrink-0 mt-0.5" />
									<span className="text-sm text-foreground">{label}</span>
								</li>
							))}
						</ul>

						<p className="text-xs text-muted-foreground text-center mt-6">No commitments. Cancel anytime.</p>
					</div>

					{/* Yearly Pro */}
					<div
						className="rounded-2xl p-8 flex flex-col relative transition-transform duration-500 ease-out hover:-translate-y-1"
						style={{ backgroundImage: "linear-gradient(163.293deg, rgb(15, 23, 43) 0%, rgb(29, 41, 61) 55%, rgb(49, 44, 133) 100%)" }}
					>
						<div className="absolute -top-4 left-1/2 -translate-x-1/2">
							<span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1">
								<Zap className="size-3" />
								Best Value · Save $41
							</span>
						</div>

						{/* Subtle glow */}
						<div className="absolute top-0 right-0 w-48 h-48 bg-[#006aff]/20 rounded-full blur-3xl pointer-events-none" />

						<div className="mb-6 relative">
							<p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">Pro Yearly</p>
							<div className="flex items-end gap-1 mb-1">
								<span className="text-5xl font-bold text-white">$199</span>
								<span className="text-white/50 pb-1.5 ml-1">/ year</span>
							</div>
							<p className="text-sm text-white/60 mt-1">~$16.58 per month, billed annually</p>
							<div className="flex items-center gap-2 mt-2">
								<span className="text-sm text-white/40 line-through">$240 / year</span>
								<span className="text-sm text-green-400 font-semibold">You save $41</span>
							</div>
						</div>

						<Link
							to="/signup"
							className="block text-center py-2.5 px-6 rounded-xl bg-white text-[#1a1a2e] font-semibold hover:bg-white/90 transition-colors mb-8 relative"
						>
							Get Pro — Best Value
						</Link>

						<ul className="space-y-3 flex-1 relative">
							{pricingData.yearly.map((label) => (
								<li key={label} className="flex items-start gap-2.5">
									<CheckCircle2 className="size-4 text-green-400 shrink-0 mt-0.5" />
									<span className="text-sm text-white/80">{label}</span>
								</li>
							))}
						</ul>

						<p className="text-xs text-white/30 text-center mt-6 relative">
							Renews automatically. Cancel anytime.
						</p>
					</div>

				</div>

				<p className="text-sm text-muted-foreground text-center mt-10">
					All plans include end-to-end encryption, automatic backups, and version history.
				</p>
			</div>
		</section>
	);
}
