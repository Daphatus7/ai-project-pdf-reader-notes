import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

/* ─── Landing Page ────────────────────────────────────────────────────────────
   New design: teal hero + problems / workflow / features / FAQ sections.
   Replaced old card-based design; drops i18n, PainPointSection, PricingSection.
   SVG illustrations are inlined (source file svg-gw25jj2mok not in repo).
───────────────────────────────────────────────────────────────────────────── */

const LandingPage = () => {
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
								<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
									<path d="M12 2 L13.8 9 L21 12 L13.8 15 L12 22 L10.2 15 L3 12 L10.2 9 Z" fill="white" />
								</svg>
								<span className="text-white font-bold text-sm">Powered by Grok AI</span>
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
				<section id="problems" className="bg-[#fafaf7] py-20 lg:py-32">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-20">
							<h2 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-1.4px] mb-2">
								<span className="text-[#0f172a]">You read to understand.</span>
							</h2>
							<p className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-1.4px] text-[#9ca3af]">
								But the process keeps getting in the way.
							</p>
						</div>

						{/* Problem 01 */}
						<div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-32">
							<div className="order-2 md:order-1">
								<div className="flex items-center gap-3 mb-6">
									<div className="w-6 h-px bg-[#0fa478]"></div>
									<span className="text-[#0fa478] text-sm font-medium tracking-widest uppercase">Problem 01</span>
								</div>
								<h3 className="text-3xl lg:text-[38px] font-semibold text-[#0f172a] mb-6 leading-tight tracking-tight">
									AI explains better — but getting there kills your focus.
								</h3>
								<p className="text-[#52525b] text-lg leading-relaxed">
									You want AI to explain exactly where you're stuck, but the prompting, screenshotting, and app-switching kills your focus.
								</p>
							</div>
							{/* 3 document cards connected by dashed arrows */}
							<div className="order-1 md:order-2 bg-gradient-to-br from-[#eef9f4] to-[#dff2e8] rounded-2xl p-12 flex items-center justify-center min-h-[400px]" style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 0.26144%,rgba(0,0,0,0) 0.26144%),linear-gradient(90deg,rgba(21,204,145,0.06) 0.19608%,rgba(0,0,0,0) 0.19608%),linear-gradient(143.13deg,rgb(238,249,244) 0%,rgb(223,242,232) 100%)" }}>
								<svg className="w-full max-w-sm opacity-85" viewBox="0 0 280.5 205.695" fill="none">
									<g opacity="0.85">
										{/* Card 1 */}
										<rect x="14.5" y="2" width="112" height="92" rx="5.6" stroke="#15CC91" strokeOpacity="0.7" strokeWidth="1.40247" />
										<path d="M18.703 44.8789H121.55" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										<circle cx="29.9227" cy="36.4641" r="2.33748" fill="#15CC91" />
										<path d="M29.9227 56.0986H107.526" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<path d="M29.9227 67.3184H93.5011" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<path d="M29.9227 78.5381H102.851" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										{/* Card 2 */}
										<rect x="145.5" y="25" width="120" height="92" rx="5.6" stroke="#15CC91" strokeOpacity="0.7" strokeWidth="1.40247" />
										<path d="M149.6 68.2533H261.797" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										<circle cx="160.82" cy="59.8385" r="2.33748" fill="#15CC91" />
										<path d="M160.82 81.343H243.098" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<path d="M160.82 93.4977H224.398" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<path d="M160.82 105.652H238.423" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										{/* Card 3 */}
										<rect x="51.5" y="89" width="131.5" height="92" rx="5.6" stroke="#15CC91" strokeOpacity="0.7" strokeWidth="1.40247" />
										<path d="M56.102 133.702H177.649" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										<circle cx="67.3218" cy="125.287" r="2.33748" fill="#15CC91" />
										<path d="M67.3218 146.791H163.624" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<path d="M67.3218 158.946H149.6" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										{/* Dashed connectors between cards */}
										<path d="M126.5 48 Q 136 54 145.5 70" stroke="#15CC91" strokeDasharray="2.8 2.8" strokeOpacity="0.5" strokeWidth="1.40247" />
										<path d="M205.5 117 Q 190 122 183 119" stroke="#15CC91" strokeDasharray="2.8 2.8" strokeOpacity="0.5" strokeWidth="1.40247" />
										<path d="M51.5 110 Q 42 100 70 94" stroke="#15CC91" strokeDasharray="2.8 2.8" strokeOpacity="0.5" strokeWidth="1.40247" />
									</g>
								</svg>
							</div>
						</div>

						{/* Problem 02 */}
						<div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-32">
							<div className="bg-gradient-to-br from-[#eef9f4] to-[#dff2e8] rounded-2xl p-12 flex items-center justify-center min-h-[400px]" style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 0.26144%,rgba(0,0,0,0) 0.26144%),linear-gradient(90deg,rgba(21,204,145,0.06) 0.19608%,rgba(0,0,0,0) 0.19608%),linear-gradient(143.13deg,rgb(238,249,244) 0%,rgb(223,242,232) 100%)" }}>
								<svg className="w-full max-w-sm opacity-85" viewBox="0 0 280.5 205.695" fill="none">
									<g opacity="0.85">
										{/* Document outline */}
										<rect x="60" y="20" width="160" height="165" rx="5.6" stroke="#15CC91" strokeOpacity="0.8" strokeWidth="1.40247" />
										{/* Header line */}
										<path d="M88.83 52.12H191.678" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										{/* Question mark circles */}
										<circle cx="89.79" cy="65.79" r="13.79" stroke="#15CC91" strokeOpacity="0.6" strokeWidth="1.40247" />
										<text x="89.79" y="71" fontFamily="Inter" fontWeight="bold" fontSize="14.96" fill="#15cc91" textAnchor="middle">?</text>
										<circle cx="234.5" cy="122.29" r="13.79" stroke="#15CC91" strokeOpacity="0.6" strokeWidth="1.40247" />
										<text x="234.5" y="128.2" fontFamily="Inter" fontWeight="bold" fontSize="14.96" fill="#15cc91" textAnchor="middle">?</text>
										{/* Exclamation circle */}
										<circle cx="224.85" cy="47.42" r="10.051" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										<text x="224.85" y="52.5" fontFamily="Inter" fontWeight="bold" fontSize="11.22" fill="#15cc91" textAnchor="middle">!</text>
									</g>
								</svg>
							</div>
							<div>
								<div className="flex items-center gap-3 mb-6">
									<div className="w-6 h-px bg-[#0fa478]"></div>
									<span className="text-[#0fa478] text-sm font-medium tracking-widest uppercase">Problem 02</span>
								</div>
								<h3 className="text-3xl lg:text-[38px] font-semibold text-[#0f172a] mb-6 leading-tight tracking-tight">
									You fed AI the full PDF — but you can't trust the output.
								</h3>
								<p className="text-[#52525b] text-lg leading-relaxed">
									Answers come with hallucinations, omissions, and no way to verify. You end up fact-checking the thing that was supposed to save you time.
								</p>
							</div>
						</div>

						{/* Problem 03 */}
						<div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
							<div className="order-2 md:order-1">
								<div className="flex items-center gap-3 mb-6">
									<div className="w-6 h-px bg-[#0fa478]"></div>
									<span className="text-[#0fa478] text-sm font-medium tracking-widest uppercase">Problem 03</span>
								</div>
								<h3 className="text-3xl lg:text-[38px] font-semibold text-[#0f172a] mb-6 leading-tight tracking-tight">
									The answers are good. Your notebook can't handle them.
								</h3>
								<p className="text-[#52525b] text-lg leading-relaxed">
									Tables, equations, formatted content — AI finally gives you what you need, but you're stuck copying, pasting, and fixing. No notebook supports AI output natively.
								</p>
							</div>
							<div className="order-1 md:order-2 bg-gradient-to-br from-[#eef9f4] to-[#dff2e8] rounded-2xl p-12 flex items-center justify-center min-h-[400px]" style={{ backgroundImage: "linear-gradient(rgba(21,204,145,0.06) 0.26144%,rgba(0,0,0,0) 0.26144%),linear-gradient(90deg,rgba(21,204,145,0.06) 0.19608%,rgba(0,0,0,0) 0.19608%),linear-gradient(143.13deg,rgb(238,249,244) 0%,rgb(223,242,232) 100%)" }}>
								<svg className="w-full max-w-sm opacity-85" viewBox="0 0 280.5 205.695" fill="none">
									<g opacity="0.85">
										{/* Document outline */}
										<rect x="14.5" y="2" width="252" height="201" rx="5.6" stroke="#15CC91" strokeOpacity="0.7" strokeWidth="1.40247" />
										{/* Formula */}
										<text x="30" y="45" fontFamily="Inter" fontStyle="italic" fontSize="12.16" fill="#15cc91">∫ f(x)dx</text>
										{/* Table */}
										<rect x="30" y="67.3" width="83.15" height="36.4" stroke="#15CC91" strokeOpacity="0.6" strokeWidth="1.40247" rx="2" />
										<line x1="30" y1="80.3" x2="113.15" y2="80.3" stroke="#15CC91" strokeOpacity="0.5" strokeWidth="1.40247" />
										<line x1="30" y1="92.8" x2="113.15" y2="92.8" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="1.40247" />
										<line x1="58" y1="67.3" x2="58" y2="103.7" stroke="#15CC91" strokeOpacity="0.4" strokeWidth="1.40247" />
										<line x1="86" y1="67.3" x2="86" y2="103.7" stroke="#15CC91" strokeOpacity="0.4" strokeWidth="1.40247" />
									</g>
								</svg>
							</div>
						</div>
					</div>
				</section>

				{/* ── Workflow ─────────────────────────────────────────────────── */}
				<section id="workflow" className="bg-white py-20 lg:py-32">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-16">
							<p className="text-[#0fa478] text-xs font-medium tracking-widest uppercase mb-6">The Workflow</p>
							<h2 className="text-3xl lg:text-5xl font-semibold text-[#0f172a] mb-4 tracking-tight">
								From source to knowledge in<br />seconds.
							</h2>
							<p className="text-[#6b7280] text-lg max-w-3xl mx-auto">
								A three-step flow built for documents that fight back — dense PDFs, nested tables, and equations that other tools choke on.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{/* Step 1 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="bg-gradient-to-br from-[#f6faf8] to-[#eef7f2] rounded-xl h-48 mb-6 flex items-center justify-center">
									<svg className="w-full h-full p-8" viewBox="0 0 374.664 195.914" fill="none">
										{/* PDF viewer mockup */}
										<rect x="30" y="10" width="314.664" height="175.914" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="0.983325" opacity="0.5" />
										{/* Sidebar lines (simulated text) */}
										<rect x="39.74" y="35" width="60" height="6" fill="#CBD5E1" opacity="0.6" rx="2" />
										<rect x="39.74" y="46.8" width="80" height="5" fill="#E2E8F0" opacity="0.6" rx="2" />
										<rect x="39.74" y="58.6" width="70" height="5" fill="#E2E8F0" opacity="0.6" rx="2" />
										{/* Action popup */}
										<rect x="79.5" y="76.3" width="181" height="90.5" fill="white" stroke="#E2E8F0" strokeWidth="0.983325" rx="2" />
										<rect x="79.5" y="76.3" width="181" height="27.5" fill="#F9FAFB" rx="2" />
										<circle cx="92.5" cy="90" r="3.93" fill="#15CC91" />
										<rect x="106" y="86" width="68" height="4.92" fill="#0F172A" rx="2" />
										{/* Action buttons */}
										<rect x="93.5" y="114" width="67" height="21.6" fill="#E6FAF3" stroke="#15CC91" strokeOpacity="0.3" strokeWidth="0.98" rx="2" />
										<text x="127" y="129" fontFamily="Inter" fontWeight="bold" fontSize="9.83" fill="#0fa478" textAnchor="middle">Explain</text>
										<rect x="182.5" y="114" width="67" height="21.6" fill="#F1F5F9" rx="2" />
										<text x="216" y="129" fontFamily="Inter" fontSize="9.83" fill="#475569" textAnchor="middle">Extract</text>
										<rect x="93.5" y="139" width="67" height="21.6" fill="#F1F5F9" rx="2" />
										<text x="127" y="154" fontFamily="Inter" fontSize="9.83" fill="#475569" textAnchor="middle">Summarize</text>
										<rect x="182.5" y="139" width="67" height="21.6" fill="#F1F5F9" rx="2" />
										<text x="216" y="154" fontFamily="Inter" fontSize="9.83" fill="#475569" textAnchor="middle">Translate</text>
									</svg>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									One-click capture from any source.
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Select text on any page — your AI-enhanced note appears instantly. No context switching, no copy-paste.
								</p>
							</div>

							{/* Step 2 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="bg-gradient-to-br from-[#f6faf8] to-[#eef7f2] rounded-xl h-48 mb-6 flex items-center justify-center">
									<div className="text-6xl">🔍</div>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									AI reads, extracts, explains — inline.
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Grok AI processes your selection in context. Tables become tables. Equations render perfectly. Citations link back.
								</p>
							</div>

							{/* Step 3 */}
							<div className="bg-white border border-[#ececec] rounded-2xl p-8">
								<div className="bg-gradient-to-br from-[#f6faf8] to-[#eef7f2] rounded-xl h-48 mb-6 flex items-center justify-center">
									<div className="text-6xl">📝</div>
								</div>
								<h3 className="text-xl font-semibold text-[#0f172a] mb-3 tracking-tight">
									Your note builds itself, formatted and linked.
								</h3>
								<p className="text-[#6b7280] text-sm leading-relaxed">
									Zero manual work. The note appears in your graph, connected to related ideas, ready to search and reference.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* ── Features ─────────────────────────────────────────────────── */}
				<section id="features" className="bg-[#0a1628] py-20 lg:py-32">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-16">
							<h2 className="text-3xl lg:text-5xl font-semibold text-white mb-4">
								Built for maximum AI compatibility.
							</h2>
							<p className="text-white/70 text-lg max-w-2xl mx-auto">
								The first notebook designed from the ground up for AI-assisted learning.
							</p>
						</div>

						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
							{[
								{ num: "01", tag: "Formatting", title: "100% lossless formatting.", icon: "📄", desc: "LaTeX, nested tables, code blocks — rendered pixel-perfect. The only notebook that treats AI output as a first-class citizen, not plain text." },
								{ num: "02", tag: "Search", title: "Find anything, instantly.", icon: "🔍", desc: "Semantic search across all your notes. Ask in plain language, get the exact answer — even if you never used those words." },
								{ num: "03", tag: "Speed", title: "Native PDF support.", icon: "⚡", desc: "Works directly inside your PDF. No preprocessing, no conversion, no upload." },
								{ num: "04", tag: "AI", title: "Context-aware responses.", icon: "🤖", desc: "AI sees your entire knowledge base. Answers connect to what you already know, building on previous notes automatically." },
								{ num: "05", tag: "Linking", title: "Bi-directional linking, automatic.", icon: "🔗", desc: "Your knowledge graph builds itself. Connections surface organically — no manual tagging required." },
								{ num: "06", tag: "Citations", title: "Inline citations always.", icon: "✨", desc: "Every AI-generated claim links back to source material. Verify, cross-reference, and learn with confidence." },
							].map(({ num, tag, title, icon, desc }) => (
								<div key={num} className="bg-[#111c2f] border border-white/8 rounded-2xl p-8">
									<div className="bg-gradient-to-br from-[#f6faf8] to-[#eef7f2] rounded-xl h-56 mb-6 flex items-center justify-center">
										<div className="text-6xl">{icon}</div>
									</div>
									<div className="text-[#4ade80] text-xs font-semibold tracking-widest uppercase mb-3">{num} / {tag}</div>
									<h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{title}</h3>
									<p className="text-[#94a3b8] text-sm leading-relaxed">{desc}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* ── Everything Else ──────────────────────────────────────────── */}
				<section className="bg-white py-20 lg:py-32">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-16">
							<h2 className="text-3xl lg:text-5xl font-semibold text-[#0f172a] mb-4">
								Everything else, already<br />handled.
							</h2>
							<p className="text-[#52525b] text-lg max-w-2xl mx-auto">
								All the table stakes you expect, plus details you didn't know you needed.
							</p>
						</div>

						<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
							{[
								{ icon: "🔒", title: "End-to-end encryption.", desc: "Your notes stay private. Always." },
								{ icon: "☁️", title: "Real-time sync.", desc: "Seamless across all devices." },
								{ icon: "📱", title: "Mobile-first design.", desc: "Full power, pocket-sized." },
								{ icon: "⌨️", title: "Keyboard shortcuts.", desc: "Never touch the mouse." },
							].map(({ icon, title, desc }) => (
								<div key={title} className="text-center">
									<div className="text-4xl mb-4">{icon}</div>
									<h3 className="text-lg font-semibold text-[#0f172a] mb-2">{title}</h3>
									<p className="text-[#71717a] text-sm">{desc}</p>
								</div>
							))}
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

						<div className="space-y-4">
							{[
								{
									q: "How is this different from Notion AI or Obsidian?",
									a: "Notion AI bolts AI onto an existing product. Obsidian requires manual linking and doesn't support rich AI output. Atlas was designed AI-first: formatting, search, and capture all assume you're working with AI-generated content, not fighting it.",
								},
								{
									q: "Does it work offline?",
									a: "Yes. All your notes are stored locally and sync when you reconnect. AI features require internet, but reading, editing, and searching work offline.",
								},
								{
									q: "Can I export my data?",
									a: "Always. Export to Markdown, PDF, or HTML with one click. Your data belongs to you — no lock-in, no vendor dependency.",
								},
								{
									q: "What AI model powers this?",
									a: "We use Grok AI for all reasoning tasks. You can switch between models (GPT-4, Claude, Llama) in settings if you prefer, but Grok delivers the best balance of speed and accuracy for note-taking.",
								},
								{
									q: "How much does it cost?",
									a: "Free tier includes 100 AI queries per month. Pro is $12/month for unlimited queries, priority support, and early access to new features. Students get 50% off with a .edu email.",
								},
								{
									q: "Is the free tier truly free, or will quality be degraded?",
									a: "Yes — same features, same quality. But because we run premium reasoning models (Grok) to guarantee accuracy, the free tier has a monthly token cap.",
								},
							].map(({ q, a }) => (
								<details key={q} className="group border-b border-[#ececec] pb-6">
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

				{/* ── Final CTA ────────────────────────────────────────────────── */}
				<section className="bg-gradient-to-b from-[#0d5a6b] to-[#1a7a8a] py-20 lg:py-32">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
						<h2 className="text-3xl lg:text-5xl font-semibold text-white mb-6">
							Stop fighting your tools.<br />Start learning.
						</h2>
						<p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
							Join thousands of students and researchers who've already made the switch.
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
								Get started free
							</Link>
						</div>
						<p className="text-white/60 text-sm mt-6">No credit card required • 100 free queries per month</p>
					</div>
				</section>
			</div>
		</>
	);
};

export default LandingPage;
