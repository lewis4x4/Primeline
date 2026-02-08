import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { SPORTS, SKILL_LEVELS, CONFERENCES } from "@/lib/constants";
import MoneyDisplay from "@/components/shared/MoneyDisplay";
import { formatMoney, formatPercent } from "@/lib/formatters";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | "results";

interface FormData {
  sport: string;
  school: string;
  skill_level: string;
  instagram_handle: string;
  instagram_followers: number;
  tiktok_handle: string;
  tiktok_followers: number;
  twitter_followers: number;
  youtube_subscribers: number;
  engagement_rate: number;
  location_market: string;
  conference: string;
}

interface ValuationResult {
  annual_low: number;
  annual_high: number;
  follower_tier: string;
  per_post: Record<string, { low: number; high: number }>;
  percentile: number;
  drivers: Array<{ type: string; text: string }>;
}

export default function Calculator() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const [form, setForm] = useState<FormData>({
    sport: "",
    school: "",
    skill_level: "",
    instagram_handle: "",
    instagram_followers: 0,
    tiktok_handle: "",
    tiktok_followers: 0,
    twitter_followers: 0,
    youtube_subscribers: 0,
    engagement_rate: 0,
    location_market: "",
    conference: "",
  });

  function update(field: keyof FormData, value: string | number) {
    setForm({ ...form, [field]: value });
  }

  async function calculateValue() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-public-nil-value", {
        body: form,
      });
      if (error) throw error;
      setResult(data.data);
      setStep("results");
    } catch (err) {
      console.error("Calculation failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead() {
    try {
      await supabase.functions.invoke("submit-calculator-lead", {
        body: {
          ...form,
          email: signupEmail,
          full_name: signupName,
        },
      });
      setSignupDone(true);
    } catch (err) {
      console.error("Lead submission failed:", err);
    }
  }

  function nextStep() {
    if (step === 6) {
      calculateValue();
      return;
    }
    if (typeof step === "number") setStep((step + 1) as Step);
  }

  function prevStep() {
    if (step === "results") {
      setStep(6);
      return;
    }
    if (typeof step === "number" && step > 1) setStep((step - 1) as Step);
  }

  if (step === "results" && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">Your estimated annual NIL value</p>
          <MoneyDisplay low={result.annual_low} high={result.annual_high} size="xl" />
          <p className="text-sm text-muted-foreground mt-3">
            Top {result.percentile}% for {form.sport}
          </p>
        </div>

        {/* Per-Post Rates */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {Object.entries(result.per_post || {}).map(([key, rates]) => (
            <div key={key} className="primeline-card">
              <p className="text-xs text-muted-foreground capitalize mb-1">
                {key.replace(/_/g, " ")}
              </p>
              <p className="data-cell text-lg">
                {formatMoney(rates.low)} – {formatMoney(rates.high)}
              </p>
            </div>
          ))}
        </div>

        {/* Drivers */}
        <div className="mb-8 space-y-1">
          {result.drivers.map((d, i) => (
            <p
              key={i}
              className={`text-sm ${d.type === "positive" ? "text-success" : "text-warning"}`}
            >
              {d.type === "positive" ? "\u2191" : "\u2193"} {d.text}
            </p>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-1">Estimated</p>

        {/* Sign-up Gate */}
        {!showSignup ? (
          <div className="border-t border-border pt-8 mt-8">
            <h2 className="font-semibold text-lg mb-2">Get Your Full Report Free</h2>
            <button
              onClick={() => setShowSignup(true)}
              className="bg-foreground text-background px-6 py-2.5 text-sm font-medium rounded hover:opacity-90 transition-opacity"
            >
              Get Full Report
            </button>
          </div>
        ) : signupDone ? (
          <div className="border-t border-border pt-8 mt-8">
            <p className="text-sm text-success font-medium">Report sent to your email.</p>
          </div>
        ) : (
          <div className="border-t border-border pt-8 mt-8 space-y-3">
            <h2 className="font-semibold text-lg mb-2">Get Your Full Report Free</h2>
            <input
              type="email"
              required
              placeholder="Email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <input
              placeholder="Full Name"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              onClick={submitLead}
              disabled={!signupEmail}
              className="bg-foreground text-background px-6 py-2.5 text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send My Report
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground mt-12 leading-relaxed">
          This estimate is for informational purposes only and does not guarantee earnings.
          NIL opportunities vary based on many factors including school policy, state law,
          and market conditions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-0.5 flex-1 rounded ${
              typeof step === "number" && s <= step ? "bg-foreground" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Sport */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">What is your sport?</h2>
          <select
            value={form.sport}
            onChange={(e) => update("sport", e.target.value)}
            autoFocus
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Select your sport</option>
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 2: School */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Where do you play?</h2>
          <input
            value={form.school}
            onChange={(e) => update("school", e.target.value)}
            placeholder="University / College"
            autoFocus
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      )}

      {/* Step 3: Skill Level */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">What level?</h2>
          <select
            value={form.skill_level}
            onChange={(e) => update("skill_level", e.target.value)}
            autoFocus
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Select level</option>
            {SKILL_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 4: Social Handles */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Your social handles</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  value={form.instagram_handle}
                  onChange={(e) => update("instagram_handle", e.target.value)}
                  placeholder="@handle"
                  className="border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <input
                  type="number"
                  value={form.instagram_followers || ""}
                  onChange={(e) => update("instagram_followers", parseInt(e.target.value) || 0)}
                  placeholder="Followers"
                  className="border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">TikTok</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  value={form.tiktok_handle}
                  onChange={(e) => update("tiktok_handle", e.target.value)}
                  placeholder="@handle"
                  className="border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <input
                  type="number"
                  value={form.tiktok_followers || ""}
                  onChange={(e) => update("tiktok_followers", parseInt(e.target.value) || 0)}
                  placeholder="Followers"
                  className="border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">X (Twitter) followers</label>
              <input
                type="number"
                value={form.twitter_followers || ""}
                onChange={(e) => update("twitter_followers", parseInt(e.target.value) || 0)}
                placeholder="Followers"
                className="w-full mt-1 border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">YouTube subscribers</label>
              <input
                type="number"
                value={form.youtube_subscribers || ""}
                onChange={(e) => update("youtube_subscribers", parseInt(e.target.value) || 0)}
                placeholder="Subscribers"
                className="w-full mt-1 border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Engagement */}
      {step === 5 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Your engagement rate</h2>
          <input
            type="number"
            step="0.1"
            value={form.engagement_rate || ""}
            onChange={(e) => update("engagement_rate", parseFloat(e.target.value) || 0)}
            placeholder="Average engagement rate %"
            autoFocus
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
          />
        </div>
      )}

      {/* Step 6: Market */}
      {step === 6 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Your market</h2>
          <input
            value={form.location_market}
            onChange={(e) => update("location_market", e.target.value)}
            placeholder="City, State"
            autoFocus
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground mb-4"
          />
          <select
            value={form.conference}
            onChange={(e) => update("conference", e.target.value)}
            className="w-full border border-border rounded px-4 py-3 text-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Conference (optional)</option>
            {CONFERENCES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      {typeof step === "number" && (
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 underline"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={loading || (step === 1 && !form.sport)}
            className="bg-foreground text-background px-6 py-2.5 text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Calculating..." : step === 6 ? "See My NIL Value" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
