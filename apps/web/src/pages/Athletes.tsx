import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, X, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { SPORTS, CONFERENCES, PLATFORMS } from "@/lib/constants";

/* ─── Status Pill ─── */

function StatusPill({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="border border-black text-black text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        Active
      </span>
    );
  }
  if (status === "injured") {
    return (
      <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        Injured
      </span>
    );
  }
  return (
    <span className="border border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
      {status || "—"}
    </span>
  );
}

/* ─── Ghost Roster (Empty State) ─── */

function GhostRoster({ onDraft }: { onDraft: () => void }) {
  return (
    <div className="relative w-full border border-dashed border-gray-300 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-6 px-6 py-2 border-b border-dashed border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-300">
        <span>Athlete</span>
        <span>Sport</span>
        <span className="text-right">Followers</span>
        <span className="text-right">Valuation</span>
        <span className="text-right">Trend</span>
        <span>Status</span>
      </div>
      {/* Ghost Rows */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="h-14 border-b border-dashed border-gray-200 flex items-center px-6 opacity-30"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 mr-4 flex-shrink-0" />
          <div className="w-28 h-3 bg-gray-200 mr-8" />
          <div className="w-20 h-3 bg-gray-200 mr-8" />
          <div className="w-16 h-3 bg-gray-200 ml-auto mr-8" />
          <div className="w-14 h-3 bg-gray-200 mr-8" />
          <div className="w-12 h-3 bg-gray-200" />
        </div>
      ))}

      {/* Call to Action Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
        <p className="font-mono text-sm text-gray-500 mb-4 uppercase tracking-widest">
          Roster Empty
        </p>
        <button
          onClick={onDraft}
          className="bg-black text-white rounded-none px-8 h-12 font-mono text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          + Draft First Athlete
        </button>
      </div>
    </div>
  );
}

/* ─── Slide-Over Drawer ─── */

function AthleteDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    school: "",
    sport: "",
    conference: "",
    class_year: "",
    bio: "",
    handles: PLATFORMS.map((p) => ({
      platform: p.value,
      handle: "",
      followers: 0,
      engagement_rate: 0,
    })),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: athlete, error } = await supabase
        .from("athletes")
        .insert({
          full_name: form.full_name,
          school: form.school || null,
          sport: form.sport || null,
          conference: form.conference || null,
          class_year: form.class_year || null,
          bio: form.bio || null,
        })
        .select()
        .single();
      if (error) throw error;

      const socialProfiles = form.handles
        .filter((h) => h.handle.trim())
        .map((h) => ({
          athlete_id: athlete.id,
          platform: h.platform,
          handle: h.handle.replace(/^@/, ""),
          followers: h.followers || 0,
          engagement_rate: h.engagement_rate || null,
        }));

      if (socialProfiles.length > 0) {
        const { error: spError } = await supabase
          .from("athlete_social_profiles")
          .insert(socialProfiles);
        if (spError) throw spError;
      }

      return athlete;
    },
    onSuccess: (athlete) => {
      qc.invalidateQueries({ queryKey: ["athletes"] });
      onClose();
      navigate(`/athletes/${athlete.id}`);
    },
  });

  function updateHandle(
    index: number,
    field: string,
    value: string | number,
  ) {
    const handles = [...form.handles];
    handles[index] = { ...handles[index], [field]: value };
    setForm({ ...form, handles });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white border-l-2 border-black overflow-y-auto transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Draft Athlete
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="px-6 py-6 space-y-5"
        >
          {/* Name + School */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative pt-4">
              <input
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none"
                placeholder="Full Name"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                Full Name
              </label>
            </div>
            <div className="group relative pt-4">
              <input
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none"
                placeholder="School"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                School
              </label>
            </div>
          </div>

          {/* Sport + Conference + Class Year */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                Sport
              </label>
              <select
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                className="w-full border-b border-gray-300 bg-transparent py-2 text-sm focus:border-black focus:outline-none appearance-none"
              >
                <option value="">—</option>
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                Conference
              </label>
              <select
                value={form.conference}
                onChange={(e) =>
                  setForm({ ...form, conference: e.target.value })
                }
                className="w-full border-b border-gray-300 bg-transparent py-2 text-sm focus:border-black focus:outline-none appearance-none"
              >
                <option value="">—</option>
                {CONFERENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="group relative pt-4">
              <input
                value={form.class_year}
                onChange={(e) =>
                  setForm({ ...form, class_year: e.target.value })
                }
                placeholder="Class Year"
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                Class Year
              </label>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={2}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-sm focus:border-black focus:outline-none resize-none"
            />
          </div>

          {/* Social Profiles — Compact 2-col */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-3">
              Social Profiles
            </label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {form.handles.map((h, i) => (
                <div key={h.platform} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400 w-6 flex-shrink-0 uppercase">
                    {h.platform === "instagram"
                      ? "IG"
                      : h.platform === "tiktok"
                        ? "TT"
                        : h.platform === "twitter"
                          ? "X"
                          : "YT"}
                  </span>
                  <div className="flex items-center flex-1 border-b border-gray-300 focus-within:border-black">
                    <span className="text-gray-300 text-sm">@</span>
                    <input
                      value={h.handle}
                      onChange={(e) =>
                        updateHandle(i, "handle", e.target.value)
                      }
                      placeholder="handle"
                      className="flex-1 bg-transparent py-1.5 text-sm focus:outline-none pl-0.5"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-gray-300 hover:text-black transition-colors"
                    title="Fetch data"
                  >
                    <Sparkles className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Follower / Engagement Grid (only for filled handles) */}
          {form.handles.some((h) => h.handle.trim()) && (
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                Metrics
              </label>
              <div className="space-y-2">
                {form.handles
                  .map((h, i) => ({ ...h, originalIndex: i }))
                  .filter((h) => h.handle.trim())
                  .map((h) => (
                    <div
                      key={h.platform}
                      className="grid grid-cols-3 gap-3 items-center"
                    >
                      <span className="text-xs font-mono text-gray-500 uppercase">
                        {PLATFORMS[h.originalIndex].label}
                      </span>
                      <input
                        type="number"
                        value={h.followers || ""}
                        onChange={(e) =>
                          updateHandle(
                            h.originalIndex,
                            "followers",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="Followers"
                        className="border-b border-gray-300 bg-transparent py-1 text-sm font-mono focus:border-black focus:outline-none"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={h.engagement_rate || ""}
                        onChange={(e) =>
                          updateHandle(
                            h.originalIndex,
                            "engagement_rate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Eng. %"
                        className="border-b border-gray-300 bg-transparent py-1 text-sm font-mono focus:border-black focus:outline-none"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-red-500 font-mono">
              {(mutation.error as Error).message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-black text-white rounded-none px-6 h-10 font-mono text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Draft Athlete"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs text-gray-400 hover:text-black uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── Main Athletes Page ─── */

export default function Athletes() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: athletes, isLoading } = useQuery({
    queryKey: ["athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          `
          *,
          athlete_social_profiles(platform, handle, followers, engagement_rate)
        `,
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalFollowers = (profiles: Array<{ followers: number }>) =>
    profiles?.reduce((sum, p) => sum + (p.followers || 0), 0) || 0;

  const primaryEngagement = (
    profiles: Array<{ engagement_rate: number | null }>,
  ) => {
    const rates =
      profiles
        ?.filter((p) => p.engagement_rate)
        .map((p) => p.engagement_rate!) || [];
    return rates.length > 0 ? Math.max(...rates) : null;
  };

  return (
    <div className="-m-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Athlete Roster
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 bg-black text-white rounded-none px-4 h-8 font-mono text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3 w-3" /> Draft
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-gray-100 flex items-center px-6"
            >
              <div className="w-8 h-8 rounded-full skeleton mr-4" />
              <div className="w-32 h-3 skeleton" />
            </div>
          ))}
        </div>
      ) : !athletes?.length ? (
        /* Ghost Roster Empty State */
        <GhostRoster onDraft={() => setDrawerOpen(true)} />
      ) : (
        /* Dense Data Grid */
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-6 px-6 py-2 border-b border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span>Athlete</span>
            <span>Sport</span>
            <span className="text-right">Followers</span>
            <span className="text-right">Engagement</span>
            <span className="text-right">Score</span>
            <span>Status</span>
          </div>

          {/* Table Rows */}
          {athletes.map((athlete: any) => (
            <Link
              key={athlete.id}
              to={`/athletes/${athlete.id}`}
              className="grid grid-cols-6 items-center px-6 py-3 border-b border-gray-100 hover:bg-black hover:text-white cursor-pointer transition-colors group"
            >
              {/* Athlete: Avatar + Name + School */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 group-hover:bg-white/20 flex-shrink-0 flex items-center justify-center font-mono text-[10px] text-gray-500 group-hover:text-white uppercase">
                  {athlete.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {athlete.full_name}
                  </p>
                  <p className="text-[11px] text-gray-400 group-hover:text-gray-300 truncate">
                    {athlete.school || "—"}
                  </p>
                </div>
              </div>

              {/* Sport */}
              <span className="font-mono text-[11px] uppercase text-gray-600 group-hover:text-gray-300">
                {athlete.sport || "—"}
              </span>

              {/* Followers */}
              <span className="font-mono text-sm text-right">
                {formatNumber(
                  totalFollowers(athlete.athlete_social_profiles || []),
                )}
              </span>

              {/* Engagement */}
              <span className="font-mono text-sm text-right">
                {primaryEngagement(athlete.athlete_social_profiles || [])
                  ? formatPercent(
                      primaryEngagement(
                        athlete.athlete_social_profiles || [],
                      )!,
                    )
                  : "—"}
              </span>

              {/* Score */}
              <span className="font-mono text-sm text-right font-bold">
                {athlete.composite_score || "—"}
              </span>

              {/* Status */}
              <span>
                <StatusPill status={athlete.status} />
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Slide-Over Drawer */}
      <AthleteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
