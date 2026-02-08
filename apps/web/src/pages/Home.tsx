import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const stats = [
  { value: "$2.4M+", label: "Deal Value Managed" },
  { value: "500+", label: "Athletes Valued" },
  { value: "150+", label: "Brand Partners" },
  { value: "24hr", label: "Avg Response Time" },
];

const services = [
  {
    title: "NIL Valuation",
    description:
      "Data-driven valuations built on real market data. Know exactly what your name, image, and likeness is worth across every platform.",
  },
  {
    title: "Brand Matching",
    description:
      "Algorithmic matching connects athletes to brand opportunities based on audience fit, content style, and budget alignment.",
  },
  {
    title: "Deal Management",
    description:
      "Full-pipeline deal tracking from first contact to signed contract. Compliance checks, outreach automation, and revenue tracking built in.",
  },
  {
    title: "Market Intelligence",
    description:
      "Real-time rate benchmarks, deal intel, and competitive analysis so you never leave money on the table.",
  },
];

const athleteBenefits = [
  "Free instant NIL valuation",
  "Matched to brands that fit your audience",
  "Deal negotiation support & compliance tracking",
  "Per-post rate benchmarks by sport and platform",
];

const brandBenefits = [
  "Athlete discovery by sport, school, and audience",
  "Real-time rate intelligence across tiers",
  "Campaign management and deal pipeline",
  "ROI analytics and performance tracking",
];

const steps = [
  {
    num: "01",
    title: "Enter Your Info",
    description: "Sport, school, social handles, and engagement metrics.",
  },
  {
    num: "02",
    title: "Get Your Valuation",
    description:
      "Instant annual NIL range, per-post rates, and percentile ranking.",
  },
  {
    num: "03",
    title: "Connect & Close",
    description:
      "Get matched with brands, negotiate deals, and track revenue.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <img
            src="/primeline-logo.png"
            alt="PRIMELINE"
            className="h-28 md:h-36 w-auto mx-auto mb-8 invert"
          />
          <h1 className="font-sans font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6 leading-[1.1]">
            Athlete Branding
            <br />
            &amp; NIL Management
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            We build, protect, and monetize the brands of college athletes —
            powered by data, driven by results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/calculator"
              className="bg-white text-black hover:bg-gray-200 rounded-none h-12 px-8 font-mono text-sm uppercase inline-flex items-center transition-colors tracking-wider"
            >
              Get Your Free Valuation
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="border border-white text-white hover:bg-white hover:text-black rounded-none h-12 px-8 font-mono text-sm uppercase inline-flex items-center transition-colors tracking-wider"
              >
                Dashboard
              </Link>
            ) : (
              <a
                href="#services"
                className="border border-white text-white hover:bg-white hover:text-black rounded-none h-12 px-8 font-mono text-sm uppercase inline-flex items-center transition-colors tracking-wider"
              >
                Our Services
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="border-b border-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`py-8 text-center ${
                  i < stats.length - 1 ? "md:border-r md:border-black" : ""
                } ${i < 2 ? "border-b md:border-b-0 border-black" : ""} ${
                  i === 0 ? "border-r border-black" : ""
                } ${i === 2 ? "border-r md:border-r border-black" : ""}`}
              >
                <p className="font-mono font-bold text-3xl md:text-4xl tracking-tight mb-1">
                  {stat.value}
                </p>
                <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="services" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-2">
              What We Do
            </p>
            <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight">
              Full-Service NIL Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black">
            {services.map((service, i) => (
              <div
                key={service.title}
                className={`p-8 md:p-10 ${
                  i < 2 ? "border-b border-black" : ""
                } ${i % 2 === 0 ? "md:border-r md:border-black" : ""}`}
              >
                <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3">
                  0{i + 1}
                </p>
                <h3 className="font-sans font-bold text-xl tracking-tight mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR ATHLETES / FOR BRANDS ─── */}
      <section className="border-t border-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* For Athletes */}
            <div className="p-8 md:p-12 md:border-r border-black">
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-2">
                For Athletes
              </p>
              <h3 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-4">
                Know your worth.
                <br />
                Get matched. Close deals.
              </h3>
              <ul className="space-y-3 mb-8">
                {athleteBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <span className="font-mono text-xs mt-0.5">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/calculator"
                className="bg-black text-white hover:bg-gray-800 rounded-none h-10 px-6 font-mono text-xs uppercase inline-flex items-center transition-colors tracking-wider"
              >
                Calculate Your Value
              </Link>
            </div>

            {/* For Brands */}
            <div className="p-8 md:p-12 border-t md:border-t-0 border-black">
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-2">
                For Brands
              </p>
              <h3 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-4">
                Find the right athletes.
                <br />
                Maximize ROI.
              </h3>
              <ul className="space-y-3 mb-8">
                {brandBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <span className="font-mono text-xs mt-0.5">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="border border-black text-black hover:bg-black hover:text-white rounded-none h-10 px-6 font-mono text-xs uppercase inline-flex items-center transition-colors tracking-wider"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="border-t border-black py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-2">
              Process
            </p>
            <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`p-8 md:p-10 ${
                  i < steps.length - 1
                    ? "border-b md:border-b-0 md:border-r border-black"
                    : ""
                }`}
              >
                <p className="font-mono font-bold text-5xl tracking-tight text-gray-200 mb-4">
                  {step.num}
                </p>
                <h3 className="font-sans font-bold text-lg tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <h2 className="font-sans font-bold text-3xl md:text-5xl tracking-tight mb-4">
            Know Your Worth — For Free
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8">
            Our NIL calculator uses real market data to give you an instant,
            accurate valuation. No signup required.
          </p>
          <Link
            to="/calculator"
            className="bg-white text-black hover:bg-gray-200 rounded-none h-12 px-8 font-mono text-sm uppercase inline-flex items-center transition-colors tracking-wider"
          >
            Calculate Your NIL Value
          </Link>
        </div>
      </section>

      {/* ─── BRAND BAR ─── */}
      <section className="border-t border-black py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <img
            src="/primeline-logo.png"
            alt="PRIMELINE"
            className="h-16 w-auto mx-auto mb-3"
          />
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">
            Athlete Branding and NIL Management
          </p>
        </div>
      </section>
    </div>
  );
}
