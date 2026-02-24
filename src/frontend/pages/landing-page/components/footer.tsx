import { LucideSparkles } from "lucide-react";

/* Site-wide footer with company info, navigation links, and legal bar */
const FooterSection = () => {
	return (
		<footer className="w-full bg-secondary border-t border-border px-4 py-12">
			<div className="max-w-7xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
					{/* Company branding and tagline */}
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

					{/* Product navigation links */}
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

					{/* Resources navigation links */}
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

				{/* Legal bar: copyright and utility links */}
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
	);
};

export default FooterSection;
