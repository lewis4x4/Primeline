import { useState, useEffect, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/* ─── Data ─── */

const stats = [
  { value: "$2.4M+", label: "Deal Value Managed" },
  { value: "500+", label: "Athletes Valued" },
  { value: "150+", label: "Brand Partners" },
  { value: "24hr", label: "Avg Response Time" },
];

const services = [
  {
    title: "NIL Valuation",
    coord: "[01,01]",
    description:
      "Data-driven valuations built on real market data. Know exactly what your name, image, and likeness is worth across every platform.",
  },
  {
    title: "Brand Matching",
    coord: "[01,02]",
    description:
      "Algorithmic matching connects athletes to brand opportunities based on audience fit, content style, and budget alignment.",
  },
  {
    title: "Deal Management",
    coord: "[02,01]",
    description:
      "Full-pipeline deal tracking from first contact to signed contract. Compliance checks, outreach automation, and revenue tracking built in.",
  },
  {
    title: "Market Intelligence",
    coord: "[02,02]",
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

const marqueeItems = [
  "RECENT VALUATION: SEC QB — $1.2M",
  "NEW MATCH: NIKE × D1 TRACK & FIELD",
  "MARKET ALERT: ENGAGEMENT RATES ↑ 4.2%",
  "TOP PERFORMER: PAC-12 WR — 340K FOLLOWERS",
  "DEAL CLOSED: $85K APPAREL PARTNERSHIP",
  "NEW LEAD: BIG TEN GYMNAST — 890K REACH",
];

const trustBrands = [
  "NIKE",
  "ADIDAS",
  "GATORADE",
  "UNDER ARMOUR",
  "RED BULL",
  "BEATS",
  "OAKLEY",
  "NEW BALANCE",
  "PUMA",
  "GYMSHARK",
];

const typewriterPhrases = [
  "Enter your sport...",
  "Enter your school...",
  "Enter your @handle...",
];

const barClasses = [
  "bar-animate-1",
  "bar-animate-2",
  "bar-animate-3",
  "bar-animate-4",
  "bar-animate-5",
];

const barHeights = [40, 70, 45, 90, 60];

/* ─── Spotlight handler ─── */

function handleSpotlight(e: MouseEvent<HTMLElement>) {
  const { currentTarget, clientX, clientY } = e;
  const { left, top } = currentTarget.getBoundingClientRect();
  currentTarget.style.setProperty("--mouse-x", `${clientX - left}px`);
  currentTarget.style.setProperty("--mouse-y", `${clientY - top}px`);
}

/* ─── Typewriter CTA Component ─── */

function TypewriterCTA() {
  const navigate = useNavigate();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const phrase = typewriterPhrases[phraseIndex];

    if (!isDeleting && charIndex < phrase.length) {
      const timer = setTimeout(() => setCharIndex((c) => c + 1), 50);
      return () => clearTimeout(timer);
    }

    if (!isDeleting && charIndex === phrase.length) {
      const timer = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timer);
    }

    if (isDeleting && charIndex > 0) {
      const timer = setTimeout(() => setCharIndex((c) => c - 1), 25);
      return () => clearTimeout(timer);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((p) => (p + 1) % typewriterPhrases.length);
    }
  }, [charIndex, isDeleting, phraseIndex]);

  const displayText = typewriterPhrases[phraseIndex].slice(0, charIndex);

  return (
    <button
      onClick={() => navigate("/calculator")}
      className="bg-white text-black rounded-none h-14 px-2 font-mono text-sm inline-flex items-center transition-colors cursor-pointer w-full max-w-lg mx-auto group"
    >
      <span className="flex-1 text-left px-4 truncate">
        <span className="text-gray-500">{displayText}</span>
        <span className="animate-blink text-black">|</span>
      </span>
      <span className="bg-black text-white h-10 px-6 inline-flex items-center text-xs uppercase tracking-wider font-mono group-hover:bg-gray-800 transition-colors shrink-0">
        Calculate &rarr;
      </span>
    </button>
  );
}

/* ─── Marquee Component ─── */

function Marquee() {
  const content = marqueeItems.join("  •  ");

  return (
    <div className="bg-black border-y border-white/10 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-3">
        <span className="font-mono text-xs uppercase tracking-wider text-white/60">
          {content}&nbsp;&nbsp;•&nbsp;&nbsp;{content}&nbsp;&nbsp;•&nbsp;&nbsp;
        </span>
      </div>
    </div>
  );
}

