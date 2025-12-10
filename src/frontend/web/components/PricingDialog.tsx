import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.tsx";
import { Check, X, Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "./ui/utils.ts";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    icon: Sparkles,
    features: [
      { text: "Up to 10 notes", included: true },
      { text: "Basic markdown editor", included: true },
      { text: "PDF viewer", included: true },
      { text: "100 AI messages/month", included: true },
      { text: "Cloud sync", included: false },
      { text: "Unlimited notes", included: false },
      { text: "Advanced AI models", included: false },
      { text: "Priority support", included: false },
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
    highlight: false,
  },
  {
    name: "Monthly",
    price: "$12",
    period: "per month",
    description: "For productive individuals",
    icon: Zap,
    features: [
      { text: "Unlimited notes", included: true },
      { text: "Advanced markdown editor", included: true },
      { text: "PDF annotations", included: true },
      { text: "Unlimited AI messages", included: true },
      { text: "Cloud sync", included: true },
      { text: "Advanced AI models (GPT-4)", included: true },
      { text: "Priority support", included: true },
      { text: "Export to multiple formats", included: true },
    ],
    buttonText: "Subscribe Monthly",
    buttonVariant: "default" as const,
    highlight: false,
  },
  {
    name: "Yearly",
    price: "$99",
    originalPrice: "$144",
    period: "per year",
    badge: "BEST VALUE - Save $45",
    description: "Most popular choice",
    icon: Crown,
    bonusText: "🎁 Get 2 months FREE",
    features: [
      { text: "Everything in Monthly", included: true },
      { text: "Save 31% compared to monthly", included: true },
      { text: "Early access to new features", included: true },
      { text: "Custom AI model fine-tuning", included: true },
      { text: "Offline mode", included: true },
      { text: "Team collaboration (up to 5)", included: true },
      { text: "Advanced analytics", included: true },
      { text: "API access", included: true },
      { text: "24/7 Priority support", included: true },
    ],
    buttonText: "Get Yearly - Best Deal 🚀",
    buttonVariant: "default" as const,
    highlight: true,
  },
];

export function PricingDialog({ open, onOpenChange }: PricingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl lg:text-3xl">
            Unlock Your Full Potential with NoteFlow AI
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base mt-1 sm:mt-2 px-2">
            Join thousands of productive users. Choose the plan that works for you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6 lg:mt-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-xl border-2 p-4 sm:p-6 flex flex-col transition-all",
                  plan.highlight
                    ? "border-primary shadow-2xl lg:scale-105 bg-primary/5 md:col-span-2 lg:col-span-1"
                    : "border-border hover:border-primary/50"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto">
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg animate-pulse block text-center">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4 sm:mb-6">
                  <div className={cn(
                    "inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-2 sm:mb-3",
                    plan.highlight ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6",
                      plan.highlight ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  
                  <h3 className={cn(
                    "text-lg sm:text-xl mb-2 sm:mb-3",
                    plan.highlight && "text-primary"
                  )}>
                    {plan.name}
                  </h3>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      {plan.originalPrice && (
                        <span className="text-base sm:text-xl text-muted-foreground line-through">
                          {plan.originalPrice}
                        </span>
                      )}
                      <span className={cn(
                        "text-3xl sm:text-4xl lg:text-5xl",
                        plan.highlight && "text-primary"
                      )}>
                        {plan.price}
                      </span>
                    </div>
                    {plan.period && (
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  
                  {plan.bonusText && (
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 mt-2 sm:mt-3">
                      <span className="text-xs sm:text-sm text-green-700 dark:text-green-400">
                        {plan.bonusText}
                      </span>
                    </div>
                  )}
                  
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">
                    {plan.description}
                  </p>
                </div>

                <div className="flex-1 space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      {feature.included ? (
                        <div className={cn(
                          "shrink-0 mt-0.5 rounded-full p-0.5",
                          plan.highlight ? "bg-primary/20" : "bg-muted"
                        )}>
                          <Check className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4",
                            plan.highlight ? "text-primary" : "text-foreground"
                          )} />
                        </div>
                      ) : (
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={cn(
                          "text-xs sm:text-sm leading-tight",
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground/60 line-through"
                        )}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={plan.buttonVariant}
                  className={cn(
                    "w-full h-10 sm:h-11 text-sm sm:text-base",
                    plan.highlight && "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                  )}
                  disabled={plan.name === "Free"}
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 sm:mt-6 lg:mt-8 space-y-2 sm:space-y-3 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
              <span>14-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
              <span>Secure payment</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-4">
            Over 10,000 users have upgraded to Pro. Join them today! 🚀
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
