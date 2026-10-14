import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useUpdatePilotProfile } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { ArrowRight, Check, MonitorCog, ExternalLink } from "lucide-react";

function JetstarStar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const pilot = user as any;
  const [simulatorVersion, setSimulatorVersion] = useState<"MSFS2020" | "MSFS2024">(pilot?.simulatorVersion || "MSFS2024");
  const [simbriefUsername, setSimbriefUsername] = useState(pilot?.simbriefUsername || "");
  useEffect(() => {
    if (pilot) { setSimulatorVersion(pilot.simulatorVersion); setSimbriefUsername(pilot.simbriefUsername || ""); }
  }, [user?.id]);

  const save = useUpdatePilotProfile({ mutation: { onSuccess: (updated: any) => { qc.setQueryData(getGetMeQueryKey(), updated); } } });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-[#fb5713]">Pilot profile · preferences</p>
        <h1 className="mt-2 text-5xl font-black uppercase leading-none tracking-tight text-[#1a1a1a] md:text-6xl">Pilot settings</h1>
        <p className="mt-3 text-sm text-[#6b7280]">Configure your simulator and SimBrief dispatch integration.</p>
      </div>

      <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate({ data: { simulatorVersion, simbriefUsername: simbriefUsername.trim() || null } }); }}>

        {/* Simulator */}
        <section className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f4f6] px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fb5713] text-white">
              <MonitorCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold uppercase tracking-tight text-[#1a1a1a]">Simulator version</h2>
              <p className="text-xs text-[#6b7280]">Used to tailor your virtual operations profile.</p>
            </div>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            {(["MSFS2020", "MSFS2024"] as const).map(version => (
              <button type="button" key={version}
                onClick={() => setSimulatorVersion(version)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${simulatorVersion === version ? "border-[#fb5713] bg-[#fff5f2]" : "border-[#e5e7eb] bg-[#f9fafb] hover:border-[#fb5713]/40"}`}>
                <div>
                  <div className="font-bold text-[#1a1a1a]">{version === "MSFS2020" ? "MSFS 2020" : "MSFS 2024"}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#9ca3af]">Active platform</div>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${simulatorVersion === version ? "border-[#fb5713] bg-[#fb5713] text-white" : "border-[#d1d5db]"}`}>
                  {simulatorVersion === version && <Check className="h-3 w-3" />}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* SimBrief */}
        <section className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f4f6] px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1a] text-[#fb5713]">
              <JetstarStar size={18} />
            </div>
            <div>
              <h2 className="font-bold uppercase tracking-tight text-[#1a1a1a]">SimBrief dispatch</h2>
              <p className="text-xs text-[#6b7280]">Link your SimBrief account to dispatch flights with one click.</p>
            </div>
          </div>
          <div className="p-6">
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[#6b7280]">SimBrief Pilot ID</span>
              <input
                data-testid="input-simbrief-username"
                maxLength={80}
                value={simbriefUsername}
                onChange={e => setSimbriefUsername(e.target.value)}
                placeholder="Your SimBrief numeric pilot ID"
                className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#1a1a1a] outline-none transition focus:border-[#fb5713] focus:ring-2 focus:ring-[#fb5713]/20 md:max-w-md"
              />
              <span className="mt-2 block text-[11px] text-[#9ca3af]">
                Your SimBrief Pilot ID (numeric) — find it under SimBrief → Account settings.{" "}
                <a href="https://www.simbrief.com/system/profile.php" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#fb5713] hover:underline">
                  Open SimBrief <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </label>
          </div>
        </section>

        {save.error && (
          <div role="alert" data-testid="status-settings-error" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {(save.error as any).message || "Could not save your settings."}
          </div>
        )}
        {save.isSuccess && (
          <div role="status" data-testid="status-settings-saved" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
            <Check className="h-4 w-4" /> Pilot settings saved.
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9ca3af]">
            Account: {user?.username} · Fleet: {Array.isArray(pilot?.aircraft) ? pilot.aircraft.join(" / ") : pilot?.aircraft}
          </p>
          <button data-testid="button-save-settings" disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fb5713] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#e04d0e] disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save settings"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
