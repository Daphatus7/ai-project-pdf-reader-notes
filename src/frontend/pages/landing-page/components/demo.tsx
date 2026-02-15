import { LucideSparkles } from "lucide-react";

export default function DemoSection() {
  return (
    <section className="w-full px-4 py-16">
      {/* Demo Badge */}
      <div className="flex justify-center mb-8">
        <div className="bg-secondary border border-border rounded-full px-6 py-2 flex items-center gap-3">
          <LucideSparkles />
          <span className="font-medium text-xs text-foreground">
            Demo
          </span>
        </div>
      </div>

      {/* Screenshots Grid - Placeholder */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      </div>
    </section>
  );
}
