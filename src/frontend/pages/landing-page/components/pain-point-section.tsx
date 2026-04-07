import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../../i18n/language-context";

// ─── Math helpers ────────────────────────────────────────────────────────────

/** Ease-in-out curve so transitions feel organic rather than mechanical */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Crossfade window: each slide fades over this fraction of total scroll progress */
const FADE = 0.05;
const BOUNDARIES = [0.25, 0.5, 0.75]; // transition points between 4 slides

/**
 * Compute opacity for slide `index` at current scroll `progress` [0, 1].
 * Slides crossfade across a ±FADE window around each boundary —
 * both neighbouring slides are partially visible simultaneously (true crossfade).
 */
const slideOpacity = (index: number, p: number): number => {
	if (index === 0) {
		const b = BOUNDARIES[0];
		if (p <= b - FADE) return 1;
		if (p <= b + FADE) return ease((b + FADE - p) / (2 * FADE));
		return 0;
	}
	if (index === 3) {
		const b = BOUNDARIES[2];
		if (p <= b - FADE) return 0;
		if (p <= b + FADE) return ease((p - (b - FADE)) / (2 * FADE));
		return 1;
	}
	// Middle slides fade in at boundary[index-1], fade out at boundary[index]
	const bIn = BOUNDARIES[index - 1];
	const bOut = BOUNDARIES[index];
	if (p <= bIn - FADE) return 0;
	if (p <= bIn + FADE) return ease((p - (bIn - FADE)) / (2 * FADE));
	if (p <= bOut - FADE) return 1;
	if (p <= bOut + FADE) return ease((bOut + FADE - p) / (2 * FADE));
	return 0;
};

/**
 * Vertical offset (px): future slides wait 28px below, past slides exit 28px above.
 * Interpolated via opacity so it moves exactly in sync with the crossfade.
 */
