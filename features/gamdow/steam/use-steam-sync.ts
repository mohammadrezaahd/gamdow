"use client";
import { useState } from "react";
import { steamRepository } from "@/services/steam-repository";
import type { SteamSyncResult, SteamSyncStart } from "@/types/steam";
import { useLibrary } from "../library-context";
export const pendingSteamJob = (job?: SteamSyncResult) =>
  !!job && ["pending", "running"].includes(job.status);
export function useSteamSync() {
  const { runServerOperation, notify } = useLibrary();
  const [job, setJob] = useState<SteamSyncResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(input?: SteamSyncStart) {
    setBusy(true);
    setError("");
    try {
      await runServerOperation(async (_revision, control) => {
        let current =
          !input && job && pendingSteamJob(job)
            ? job
            : await steamRepository.startSync(input);
        setJob(current);
        while (pendingSteamJob(current) && !control.cancelled()) {
          control.report(
            current.phase === "achievements"
              ? `Updating achievements · ${current.achievementProcessed ?? 0} / ${current.achievementTotal ?? 0}`
              : `Importing / updating games · ${current.processed} / ${current.total}`,
          );
          current = await steamRepository.continueSync(current.id);
          setJob(current);
          if (pendingSteamJob(current))
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        notify(
          current.status === "completed"
            ? current.outcome === "partial_success"
              ? "Steam finished with some unavailable games or stats. Review the result below."
              : current.outcome === "failed"
                ? "Steam import failed. Review the result below."
                : "Steam library updated"
            : "Steam paused. Your progress is saved; resume when ready.",
        );
      }, "Preparing Steam library…");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Steam failed. Your saved job can be resumed.",
      );
    } finally {
      // Recover a server checkpoint even if the last response was lost.
      try {
        setJob((await steamRepository.connection()).sync);
      } catch {
        /* Keep the visible result and original error. */
      }
      setBusy(false);
    }
  }
  async function cancel() {
    if (!job) return;
    setBusy(true);
    setError("");
    try {
      await steamRepository.cancelSync(job.id);
      setJob((await steamRepository.connection()).sync);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel Steam job.");
    } finally {
      setBusy(false);
    }
  }
  return { job, setJob, error, setError, busy, run, cancel };
}
