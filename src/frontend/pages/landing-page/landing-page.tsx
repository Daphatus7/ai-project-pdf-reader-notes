import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
	ArrowRightIcon,
	LucideArrowRight,
	LucideMousePointer, LucideSigma,
	LucideSparkles,
	LucideZap
} from "lucide-react";
import PainPointSection from "./components/pain-point-section";
import PricingSection from "./pricing";
import { useLanguage } from "../../i18n/language-context";

const LandingPage = () => {
	const { t, lang, toggle } = useLanguage();

	return (
		<>
			<Helmet>
				<title>Atlas Notebook</title>

				<meta name="description" content="
					Faster reading, smarter notes — say goodbye to the frustration of clunky PDFs and rigid traditional documents.
					Boost your productivity instantly:
					What you see is exactly what you get — zero hallucinations, pure accuracy.
					One-click AI-powered : no more drawing tables, rewriting equations, or manual cleanup. We perfectly match and structure any AI output format for you.
					Side-by-side AI chat with zero fluff:
					point anywhere and get instant,
					precise explanations right there.
					Quickly capture, convert, and build your personal strategic knowledge base — effortless and hallucination-free.
				" />

				<meta property="og:title" content="Atlas Notebook: Your reliable AI-native notebook" />
				<meta property="og:description" content="Keep your AI outputs exact. A Notion-like notebook with LaTeX support, designed for ADHD/Dyslexia focus. Start understanding PDFs better today." />
				{/*<meta property="og:image" content="https://atlasnotebook.com/." />*/}
				<meta property="og:url" content="https://atlasnotebook.com" />

				<meta name="keywords" content="AI PDF Reader, reader for Dyslexia, reader for ADHD, LaTeX Notebook, KaTex Notebook, AI Research Assistant, Notion-style AI, Complex Math PDF Analyzer" />

				<link rel="canonical" href="https://atlasnotebook.com" />
			</Helmet>
		<div className="bg-card h-screen overflow-y-auto scroll-smooth w-full">
			<main>
			{/* Header */}
			<header className="sticky top-0 z-50 w-full bg-card/90 backdrop-blur-md border-b border-border">
				<div className="max-w-[1200px] mx-auto flex items-center justify-between h-16 px-6">
					{/* Logo */}
					<a href="/" className="flex items-baseline gap-0 group">
            <span className="font-serif text-[28px] text-[#0066FF] leading-none transition-opacity group-hover:opacity-80">
              A
            </span>
						<span className="font-serif text-[28px] text-foreground leading-none transition-opacity group-hover:opacity-80">
              tlas
            </span>
						<span className="text-sm text-muted-foreground ml-1 self-end pb-[2px] transition-opacity group-hover:opacity-80">
              notebook
            </span>
					</a>

					{/* Navigation — only links to sections that actually exist on the page */}
					<nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
						<a href="#product" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							{t.nav.product}
						</a>
						<a href="#pricing" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							{t.nav.pricing}
						</a>
					</nav>

					{/* Right side: language toggle + auth actions */}
					<div className="flex items-center gap-2">
						{/* Language toggle — label shows the language you'd switch TO */}
						<button
							onClick={toggle}
							className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
							aria-label="Switch language"
						>
							{lang === "en" ? "中" : "EN"}
						</button>
						<Link
							to="/login"
							className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							{t.nav.login}
						</Link>
						<Link
							to="/signup"
							className="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded transition-colors"
						>
							{t.nav.tryForFree}
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="w-full px-4 py-16 flex flex-col items-center">
				{/* Main Heading — gradient from near-black to brand blue (#006aff) */}
				<h1
					className="font-bold text-4xl sm:text-5xl md:text-6xl text-center mb-6 bg-clip-text text-transparent"
					style={{
						backgroundImage:
							"linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%)",
						WebkitTextFillColor: "transparent",
						WebkitBackgroundClip: "text",
					}}
				>
					<div>{t.hero.heading1}</div>
					<div>{t.hero.heading2}</div>
				</h1>

				{/* Subtitle — two clean sentences */}
				<p className="text-muted-foreground text-xl md:text-2xl text-center max-w-2xl mb-12 leading-relaxed">
					{t.hero.subtitle1}
					<br />
					{t.hero.subtitle2}
				</p>

				{/* CTA Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 mb-8">
					<Link
						to="/signup"
						className="px-8 py-4 rounded-xl text-primary-foreground font-medium text-base flex items-center gap-3 hover:opacity-90 transition-opacity"
						style={{
							backgroundImage:
								"linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)",
						}}
					>
						{t.hero.cta}
						<ArrowRightIcon />
					</Link>
					{/*<button className="px-8 py-4 rounded-xl bg-card border-2 border-border text-foreground font-medium text-base hover:border-[#006aff] transition-colors">*/}
					{/*	Watch Demo*/}
					{/*</button>*/}
				</div>

				{/* Feature pills — concise capability signals */}
				<div className="flex flex-wrap justify-center gap-8 max-w-4xl mb-16">
					<div className="flex items-center gap-2">
						<LucideZap className="size-4 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">{t.hero.features.screenshot}</span>
					</div>
					<div className="flex items-center gap-2">
						<LucideSigma className="size-4 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">{t.hero.features.formulas}</span>
					</div>
					<div className="flex items-center gap-2">
						<LucideMousePointer className="size-4 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">{t.hero.features.macros}</span>
					</div>
				</div>

				{/* Product screenshot — shows the actual UI before visitors scroll */}
				<div className="w-full max-w-4xl rounded-xl border border-border overflow-hidden shadow-sm">
					<video
						src="/demo-full.mp4"
						autoPlay
						loop
						muted
						playsInline
						className="w-full block"
					/>
				</div>
			</section>

			{/* Features Section — numbered rows, no icon-in-circle AI slop */}
			<section id="product" className="w-full px-4 py-20 bg-secondary/30">
				<div className="max-w-4xl mx-auto">
					<h2 className="font-bold text-4xl md:text-5xl text-foreground mb-4">
						{t.features.heading}
					</h2>
					<p className="text-lg text-muted-foreground mb-16 max-w-xl">
						{t.features.subheading}
					</p>

					{/* Step rows — left-aligned number + title + description */}
					<div className="space-y-0 divide-y divide-border">
						<div className="py-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-16">
							<span className="text-5xl font-bold text-muted-foreground/25 leading-none shrink-0 w-16">01</span>
							<div>
								<h3 className="font-semibold text-xl text-foreground mb-2">{t.features.step1Title}</h3>
								<p className="text-muted-foreground leading-relaxed max-w-lg">{t.features.step1Desc}</p>
							</div>
						</div>
						<div className="py-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-16">
							<span className="text-5xl font-bold text-muted-foreground/25 leading-none shrink-0 w-16">02</span>
							<div>
								<h3 className="font-semibold text-xl text-foreground mb-2">{t.features.step2Title}</h3>
								<p className="text-muted-foreground leading-relaxed max-w-lg">{t.features.step2Desc}</p>
							</div>
						</div>
						<div className="py-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-16">
							<span className="text-5xl font-bold text-muted-foreground/25 leading-none shrink-0 w-16">03</span>
							<div>
								<h3 className="font-semibold text-xl text-foreground mb-2">{t.features.step3Title}</h3>
								<p className="text-muted-foreground leading-relaxed max-w-lg">{t.features.step3Desc}</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pain Point Section — moved after features so visitors see the product first */}
			<PainPointSection />

			{/* How it Works — alternating media + text rows */}
			<section className="w-full px-4 py-24">
				<div className="max-w-5xl mx-auto space-y-24">

					{/* Row 1 — left: screenshot, right: text */}
					<div className="flex flex-col md:flex-row items-center gap-12">
						<div className="w-full md:w-3/5 rounded-xl border border-border overflow-hidden shrink-0">
							<img
								src="/demo.png"
								alt="Atlas Notebook — AI-native notebook interface"
								className="w-full block"
							/>
						</div>
						<div className="flex flex-col gap-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Document Q&A
							</p>
							<h3 className="font-semibold text-2xl text-foreground leading-snug">
								Reading PDFs made easy
							</h3>
							<p className="text-base text-muted-foreground leading-relaxed">
								Select any passage. Ask anything. Atlas uses Grok — XAI's frontier model — for answers grounded in your document.
							</p>
						</div>
					</div>

					{/* Row 2 — left: text, right: video */}
					<div className="flex flex-col md:flex-row-reverse items-center gap-12">
						<div className="w-full md:w-3/5 rounded-xl border border-border overflow-hidden shrink-0">
							<video
								src="/demo-table.mp4"
								autoPlay
								loop
								muted
								playsInline
								className="w-full block"
							/>
						</div>
						<div className="flex flex-col gap-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Rich Output
							</p>
							<h3 className="font-semibold text-2xl text-foreground leading-snug">
								Formulas, tables, any LLM output
							</h3>
							<p className="text-base text-muted-foreground leading-relaxed">
								Perfectly matches AI outputs to your notebook — tables, LaTeX formulas, code blocks. What you see is exactly what you get.
							</p>
						</div>
					</div>

				</div>
			</section>

			<PricingSection />

			{/* CTA Section — clean bordered, no dark gradient template */}
			<section className="w-full px-4 py-20 border-t border-border">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="font-bold text-4xl md:text-5xl text-foreground mb-6">
						{t.cta.heading}
					</h2>
					<p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
						{t.cta.subheading}
					</p>
					<div className="flex flex-col items-center gap-4">
						<Link
							to="/signup"
							className="px-8 py-4 rounded-xl text-primary-foreground font-medium text-base hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-3"
							style={{
								backgroundImage:
									"linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)",
							}}
						>
							{t.cta.button}
							<LucideArrowRight/>
						</Link>
						<p className="text-sm text-muted-foreground">
							{t.cta.questions}{" "}
							<a href="mailto:support@atlasnotebook.com" className="text-[#006aff] hover:opacity-80 underline underline-offset-2 transition-opacity duration-200">
								{t.cta.talkToUs}
							</a>
						</p>
					</div>
				</div>
			</section>

			{/* Footer — two columns until roadmap/docs/blog pages exist */}
			<footer className="w-full bg-secondary border-t border-border px-4 py-12">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
						{/* Company Info */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div
									className="w-8 h-8 rounded-lg flex items-center justify-center"
									style={{
										backgroundImage:
											"linear-gradient(135deg, rgb(49, 65, 88) 0%, rgb(67, 45, 215) 100%)",
									}}
								>
									<LucideSparkles className="size-4" stroke="white" />
								</div>
								<span className="text-base text-foreground">
                  Atlas Notebook
                </span>
							</div>
							<p className="text-sm text-muted-foreground">
								{t.footer.tagline}
							</p>
						</div>

						{/* Product — only links to sections that exist */}
						<div>
							<h4 className="font-medium text-sm text-foreground mb-3">
								{t.footer.product}
							</h4>
							<ul className="space-y-2">
								<li>
									<a href="#product" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										{t.footer.features}
									</a>
								</li>
								<li>
									<a href="#pricing" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										{t.footer.pricing}
									</a>
								</li>
							</ul>
						</div>
					</div>

					{/* Footer Bottom */}
					<div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-sm text-muted-foreground">
							{t.footer.copyright}
						</p>
						<a href="mailto:support@atlasnotebook.com" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
							{t.footer.contact}
						</a>
					</div>
				</div>
			</footer>
			</main>
		</div>
		</>
	);
};

export default LandingPage;
