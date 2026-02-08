import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import { SPORTS, SKILL_LEVELS, CONFERENCES, PLATFORMS } from "@/lib/constants";

export default function AthleteCreate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    school: "",
    sport: "",
    conference: "",
    class_year: "",
    bio: "",
    handles: PLATFORMS.map((p) => ({ platform: p.value, handle: "", followers: 0, engagement_rate: 0 })),
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
      navigate(`/athletes/${athlete.id}`);
    },
  });

  function updateHandle(index: number, field: string, value: string | number) {
    const handles = [...form.handles];
    handles[index] = { ...handles[index], [field]: value };
    setForm({ ...form, handles });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Athlete" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">School</label>
            <input
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              value={form.sport}
              onChange={(e) => setForm({ ...form, sport: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">Select</option>
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conference</label>
            <select
              value={form.conference}
              onChange={(e) => setForm({ ...form, conference: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">Select</option>
              {CONFERENCES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class Year</label>
            <input
              value={form.class_year}
              onChange={(e) => setForm({ ...form, class_year: e.target.value })}
              placeholder="2027"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
          />
        </div>

        <h2 className="font-semibold text-sm">Social Profiles</h2>
        <div className="space-y-3">
          {form.handles.map((h, i) => (
            <div key={h.platform} className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 capitalize">
                  {PLATFORMS[i].label}
                </label>
                <input
                  value={h.handle}
                  onChange={(e) => updateHandle(i, "handle", e.target.value)}
                  placeholder="@handle"
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Followers</label>
                <input
                  type="number"
                  value={h.followers || ""}
                  onChange={(e) => updateHandle(i, "followers", parseInt(e.target.value) || 0)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Engagement %</label>
                <input
                  type="number"
                  step="0.1"
                  value={h.engagement_rate || ""}
                  onChange={(e) => updateHandle(i, "engagement_rate", parseFloat(e.target.value) || 0)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
                />
              </div>
              <div />
            </div>
          ))}
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-foreground text-background px-4 py-2 text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {mutation.isPending ? "Saving..." : "Add Athlete"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/athletes")}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