const slideTranslate = (index: number, p: number): number => {
	const op = slideOpacity(index, p);
	if (op >= 1) return 0;
	const center = (index + 0.5) / 4;
	return (p < center ? 28 : -28) * (1 - op);
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Apple-style sticky scroll reveal.
 *
 * The wrapper is 700vh — this gives ~150vh of "scroll budget" per slide.
 * The inner sticky container stays pinned; scroll progress drives crossfades
 * directly via inline styles (no CSS transition, no discrete state jumps).
 * rAF batching keeps renders smooth without flooding React on every scroll tick.
 */
const PainPointSection = () => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [progress, setProgress] = useState(0);
	const rafRef = useRef<number>();
	const latestP = useRef(0);
	const { t } = useLanguage();

	// Respect user's reduced-motion preference — skip animation, show all slides statically
	const prefersReducedMotion =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;

		// Walk up the DOM to find the overflow-y-auto scroll container
		let sc: HTMLElement | null = wrapper.parentElement;
		while (sc && !["auto", "scroll"].includes(getComputedStyle(sc).overflowY)) {
			sc = sc.parentElement;
		}
		if (!sc) return;

		const scrollEl = sc;

		const onScroll = () => {
			const wr = wrapper.getBoundingClientRect();
			const sr = scrollEl.getBoundingClientRect();
			latestP.current = Math.max(
				0,
				Math.min(1, (sr.top - wr.top) / (wrapper.offsetHeight - scrollEl.offsetHeight))
			);
			// Batch via rAF — avoids a React setState on every single scroll pixel
			if (!rafRef.current) {
				rafRef.current = requestAnimationFrame(() => {
					setProgress(latestP.current);
					rafRef.current = undefined;
				});
			}
		};

		scrollEl.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			scrollEl.removeEventListener("scroll", onScroll);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	// Background switches at the midpoint of each transition (Math.round, not floor)
	const activeBg = Math.min(3, Math.round(progress * 4));
	const bgClass = activeBg % 2 === 0 ? "bg-card" : "bg-secondary";

	// Shared style builder for each slide wrapper
	const slideStyle = (i: number): React.CSSProperties => ({
		opacity: slideOpacity(i, progress),
		transform: `translateY(${slideTranslate(i, progress)}px)`,
		pointerEvents: slideOpacity(i, progress) < 0.05 ? "none" : "auto",
	});

	// Slide 1 stagger: items enter sequentially from below on entry, exit together
	const s1Opacity = slideOpacity(1, progress);
	const s1Entering = progress < 0.375; // center of slide 1's zone

	// Static fallback for users who prefer reduced motion — all slides visible, no scroll animation
	if (prefersReducedMotion) {
		return (
			<div className="w-full bg-card py-24 px-8 space-y-16">
				<div className="max-w-xl mx-auto text-center">
					<p className="text-4xl md:text-5xl text-foreground font-medium leading-snug">{t.pain.card1Line1}</p>
					<p className="text-4xl md:text-5xl text-muted-foreground font-medium leading-snug mt-3">{t.pain.card1Line2}</p>
				</div>
				<div className="max-w-xl mx-auto text-center space-y-4">
					{t.pain.card2Items.map((line) => (
						<p key={line} className="text-2xl md:text-3xl text-muted-foreground">{line}</p>
					))}
				</div>
				<div className="max-w-xl mx-auto text-center">
					<p className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.pain.card3Verdict}</p>
					<p className="text-4xl md:text-5xl text-muted-foreground font-medium mb-8">{t.pain.card3Label}</p>
					<p className="text-lg text-muted-foreground">{t.pain.card3Message}</p>
				</div>
				<div className="max-w-xl mx-auto text-center">
					<p className="text-4xl md:text-5xl font-bold text-foreground mb-6">{t.pain.card4Title}</p>
					<p className="text-4xl md:text-5xl text-muted-foreground font-medium mb-6">{t.pain.card4Subtitle}</p>
					<p className="text-lg text-muted-foreground mb-16">{t.pain.card4Detail}</p>
					<Link to="/signup" className="inline-block bg-foreground text-background px-8 py-4 rounded-full text-lg font-medium hover:opacity-80 transition-opacity">
						{t.pain.card4Cta}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div ref={wrapperRef} className="relative h-[700vh]">
			{/* Sticky viewport — stays pinned while user scrolls through the tall wrapper */}
			<div className={`sticky top-0 h-screen overflow-hidden transition-colors duration-500 ${bgClass}`}>

				{/* Progress dots — decorative scroll indicator, not interactive */}
				<div aria-hidden="true" className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
					{[0, 1, 2, 3].map((i) => {
						const op = slideOpacity(i, progress);
						return (
							<div
								key={i}
								className="rounded-full bg-foreground transition-all duration-300"
								style={{
									width: op > 0.5 ? 8 : 5,
									height: op > 0.5 ? 8 : 5,
									opacity: 0.2 + op * 0.8,
								}}
							/>
						);
					})}
				</div>

				{/* Slide 0: The observation */}
				<div className="absolute inset-0 flex items-center justify-center px-8" style={slideStyle(0)}>
					<div className="max-w-xl text-center">
						<p className="text-4xl md:text-5xl text-foreground font-medium leading-snug">
							{t.pain.card1Line1}
						</p>
						<p className="text-4xl md:text-5xl text-muted-foreground font-medium leading-snug mt-3">
							{t.pain.card1Line2}
						</p>
					</div>
				</div>

				{/* Slide 1: The reality — list items stagger in from below on entry */}
				<div className="absolute inset-0 flex items-center justify-center px-8" style={slideStyle(1)}>
					<div className="max-w-xl w-full text-center space-y-5">
						{t.pain.card2Items.map(
							(line, i) => (
								<p
									key={line}
									className="text-2xl md:text-3xl text-muted-foreground"
									style={{
										// Stagger only during entry: each item lags by 10px × its index
										transform: s1Entering
											? `translateY(${(1 - s1Opacity) * i * 10}px)`
											: undefined,
									}}
								>
									{line}
								</p>
							)
						)}
					</div>
				</div>

				{/* Slide 2: The verdict */}
				<div className="absolute inset-0 flex items-center justify-center px-8" style={slideStyle(2)}>
					<div className="max-w-xl text-center">
						<p className="text-4xl md:text-5xl font-bold text-foreground mb-4">
							{t.pain.card3Verdict}
						</p>
						<p className="text-4xl md:text-5xl text-muted-foreground font-medium mb-8">
							{t.pain.card3Label}
						</p>
						<p className="text-lg text-muted-foreground">
							{t.pain.card3Message}
						</p>
					</div>
				</div>

				{/* Slide 3: The payoff + CTA */}
				<div className="absolute inset-0 flex items-center justify-center px-8" style={slideStyle(3)}>
					<div className="max-w-xl text-center">
						<p className="text-4xl md:text-5xl font-bold text-foreground mb-6">
							{t.pain.card4Title}
						</p>
						<p className="text-4xl md:text-5xl text-muted-foreground font-medium mb-6">
							{t.pain.card4Subtitle}
						</p>
						<p className="text-lg text-muted-foreground mb-16">
							{t.pain.card4Detail}
						</p>
						<Link
							to="/signup"
							className="inline-block bg-foreground text-background px-8 py-4 rounded-full text-lg font-medium hover:opacity-80 transition-opacity"
						>
							{t.pain.card4Cta}
						</Link>
					</div>
				</div>

			</div>
		</div>
	);
};

export default PainPointSection;