/* ─── Trust Ticker (Brand Wall) ─── */

function TrustTicker() {
  const content = trustBrands.join("  +  ");

  return (
    <div className="bg-gray-50 border-y border-gray-200 overflow-hidden">
      <div className="animate-marquee-slow whitespace-nowrap py-4">
        <span className="font-mono font-bold text-sm uppercase tracking-widest text-black/30">
          {content}&nbsp;&nbsp;+&nbsp;&nbsp;{content}&nbsp;&nbsp;+&nbsp;&nbsp;
        </span>
      </div>
    </div>
  );
}

/* ─── Valuation Receipt Card ─── */

function ValuationReceipt() {
  return (
    <div className="my-8 flex justify-center md:justify-start">
      <div className="-rotate-2 hover:rotate-0 transition-transform duration-300 hover:scale-[1.02] border-2 border-black bg-white p-5 w-64">
        <div className="border-b border-dashed border-black pb-2 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            NIL Valuation Receipt
          </p>
        </div>
        <p className="font-mono font-bold text-3xl tracking-tight mb-1">
          $42,500
          <span className="text-sm font-normal text-gray-500">/yr</span>
        </p>
        <p className="font-mono text-xs text-gray-500 mb-3">
          Per-Post: $850 — $1,200
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="font-mono text-xs uppercase tracking-wider">
            Verified
          </span>
        </div>
        <div className="border-t border-dashed border-black pt-2">
          <p className="font-mono text-[10px] text-gray-400">
            D1 Football · SEC
          </p>
          <p className="font-mono text-[10px] text-gray-300 mt-1">
            primeline.ai/v/a7x3k9
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Living Data Bars ─── */

function LivingBars() {
  return (
    <div className="absolute bottom-6 right-6 flex items-end gap-[3px] h-8">
      {barHeights.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] bg-black/15 group-hover:bg-black/70 transition-all duration-300 ${barClasses[i]}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* ─── Main Page ─── */

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* ─── HERO (with spotlight) ─── */}
      <section
        className="relative bg-black text-white hero-noise group overflow-hidden"
        onMouseMove={handleSpotlight}
      >
        {/* Spotlight layer */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08), transparent 40%)",
          }}
        />
        <div className="relative z-[4] max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
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

          {/* Typewriter CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
            <TypewriterCTA />
          </div>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="inline-block mt-4 font-mono text-xs uppercase tracking-wider text-white/50 hover:text-white underline underline-offset-4 transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>

      {/* ─── MARQUEE ─── */}
      <Marquee />

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

      {/* ─── TRUST TICKER (Brand Wall) ─── */}
      <TrustTicker />

      {/* ─── SERVICES (dashed grid + coordinates + living data) ─── */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dashed border-black">
            {services.map((service, i) => (
              <div
                key={service.title}
                className={`group relative p-8 md:p-10 ${
                  i < 2 ? "border-b border-dashed border-black" : ""
                } ${
                  i % 2 === 0
                    ? "md:border-r md:border-dashed md:border-black"
                    : ""
                }`}
              >
                {/* Coordinate */}
                <span className="absolute top-2 right-3 font-mono text-[10px] text-gray-300 select-none">
                  {service.coord}
                </span>
                <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3">
                  0{i + 1}
                </p>
                <h3 className="font-sans font-bold text-xl tracking-tight mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {service.description}
                </p>
                {/* Living data bars on Market Intelligence card */}
                {i === 3 && <LivingBars />}
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
              <ul className="space-y-3">
                {athleteBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <span className="font-mono text-xs mt-0.5">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Valuation Receipt Card */}
              <ValuationReceipt />

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

      {/* ─── HOW IT WORKS (dashed grid + coordinates) ─── */}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dashed border-black">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`relative p-8 md:p-10 ${
                  i < steps.length - 1
                    ? "border-b md:border-b-0 md:border-r border-dashed border-black"
                    : ""
                }`}
              >
                {/* Coordinate */}
                <span className="absolute top-2 right-3 font-mono text-[10px] text-gray-300 select-none">
                  [{step.num}]
                </span>
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

      {/* ─── CTA (with spotlight) ─── */}
      <section
        className="relative bg-black text-white hero-noise group overflow-hidden"
        onMouseMove={handleSpotlight}
      >
        {/* Spotlight layer */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08), transparent 40%)",
          }}
        />
        <div className="relative z-[4] max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
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
