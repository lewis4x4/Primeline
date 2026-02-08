import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Hero */}
      <section className="text-center mb-20">
        <h1 className="font-sans font-semibold text-5xl tracking-tight mb-4">
          Know Your Worth.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Data-driven NIL valuations and brand matching for college athletes.
          Free, instant, and built on real market data.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/calculator"
            className="bg-foreground text-background px-6 py-3 text-sm font-medium rounded hover:opacity-90 transition-opacity"
          >
            Calculate Your NIL Value
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Sign In
            </Link>
          )}
        </div>
      </section>

      {/* Value Props */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-2">Data-Driven Valuations</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered NIL valuation based on your social reach, engagement rate,
            sport, skill level, and market conditions.
          </p>
        </div>
        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-2">Brand-Athlete Matching</h3>
          <p className="text-sm text-muted-foreground">
            Algorithmic matching connects athletes to the right brand
            opportunities based on audience fit, content style, and budget.
          </p>
        </div>
        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-2">Market Rate Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Real-time rate benchmarks by sport, platform, and content type so you
            never leave money on the table.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-20">
        <h2 className="font-semibold text-lg text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="value-display text-3xl mb-2">1</p>
            <h3 className="font-semibold text-sm mb-1">Enter Your Info</h3>
            <p className="text-sm text-muted-foreground">
              Sport, school, social handles, and engagement metrics.
            </p>
          </div>
          <div className="text-center">
            <p className="value-display text-3xl mb-2">2</p>
            <h3 className="font-semibold text-sm mb-1">Get Your Valuation</h3>
            <p className="text-sm text-muted-foreground">
              Instant annual NIL range, per-post rates, and percentile ranking.
            </p>
          </div>
          <div className="text-center">
            <p className="value-display text-3xl mb-2">3</p>
            <h3 className="font-semibold text-sm mb-1">Connect with Brands</h3>
            <p className="text-sm text-muted-foreground">
              Get matched with brands that fit your audience and values.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center border-t border-border pt-12">
        <h2 className="font-semibold text-2xl tracking-tight mb-3">
          Ready to find out?
        </h2>
        <Link
          to="/calculator"
          className="bg-foreground text-background px-6 py-3 text-sm font-medium rounded hover:opacity-90 transition-opacity inline-block"
        >
          Calculate Your NIL Value
        </Link>
      </section>
    </div>
  );
}
