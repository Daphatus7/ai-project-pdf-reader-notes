import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PricingSection from "@/frontend/pages/landing-page/pricing.tsx";

/* ─── Landing Page ────────────────────────────────────────────────────────────
   New design: teal hero + problems / workflow / features / FAQ sections.
   Replaced old card-based design; drops i18n, PainPointSection, PricingSection.
   SVG illustrations are inlined (source file svg-gw25jj2mok not in repo).
───────────────────────────────────────────────────────────────────────────── */

const LandingPage = () => {
	const f1Ref = useRef<HTMLDivElement>(null);
	const [f1Visible, setF1Visible] = useState(false);
	const [showEditor, setShowEditor] = useState(false);

	useEffect(() => {
		const el = f1Ref.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([entry]) => { if (entry.isIntersecting) setF1Visible(true); },
			{ threshold: 0.35 }
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	useEffect(() => {
		if (!f1Visible) return;
		let intervalId: ReturnType<typeof setInterval>;
		const delayId = setTimeout(() => {
			intervalId = setInterval(() => setShowEditor(v => !v), 2800);
		}, 800);
		return () => { clearTimeout(delayId); clearInterval(intervalId); };
	}, [f1Visible]);

	return (
		<>
			<Helmet>
				<title>Atlas Notebook</title>
				<meta name="description" content="No copy-paste. No reformatting. No tab-switching. Select what matters — your notes build themselves on the same screen." />
				<meta property="og:title" content="Atlas Notebook: Your reliable AI-native notebook" />
				<meta property="og:description" content="Keep your AI outputs exact. A notebook with LaTeX support, designed for AI-assisted learning." />
				<meta property="og:url" content="https://atlasnotebook.com" />
				<meta name="keywords" content="AI PDF Reader, reader for Dyslexia, reader for ADHD, LaTeX Notebook, KaTex Notebook, AI Research Assistant, Notion-style AI, Complex Math PDF Analyzer" />
				<link rel="canonical" href="https://atlasnotebook.com" />
			</Helmet>

			<div className="min-h-screen bg-[#0d5a6b]">
				{/* ── Header ──────────────────────────────────────────────────── */}
				<header className="sticky top-2 z-50">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex items-center justify-between h-20 backdrop-blur-md backdrop-saturate-120 bg-white/10 border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.15)] rounded-2xl px-6 mb-4">
							{/* Logo */}
							<div className="flex items-baseline gap-1">
								<h1 className="text-3xl font-['Crimson_Text'] text-white">
									<span className="text-[#006aff]">A</span>tlas
								</h1>
								<span className="text-lg text-white">notebook</span>
							</div>

							{/* Navigation */}
							<nav className="hidden md:flex items-center gap-10">
								<a href="#problems" className="text-white/95 text-sm font-medium hover:text-white transition">Problems</a>
								<a href="#workflow" className="text-white/95 text-sm font-medium hover:text-white transition">How it works</a>
								<a href="#features" className="text-white/95 text-sm font-medium hover:text-white transition">Features</a>
								<a href="#faq" className="text-white/95 text-sm font-medium hover:text-white transition">FAQ</a>
								<a href="#pricing" className="text-white/95 text-sm font-medium hover:text-white transition">Pricing</a>
								<a className="text-white/95 text-sm font-medium hover:text-white transition">Blog</a>
							</nav>

							{/* CTA Buttons */}
							<div className="flex items-center gap-4">
								<Link
									to="/login"
									className="hidden sm:block text-white text-sm font-medium hover:opacity-80 transition"
								>
									Log in
								</Link>
								<Link
									to="/signup"
									className="bg-white text-[#0f172a] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-white/90 transition"
								>
									Start for free
								</Link>
							</div>
						</div>
					</div>
				</header>

				{/* ── Hero ────────────────────────────────────────────────────── */}
				<section className="bg-gradient-to-b from-[#0d5a6b] via-[#1a7a8a] to-[#3ba89a] relative">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
						<div className="text-center mb-12">
							{/* Powered-by badge */}
							<div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-6 py-2.5 mb-8">
								{/* Grok AI star icon — simplified inline SVG */}
								<img src="/public/xAI-logo.svg" alt="xAI Grok" className="w-6 h-6" />
								<span className="text-white font-bold text-md">Powered by xAI Grok</span>
							</div>

							{/* Main headline */}
							<h2 className="text-4xl sm:text-5xl lg:text-[68px] font-semibold text-white leading-tight tracking-[-1.7px] mb-6 max-w-5xl mx-auto">
								You didn't spend years studying<br />
								just to copy-paste and fix formatting
							</h2>

							<p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-10 leading-relaxed">
								No copy-paste. No reformatting. No tab-switching. Just select what matters — your notes build themselves on the same screen.
							</p>

							{/* Email capture */}
							<div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
								<input
									type="email"
									placeholder="Email address"
									className="w-full sm:flex-1 bg-white/12 border border-white/25 rounded-full px-6 py-3.5 text-white placeholder:text-white/75 focus:outline-none focus:ring-2 focus:ring-white/50"
								/>
								<Link
									to="/signup"
									className="w-full sm:w-auto bg-white text-[#0f172a] px-8 py-3.5 rounded-full font-semibold hover:bg-white/90 transition text-center"
								>
									Start now
								</Link>
							</div>
						</div>

						{/* Demo video */}
						<div className="mt-16 rounded-2xl overflow-hidden shadow-2xl max-w-6xl mx-auto">
							<div className="relative aspect-video bg-gray-900">
								<video
									autoPlay
									loop
									muted
									playsInline
									className="w-full h-full object-cover"
									controlsList="nodownload"
								>
									<source src="/demo-full.mp4" />
								</video>
							</div>
						</div>
					</div>
				</section>

				{/* ── Problems ────────────────────────────────────────────────── */}
				<section id="problems" className="bg-[#fafaf7] py-[140px] px-6 text-[#0f172a]">
					<div className="max-w-[1100px] mx-auto">
						<h2 className="text-[clamp(32px,4.5vw,56px)] tracking-[-0.025em] leading-[1.15] text-center max-w-[900px] mx-auto mb-[60px]">
							<span className="font-semibold">You read to understand.</span><br />
							<span className="font-semibold italic font-['Crimson_Text'] text-[#0fa478]">But the process keeps getting in the way.</span>
						</h2>

						{/* Problem 01 */}
						<div className="grid md:grid-cols-2 gap-20 items-center mb-[60px]">
							<div>
								<div className="flex items-center gap-3 mb-[18px]">
									<div className="w-6 h-px bg-[#0fa478]" />
									<span className="text-[#0fa478] text-sm font-medium tracking-[0.08em] uppercase">Problem 01</span>
								</div>
								<h3 className="text-[clamp(26px,3vw,38px)] font-semibold tracking-[-0.02em] leading-[1.2] mb-5 text-[#0f172a]">
									AI explains better — but getting there kills your focus.
								</h3>
								<p className="text-[17px] leading-[1.6] text-[#52525b] max-w-[460px]">
									You want AI to explain exactly where you're stuck, but the prompting, screenshotting, and app-switching kills your focus.
								</p>
							</div>
							<div
								className="aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden"
								style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(135deg, #eef9f4 0%, #dff2e8 100%)", backgroundSize: "24px 24px, 24px 24px, 100% 100%" }}
							>
								<svg className="w-[55%]" viewBox="0 0 300 220" fill="none" stroke="#15cc91" strokeWidth="1.5">
									<rect x="20" y="30" width="110" height="75" rx="6" strokeOpacity="0.7" />
									<line x1="20" y1="48" x2="130" y2="48" strokeOpacity="0.5" />
									<circle cx="32" cy="39" r="2.5" fill="#15cc91" stroke="none" />
									<line x1="32" y1="60" x2="115" y2="60" strokeOpacity="0.3" />
									<line x1="32" y1="72" x2="100" y2="72" strokeOpacity="0.3" />
									<line x1="32" y1="84" x2="110" y2="84" strokeOpacity="0.3" />
									<rect x="160" y="55" width="120" height="80" rx="6" strokeOpacity="0.7" />
									<line x1="160" y1="73" x2="280" y2="73" strokeOpacity="0.5" />
									<circle cx="172" cy="64" r="2.5" fill="#15cc91" stroke="none" />
									<line x1="172" y1="87" x2="260" y2="87" strokeOpacity="0.3" />
									<line x1="172" y1="100" x2="240" y2="100" strokeOpacity="0.3" />
									<line x1="172" y1="113" x2="255" y2="113" strokeOpacity="0.3" />
									<rect x="60" y="125" width="130" height="70" rx="6" strokeOpacity="0.7" />
									<line x1="60" y1="143" x2="190" y2="143" strokeOpacity="0.5" />
									<circle cx="72" cy="134" r="2.5" fill="#15cc91" stroke="none" />
									<line x1="72" y1="157" x2="175" y2="157" strokeOpacity="0.3" />
									<line x1="72" y1="170" x2="160" y2="170" strokeOpacity="0.3" />
									<path d="M130 70 Q 145 50 160 75" strokeOpacity="0.5" strokeDasharray="3 3" />
									<path d="M190 135 Q 160 150 125 145" strokeOpacity="0.5" strokeDasharray="3 3" />
									<path d="M95 105 Q 75 115 85 125" strokeOpacity="0.5" strokeDasharray="3 3" />
								</svg>
							</div>
						</div>

						{/* Problem 02 */}
						<div className="grid md:grid-cols-2 gap-20 items-center mb-[60px]">
							<div
								className="order-2 md:order-1 aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden"
								style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(135deg, #eef9f4 0%, #dff2e8 100%)", backgroundSize: "24px 24px, 24px 24px, 100% 100%" }}
							>
								<svg className="w-[55%]" viewBox="0 0 300 220" fill="none" stroke="#15cc91" strokeWidth="1.5">
									<rect x="80" y="30" width="140" height="170" rx="6" strokeOpacity="0.8" />
									<line x1="95" y1="55" x2="205" y2="55" strokeOpacity="0.5" />
									<line x1="95" y1="68" x2="190" y2="68" strokeOpacity="0.3" />
									<line x1="95" y1="80" x2="200" y2="80" strokeOpacity="0.3" />
									<rect x="92" y="95" width="116" height="28" rx="3" fill="#15cc91" fillOpacity="0.12" stroke="#15cc91" strokeOpacity="0.5" strokeDasharray="3 2" />
									<line x1="100" y1="105" x2="190" y2="105" strokeOpacity="0.4" />
									<line x1="100" y1="115" x2="175" y2="115" strokeOpacity="0.4" />
									<line x1="95" y1="138" x2="200" y2="138" strokeOpacity="0.3" />
									<line x1="95" y1="150" x2="180" y2="150" strokeOpacity="0.3" />
									<line x1="95" y1="162" x2="195" y2="162" strokeOpacity="0.3" />
									<line x1="95" y1="174" x2="170" y2="174" strokeOpacity="0.3" />
									<circle cx="50" cy="70" r="14" strokeOpacity="0.6" />
									<text x="50" y="76" fill="#15cc91" stroke="none" fontSize="16" fontWeight="600" textAnchor="middle" fontFamily="Inter">?</text>
									<circle cx="250" cy="130" r="14" strokeOpacity="0.6" />
									<text x="250" y="136" fill="#15cc91" stroke="none" fontSize="16" fontWeight="600" textAnchor="middle" fontFamily="Inter">?</text>
									<circle cx="240" cy="50" r="10" strokeOpacity="0.5" />
									<text x="240" y="55" fill="#15cc91" stroke="none" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="Inter">!</text>
								</svg>
							</div>
							<div className="order-1 md:order-2">
								<div className="flex items-center gap-3 mb-[18px]">
									<div className="w-6 h-px bg-[#0fa478]" />
									<span className="text-[#0fa478] text-sm font-medium tracking-[0.08em] uppercase">Problem 02</span>
								</div>
								<h3 className="text-[clamp(26px,3vw,38px)] font-semibold tracking-[-0.02em] leading-[1.2] mb-5 text-[#0f172a]">
									You fed AI the full PDF — but you can't trust the output.
								</h3>
								<p className="text-[17px] leading-[1.6] text-[#52525b] max-w-[460px]">
									Answers come with hallucinations, omissions, and no way to verify. You end up fact-checking the thing that was supposed to save you time.
								</p>
							</div>
						</div>

						{/* Problem 03 */}
						<div className="grid md:grid-cols-2 gap-20 items-center">
							<div>
								<div className="flex items-center gap-3 mb-[18px]">
									<div className="w-6 h-px bg-[#0fa478]" />
									<span className="text-[#0fa478] text-sm font-medium tracking-[0.08em] uppercase">Problem 03</span>
								</div>
								<h3 className="text-[clamp(26px,3vw,38px)] font-semibold tracking-[-0.02em] leading-[1.2] mb-5 text-[#0f172a]">
									The answers are good. Your notebook can't handle them.
								</h3>
								<p className="text-[17px] leading-[1.6] text-[#52525b] max-w-[460px]">
									Tables, equations, formatted content — AI finally gives you what you need, but you're stuck copying, pasting, and fixing. No notebook supports AI output natively.
								</p>
							</div>
							<div
								className="aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden"
								style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,204,145,0.06) 1px, transparent 1px), linear-gradient(135deg, #eef9f4 0%, #dff2e8 100%)", backgroundSize: "24px 24px, 24px 24px, 100% 100%" }}
							>
								<svg className="w-[55%]" viewBox="0 0 300 220" fill="none" stroke="#15cc91" strokeWidth="1.5">
									<rect x="20" y="30" width="115" height="160" rx="6" strokeOpacity="0.7" />
									<text x="32" y="58" fill="#15cc91" stroke="none" fontSize="13" fontFamily="Georgia, serif" fontStyle="italic">∫ f(x)dx</text>
									<rect x="32" y="72" width="90" height="40" rx="2" strokeOpacity="0.6" />
									<line x1="32" y1="86" x2="122" y2="86" strokeOpacity="0.5" />
									<line x1="32" y1="99" x2="122" y2="99" strokeOpacity="0.3" />
									<line x1="62" y1="72" x2="62" y2="112" strokeOpacity="0.4" />
									<line x1="92" y1="72" x2="92" y2="112" strokeOpacity="0.4" />
									<rect x="32" y="122" width="60" height="6" rx="2" fill="#15cc91" fillOpacity="0.25" stroke="none" />
									<line x1="32" y1="138" x2="120" y2="138" strokeOpacity="0.3" />
									<line x1="32" y1="150" x2="110" y2="150" strokeOpacity="0.3" />
									<line x1="32" y1="162" x2="115" y2="162" strokeOpacity="0.3" />
									<line x1="32" y1="174" x2="95" y2="174" strokeOpacity="0.3" />
									<path d="M145 110 L 170 110" strokeOpacity="0.6" />
									<path d="M155 105 L 160 110 L 155 115" strokeOpacity="0.6" />
									<path d="M150 118 L 165 102" stroke="#e65454" strokeOpacity="0.6" strokeWidth="2" />
									<rect x="180" y="30" width="100" height="160" rx="6" strokeOpacity="0.7" strokeDasharray="4 3" />
									<line x1="192" y1="55" x2="265" y2="55" strokeOpacity="0.3" />
									<line x1="192" y1="68" x2="255" y2="68" strokeOpacity="0.3" />
									<line x1="192" y1="81" x2="260" y2="81" strokeOpacity="0.3" />
									<line x1="192" y1="94" x2="245" y2="94" strokeOpacity="0.3" />
									<line x1="192" y1="107" x2="258" y2="107" strokeOpacity="0.3" />
									<line x1="192" y1="120" x2="250" y2="120" strokeOpacity="0.3" />
									<line x1="192" y1="133" x2="255" y2="133" strokeOpacity="0.3" />
									<line x1="192" y1="146" x2="240" y2="146" strokeOpacity="0.3" />
									<line x1="192" y1="159" x2="260" y2="159" strokeOpacity="0.3" />
									<line x1="192" y1="172" x2="245" y2="172" strokeOpacity="0.3" />
								</svg>
							</div>
						</div>
					</div>
				</section>

				{/* ── Solution ─────────────────────────────────────────────────── */}

				<section id="solutions" className="bg-[#FFFFFF] py-[140px] px-6 text-[#0f172a]">
					<div className="max-w-[1100px] mx-auto">
						<h2 className="text-[clamp(32px,4.5vw,56px)] tracking-[-0.025em] leading-[1.15] text-center max-w-[900px] mx-auto">
							<span className="font-semibold">Atlas Notebook is built </span><br/>
							<span className="font-semibold italic font-['Crimson_Text'] text-[#0fa478]">to eliminate the friction, from source to structured notes</span>
						</h2>
					</div>
				</section>
				
				{/* ── Workflow ─────────────────────────────────────────────────── */}
				<section id="workflow" className="bg-[#fafaf7] py-20 lg:py-32">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-16">
							<p className="text-[#0fa478] text-xs font-medium tracking-widest uppercase mb-6">The Workflow</p>
							<h2 className="text-3xl lg:text-5xl font-semibold text-[#0f172a] mb-4 tracking-tight">
								From source to knowledge in seconds.
							</h2>
							<p className="text-[#6b7280] text-lg max-w-3xl mx-auto">
								A three-step flow built for documents that fight back — dense PDFs, nested tables, and equations that other tools choke on.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{/* Step 1 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="rounded-xl h-48 mb-6 overflow-hidden bg-gradient-to-br from-[#f6faf8] to-[#eef7f2]">
									<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
										<rect x="40" y="20" width="240" height="170" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
										<rect x="54" y="36" width="180" height="5" rx="1.5" fill="#cbd5e1"/>
										<rect x="54" y="48" width="210" height="5" rx="1.5" fill="#e2e8f0"/>
										<rect x="54" y="60" width="160" height="5" rx="1.5" fill="#e2e8f0"/>
										<rect x="52" y="76" width="216" height="22" rx="3" fill="#15cc91" fillOpacity="0.18" stroke="#15cc91" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 2"/>
										<rect x="60" y="82" width="180" height="5" rx="1.5" fill="#15cc91" fillOpacity="0.7"/>
										<rect x="60" y="91" width="140" height="5" rx="1.5" fill="#15cc91" fillOpacity="0.5"/>
										<rect x="54" y="110" width="200" height="5" rx="1.5" fill="#e2e8f0"/>
										<rect x="54" y="122" width="220" height="5" rx="1.5" fill="#e2e8f0"/>
										<rect x="54" y="134" width="170" height="5" rx="1.5" fill="#e2e8f0"/>
										<rect x="54" y="146" width="200" height="5" rx="1.5" fill="#e2e8f0"/>
										<path d="M250 95 L 260 102 L 255 103 L 258 109 L 254 110 L 251 104 L 246 108 Z" fill="#0f172a"/>
									</svg>
								</div>
								<div className="flex items-center gap-2 mb-3">
									<span className="w-6 h-6 rounded-full bg-[#0fa478] text-white text-xs flex items-center justify-center font-bold">1</span>
									<span className="text-[#0f172a] text-xs font-semibold uppercase tracking-widest">Select</span>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									Select any section on the PDF
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Capture any part of your PDF — tables, equations, diagrams, or text blocks — with a simple screenshot tool.
								</p>
							</div>

							{/* Step 2 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="rounded-xl h-48 mb-6 overflow-hidden bg-gradient-to-br from-[#f6faf8] to-[#eef7f2]">
									<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
										<rect x="20" y="20" width="280" height="160" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
										<rect x="34" y="36" width="180" height="4" rx="1.5" fill="#cbd5e1" opacity="0.6"/>
										<rect x="34" y="48" width="210" height="4" rx="1.5" fill="#e2e8f0" opacity="0.6"/>
										<rect x="34" y="60" width="160" height="4" rx="1.5" fill="#e2e8f0" opacity="0.6"/>
										<rect x="68" y="78" width="184" height="92" rx="12" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
										<path d="M68 90 L 68 78 Q 68 78 80 78 L 240 78 Q 252 78 252 90 L 252 106 L 68 106 Z" fill="#f9fafb"/>
										<circle cx="82" cy="92" r="4" fill="#15cc91"/>
										<rect x="92" y="89" width="70" height="5" rx="1.5" fill="#0f172a"/>
										<rect x="80" y="116" width="68" height="22" rx="6" fill="#e6faf3" stroke="#15cc91" strokeOpacity="0.3"/>
										<text x="114" y="131" fill="#0fa478" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="Inter">Explain</text>
										<rect x="156" y="116" width="68" height="22" rx="6" fill="#f1f5f9"/>
										<text x="190" y="131" fill="#475569" fontSize="10" fontWeight="500" textAnchor="middle" fontFamily="Inter">Extract</text>
										<rect x="80" y="142" width="68" height="22" rx="6" fill="#f1f5f9"/>
										<text x="114" y="157" fill="#475569" fontSize="10" fontWeight="500" textAnchor="middle" fontFamily="Inter">Summarize</text>
										<rect x="156" y="142" width="68" height="22" rx="6" fill="#f1f5f9"/>
										<text x="190" y="157" fill="#475569" fontSize="10" fontWeight="500" textAnchor="middle" fontFamily="Inter">Translate</text>
									</svg>
								</div>
								<div className="flex items-center gap-2 mb-3">
									<span className="w-6 h-6 rounded-full bg-[#0fa478] text-white text-xs flex items-center justify-center font-bold">2</span>
									<span className="text-[#0f172a] text-xs font-semibold uppercase tracking-widest">Ask</span>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									Ask AI to explain, extract, summarize, or translate
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Get the same AI experience you're used to, but with higher precision and interactable output.
								</p>
							</div>

							{/* Step 3 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="rounded-xl h-48 mb-6 overflow-hidden bg-gradient-to-br from-[#f6faf8] to-[#eef7f2]">
									<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
										<rect x="30" y="20" width="260" height="170" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
										<rect x="44" y="34" width="110" height="8" rx="2" fill="#0f172a"/>
										<rect x="44" y="50" width="200" height="4" rx="1.5" fill="#cbd5e1"/>
										<rect x="42" y="66" width="236" height="62" rx="5" fill="#f0fdf4" stroke="#15cc91" strokeOpacity="0.35" strokeWidth="1"/>
										<text x="54" y="86" fill="#0f172a" fontSize="12" fontStyle="italic" fontFamily="Georgia, serif">∫₀^∞ e^(-x²) dx = √π / 2</text>
										<rect x="54" y="96" width="200" height="3" rx="1.5" fill="#cbd5e1"/>
										<rect x="54" y="104" width="180" height="3" rx="1.5" fill="#cbd5e1"/>
										<rect x="54" y="112" width="150" height="3" rx="1.5" fill="#cbd5e1"/>
										<circle cx="264" cy="76" r="8" fill="#15cc91"/>
										<path d="M260 76 L 263 79 L 268 73" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
										<rect x="44" y="142" width="180" height="4" rx="1.5" fill="#e2e8f0"/>
										<rect x="44" y="154" width="220" height="4" rx="1.5" fill="#e2e8f0"/>
										<rect x="44" y="166" width="160" height="4" rx="1.5" fill="#e2e8f0"/>
									</svg>
								</div>
								<div className="flex items-center gap-2 mb-3">
									<span className="w-6 h-6 rounded-full bg-[#0fa478] text-white text-xs flex items-center justify-center font-bold">3</span>
									<span className="text-[#0f172a] text-xs font-semibold uppercase tracking-widest">Insert</span>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									One click. Straight into your notes
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Pixel-perfect tables, LaTeX, and Math/Chemical formulas. No copy-paste, no cleanup, no tab-switching. All in one screen.
								</p>
							</div>
						</div>
					</div>
				</section>
				

				{/* ── Features ───────────────────────────────────────────────── */}
				<section id="features" className="bg-white py-20 lg:py-28 border-t border-[#ececec]">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

						<div className="mb-12">
							<p className="text-xs font-semibold uppercase tracking-widest text-[#0fa478] mb-3">Features</p>
							<h2 className="text-3xl lg:text-5xl font-semibold text-[#0f172a] max-w-2xl leading-tight">
								Built for the output AI actually gives you.
							</h2>
						</div>

						{/* Bento grid: F1 = 2col×2row, F2+F3 = 1col each */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

							{/* F1 — Lossless Formatting, dark, large */}
							<div ref={f1Ref} className="md:col-span-2 md:row-span-2 bg-[#0f172a] rounded-2xl p-8 overflow-hidden relative min-h-[340px] group
									transition-shadow duration-500 hover:shadow-[0_24px_60px_-12px_rgba(15,164,120,0.18)] cursor-default">
								<div className="relative z-10 max-w-sm">
									<p className="text-[#0fa478] text-xs font-semibold tracking-widest mb-4">01</p>
									<h3 className="text-2xl lg:text-3xl font-semibold text-white mb-3 leading-snug">
										100% Lossless Formatting
									</h3>
									<p className="text-white/50 text-sm leading-relaxed">
										Say goodbye to broken formulas and misaligned grids. LaTeX, complex tables — rendered perfectly, every time.
									</p>
								</div>
								{/* Screenshots — scroll-triggered chat→editor swap animation */}
								<div className="absolute inset-x-6 top-[44%] bottom-0 overflow-hidden">
									{/* Chat image — accelerates out (ease-in quick exit) / whoosh return */}
									<div className="absolute inset-0 rounded-t-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
										style={{
											transform: showEditor ? 'translateX(-108%)' : 'translateX(0)',
											opacity: showEditor ? 0 : 1,
											transition: showEditor
												? 'transform 0.34s cubic-bezier(0.4, 0, 1, 0.9), opacity 0.22s ease-in'
												: 'transform 0.58s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
											willChange: 'transform, opacity',
										}}>
										<img src="/chat-image.png" alt="AI chat output" className="w-full block"/>
									</div>

									{/* Editor image — whoosh entry (fast-in slow-out) / accelerates out */}
									<div className="absolute inset-0 rounded-t-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
										style={{
											transform: showEditor ? 'translateX(0)' : 'translateX(108%)',
											opacity: showEditor ? 1 : 0,
											transition: showEditor
												? 'transform 0.58s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out'
												: 'transform 0.34s cubic-bezier(0.4, 0, 1, 0.9), opacity 0.22s ease-in',
											willChange: 'transform, opacity',
										}}>
										<img src="/editor-image.png" alt="Editor output" className="w-full block"/>
									</div>
								</div>
							</div>

							{/* F2 — Dual Editors */}
							<div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-7 overflow-hidden min-h-[260px] relative group
									transition-all duration-300 hover:border-[#0fa478]/35 hover:shadow-lg cursor-default">
								<p className="text-[#94a3b8] text-xs font-semibold tracking-widest mb-4">02</p>
								<h3 className="text-lg font-semibold text-[#0f172a] mb-2 leading-snug">Dual Interchangeable Editors</h3>
								<p className="text-[#64748b] text-xs leading-relaxed mb-6">
									Perfectly support Markdown and Block Editor. Easy to export to your existing notes or just copying Markdown to atlas.
								</p>
								{/* Toggle UI mockup */}
								<div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden
										group-hover:shadow-md group-hover:border-[#0fa478]/25 transition-all duration-300">
									<div className="flex">
										<div className="flex-1 py-2 text-center text-xs text-[#94a3b8] border-b border-[#e2e8f0]">Markdown</div>
										<div className="flex-1 py-2 text-center text-xs font-semibold text-[#0f172a] border-b-2 border-[#0fa478]">Block Editor</div>
									</div>
									<div className="p-4 space-y-2.5">
										<div className="flex items-center gap-2.5">
											<div className="w-3.5 h-3.5 rounded bg-[#0fa478]/20 shrink-0"/>
											<div className="h-2 rounded bg-[#e2e8f0] flex-1"/>
										</div>
										<div className="h-2 rounded bg-[#f1f5f9] w-5/6 ml-6"/>
										<div className="h-2 rounded bg-[#f1f5f9] w-4/6 ml-6"/>
										<div className="flex items-center gap-2.5 pt-1">
											<div className="w-3.5 h-3.5 rounded bg-[#0fa478]/20 shrink-0"/>
											<div className="h-2 rounded bg-[#e2e8f0] flex-1"/>
										</div>
										<div className="h-2 rounded bg-[#f1f5f9] w-3/5 ml-6"/>
									</div>
								</div>
							</div>

							{/* F3 — AI Widget */}
							<div className="bg-[#070f0b] border border-[#0fa478]/20 rounded-2xl p-7 overflow-hidden min-h-[260px] relative group
									transition-all duration-300 hover:border-[#0fa478]/50 hover:shadow-[0_8px_32px_-8px_rgba(15,164,120,0.2)] cursor-default">
								<p className="text-[#0fa478] text-xs font-semibold tracking-widest mb-4">03</p>
								<h3 className="text-lg font-semibold text-white mb-2 leading-snug">Context-Aware AI Widget</h3>
								<p className="text-white/40 text-xs leading-relaxed mb-6">
									Floating widget. Knows what you're reading. No tab-switching.
								</p>
								{/* Floating widget mockup */}
								<div className="bg-[#0d1f16] rounded-xl border border-[#0fa478]/25 p-4 shadow-xl
										group-hover:border-[#0fa478]/45 group-hover:-translate-y-0.5 transition-all duration-300">
									<div className="flex items-center gap-2 mb-3">
										<div className="w-1.5 h-1.5 rounded-full bg-[#0fa478]"/>
										<span className="text-[9px] text-[#0fa478] font-semibold uppercase tracking-widest">Atlas AI</span>
									</div>
									<div className="space-y-1.5 mb-3">
										<div className="h-2 rounded bg-[#1a3326] w-full"/>
										<div className="h-2 rounded bg-[#1a3326] w-5/6"/>
										<div className="h-2 rounded bg-[#1a3326] w-4/6"/>
									</div>
									<div className="flex items-center gap-2 pt-3 border-t border-[#0fa478]/15">
										<div className="flex-1 h-7 rounded-lg bg-[#0f1f18] border border-[#0fa478]/20 flex items-center px-2.5">
											<div className="h-1.5 rounded bg-[#1e3a2f] w-24"/>
										</div>
										<div className="w-7 h-7 rounded-lg bg-[#0fa478] flex items-center justify-center shrink-0">
											<svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/>
											</svg>
										</div>
									</div>
								</div>
							</div>

						</div>{/* end bento grid */}

						{/* ── The Foundation ─────────────────────────────────────────── */}
						<div className="mt-16 pt-12 border-t border-[#ececec]">
							<p className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-8">Also included</p>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
								{[
									{
										icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
										title: "Project & Note Folders",
									desc: "Keep your research isolated and structured."
									},
									{
										icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
										title: "Project-Level Q&A",
									desc: "Chat across multiple sources simultaneously."
									},
									{
										icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
										title: "Cloud Sync",
									desc: "Notes automatically saved and synced."
									},
									{
										icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
										title: "Persistent AI Chat",
									desc: "Full chat history, natively embedded."
									},
								].map(({ icon, title, desc }) => (
									<div key={title} className="flex flex-col gap-2.5">
										<svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon}/>
										</svg>
										<p className="text-sm font-semibold text-[#0f172a]">{title}</p>
										<p className="text-xs text-[#94a3b8] leading-relaxed">{desc}</p>
									</div>
								))}
							</div>
						</div>

					</div>
				</section>


				{/* ── FAQ ──────────────────────────────────────────────────────── */}
				<section id="faq" className="bg-white py-20 lg:py-32 border-t border-[#ececec]">
					<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
						<h2 className="text-3xl lg:text-5xl font-semibold text-[#0f172a] text-center mb-4">
							Questions, answered.
						</h2>
						<p className="text-[#52525b] text-center mb-12">Everything you need to know before you start.</p>

						<div className="space-y-2">
							{[
								{
									q: "What is the main benefit of using Atlas Notebook?",
									a: "Time and sanity. You save hours previously wasted on copying, pasting, and manually fixing broken formatting. Atlas is uniquely optimized to handle and render complex data (like LaTeX and multi-level tables) natively.",
								},
								{
									q: "How is this different from ChatGPT or Claude?",
									a: "Standard AI chatbots force you into a broken loop: screenshot → upload → prompt → copy broken text → paste → manually fix formatting in Notion/Word. Atlas Notebook unifies the PDF, the AI reasoning, and the final note-taking environment into one seamless interface. You keep the context, and you keep the exact formatting.",
								},
								{
									q: "What AI models power Atlas Notebook?",
									a: "We use the latest xAI Grok reasoning model. It delivers incredibly fast, objective, and unfiltered extractions with industry-low hallucination rates, specifically optimized for complex document layouts.",
								},
								{
									q: "I prefer handwritten notes, is this for me?",
									a: "Probably not. Atlas Notebook is heavily optimized for laptop/PC users who need to rapidly extract and structure complex digital information. However, we'd love to hear your use case! Drop us a line at support@atlasnotebook.com.",
								},
								{
									q: "Can Atlas Notebook read formats other than PDF?",
									a: "Currently, we are 100% focused on perfecting the PDF experience. Support for more formats is on our roadmap.",
								},
								{
									q: "Is the free version as good as the paid version?",
									a: "Yes, they share the exact same powerful features. However, because we run expensive, high-tier reasoning models (Grok) to ensure maximum accuracy, the free version has a limited monthly token usage.",
								},
							].map(({ q, a }) => (
								<details key={q} className="group border-b border-[#ececec] pb-2">
									<summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-[#0f172a] text-lg py-4">
										{q}
										<svg className="w-5 h-5 transition-transform group-open:rotate-180 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</summary>
									<p className="text-[#52525b] leading-relaxed mt-2">{a}</p>
								</details>
							))}
						</div>
					</div>
				</section>
				

				<section>
					<PricingSection>
					</PricingSection>
				</section>
				

				{/* ── Final CTA ────────────────────────────────────────────────── */}
				<section className="bg-gradient-to-b from-[#0d5a6b] to-[#1a7a8a] py-20 lg:py-32">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
						<h2 className="text-3xl lg:text-5xl font-semibold text-white mb-6">
							Start reading smarter today
						</h2>
						<p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
							Join now. Get 1 hour of work done in 20 minutes.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
							<input
								type="email"
								placeholder="Email address"
								className="w-full sm:flex-1 bg-white/12 border border-white/25 rounded-full px-6 py-3.5 text-white placeholder:text-white/75 focus:outline-none focus:ring-2 focus:ring-white/50"
							/>
							<Link
								to="/signup"
								className="w-full sm:w-auto bg-white text-[#0f172a] px-8 py-3.5 rounded-full font-semibold hover:bg-white/90 transition text-center"
							>
								Start for free
							</Link>
						</div>
						<p className="text-white/60 text-sm mt-6">Experience the performance Upgrade for free</p>
					</div>
				</section>
				
			</div>
			

		</>
	);
};

export default LandingPage;
