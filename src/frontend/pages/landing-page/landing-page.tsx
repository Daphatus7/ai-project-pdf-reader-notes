import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
	ArrowRightIcon,
	LucideArrowRight,
	LucideCog,
	LucideSparkles,
	LucideTarget,
	LucideTrendingUp,
	LucideZap
} from "lucide-react";
import DemoSection from "./components/demo";
import PricingSection from "./pricing";

const LandingPage = () => {
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
		<div className="bg-card min-h-screen w-full">
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

					{/* Navigation */}
					<nav className="hidden md:flex items-center gap-1">
						<a href="#product" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							Product
						</a>
						<a href="#solutions" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							Solutions
						</a>
						<a href="#pricing" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							Pricing
						</a>
						<a href="#resources" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
							Resources
						</a>

					</nav>

					{/* Right side actions */}
					<div className="flex items-center gap-2">
						<Link
							to="/login"
							className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Log in
						</Link>
						<Link
							to="/signup"
							className="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded transition-colors"
						>
							Try for free
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="w-full px-4 py-16 flex flex-col items-center">
				{/* Powered by AI Badge */}
				<div className="bg-secondary border border-border rounded-full px-6 py-2 mb-8 flex items-center gap-3">
					<LucideSparkles />
					<span className="font-medium text-xs text-foreground">
            Powered by AI
          </span>
				</div>

				{/* Main Heading */}
				<h1
					className="font-bold text-5xl md:text-6xl text-center mb-6 bg-clip-text text-transparent"
					style={{
						backgroundImage:
							"linear-gradient(90deg, rgb(15, 23, 43) 0%, rgb(49, 44, 133) 100%)",
						WebkitTextFillColor: "transparent",
						WebkitBackgroundClip: "text",
					}}
				>
					<div>Ask any PDF</div>
					<div>Keep the answers that matter</div>
				</h1>

				{/* Subtitle */}
				<p className="text-foreground text-xl md:text-2xl text-center max-w-4xl mb-12 leading-relaxed">
					Screenshot any section, get structured AI answers, verify them, and insert properly
					formatted tables and formulas directly into your notebook.
				</p>

				{/* CTA Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 mb-12">
					<Link
						to="/signup"
						className="px-8 py-4 rounded-xl text-primary-foreground font-medium text-base flex items-center gap-3 hover:opacity-90 transition-opacity"
						style={{
							backgroundImage:
								"linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%)",
						}}
					>
						Try for free
						<ArrowRightIcon />
					</Link>
					{/*<button className="px-8 py-4 rounded-xl bg-card border-2 border-border text-foreground font-medium text-base hover:border-[#006aff] transition-colors">*/}
					{/*	Watch Demo*/}
					{/*</button>*/}
				</div>

				{/* Features Pills */}
				<div className="flex flex-wrap justify-center gap-8 max-w-4xl">
					{/* Workflow speed / Focus / Productivity pills */}
				<div className="flex items-center gap-2">
						<LucideZap />
						<span className="text-sm text-muted-foreground">
              50% faster Workflow
            </span>
					</div>
					<div className="flex items-center gap-2">
						<LucideTarget />
						<span className="text-sm text-muted-foreground">
              100% Focus
            </span>
					</div>
					<div className="flex items-center gap-2">
						<LucideTrendingUp />
						<span className="text-sm text-muted-foreground">
              200% productivity
            </span>
					</div>
				</div>
			</section>

			<DemoSection />
			
			{/* Features Section */}
			<section id="product" className="w-full px-4 py-20 bg-gradient-to-b from-card to-secondary/50">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<div className="flex justify-center mb-6">
							<div className="bg-secondary border border-border rounded-full px-6 py-2 flex items-center gap-3">
								<LucideCog />
								<span className="font-medium text-xs text-foreground">
                  How it works
                </span>
							</div>
						</div>
						<h2 className="font-bold text-4xl md:text-5xl text-foreground mb-4">
							From PDF to structured notes
						</h2>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
							Three simple steps to transform any document into actionable knowledge
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Feature 1 */}
						<div className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#006aff]/10 to-[#006aff]/5 flex items-center justify-center mb-6">
								<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="#006aff" strokeWidth="1.5">
									<path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
									<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
								</svg>
							</div>
							<h3 className="font-bold text-xl text-foreground mb-3">
								1. Screenshot any section
							</h3>
							<p className="text-muted-foreground leading-relaxed">
								Capture any part of your PDF — tables, equations, diagrams, or text blocks — with a simple screenshot tool.
							</p>
						</div>

						{/* Feature 2 */}
						<div className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F39F6]/10 to-[#4F39F6]/5 flex items-center justify-center mb-6">
								<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="#4F39F6" strokeWidth="1.5">
									<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
								</svg>
							</div>
							<h3 className="font-bold text-xl text-foreground mb-3">
								2. Get AI-structured answers
							</h3>
							<p className="text-muted-foreground leading-relaxed">
								AI analyzes your screenshot and returns properly formatted content — tables, LaTeX formulas, and structured text.
							</p>
						</div>

						{/* Feature 3 */}
						<div className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#009966]/10 to-[#009966]/5 flex items-center justify-center mb-6">
								<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="#009966" strokeWidth="1.5">
									<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
								</svg>
							</div>
							<h3 className="font-bold text-xl text-foreground mb-3">
								3. Insert into your notebook
							</h3>
							<p className="text-muted-foreground leading-relaxed">
								Click to insert verified answers directly into your rich-text notebook, preserving all formatting and structure.
							</p>
						</div>
					</div>
				</div>
			</section>

			<PricingSection />

			{/* CTA Section */}
			<section
				className="w-full px-4 py-20"
				style={{
					backgroundImage:
						"linear-gradient(163.293deg, rgb(15, 23, 43) 0%, rgb(29, 41, 61) 50%, rgb(49, 44, 133) 100%)",
				}}
			>
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="font-bold text-4xl md:text-5xl text-primary-foreground mb-6">
						Start reading smarter today
					</h2>
					<p className="text-lg text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
						Join thousands of researchers who use Atlas Notebook to transform PDFs into structured, actionable knowledge.
					</p>
					<div className="flex flex-col items-center gap-4">
						<Link
							to="/signup"
							className="px-8 py-4 rounded-xl text-foreground font-medium text-base bg-card hover:bg-card/90 transition-colors inline-flex items-center justify-center gap-3"
						>
							Get started for free
							<LucideArrowRight/>
						</Link>
						<p className="text-sm text-primary-foreground/40">
							Questions before getting started?{" "}
							<a href="mailto:support@atlasnotebook.com" className="text-primary-foreground/60 hover:text-primary-foreground/90 underline underline-offset-2 transition-colors duration-200">
								Talk to us.
							</a>
						</p>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="w-full bg-secondary border-t border-border px-4 py-12">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
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
								AI-powered document processing for the modern researcher.
							</p>
						</div>

						{/* Product */}
						<div>
							<h4 className="font-medium text-sm text-foreground mb-3">
								Product
							</h4>
							<ul className="space-y-2">
								<li>
									<a href="#product" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										Features
									</a>
								</li>
								<li>
									<a href="#pricing" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										Pricing
									</a>
								</li>
								<li>
									<a href="#roadmap" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										Roadmap
									</a>
								</li>
							</ul>
						</div>

						{/* Resources */}
						<div>
							<h4 className="font-medium text-sm text-foreground mb-3">
								Resources
							</h4>
							<ul className="space-y-2">
								<li>
									<a href="#docs" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										Documentation
									</a>
								</li>
								<li>
									<a href="#api" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										API Reference
									</a>		
								</li>
								<li>
									<a href="#blog" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
										Blog
									</a>
								</li>
							</ul>
						</div>

					</div>

					{/* Footer Bottom */}
					<div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-sm text-muted-foreground">
							&copy; 2026 Atlas Notebook. All rights reserved.
						</p>
						<div className="flex gap-6">
							<a href="#status" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
								Status
							</a>
							<a href="#security" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
								Security
							</a>
							<a href="#contact" className="text-sm text-muted-foreground hover:text-[#006aff] transition-colors">
								Contact
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
		</>
	);
};

export default LandingPage;
