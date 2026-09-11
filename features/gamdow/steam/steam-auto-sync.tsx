"use client";
import { useEffect } from "react";
import { Alert } from "@mui/material";
import { Button } from "@/components/ui";
import { useState } from "react";
import { apiRequest, ApiError } from "@/services/http-client";
import { useLibrary } from "../library-context";
/** Refresh on return to the site and every five visible minutes. Server cache coordinates tabs. */
export function SteamAutoSync() {
  const { refreshLibrary } = useLibrary();
  const [warning, setWarning] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true,
      busy = false,
      lastAttempt = 0;
    const controller = new AbortController();
    async function update() {
      if (
        document.visibilityState === "hidden" ||
        busy ||
        Date.now() - lastAttempt < 60000
      )
        return;
      busy = true;
      lastAttempt = Date.now();
      try {
        await apiRequest<{ archiveChanged?: boolean }>("/api/steam/activity", {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(60000),
          ]),
        });
        if (live) {
          // Also reload on a cached response: another tab may have performed
          // the provider sync and advanced the authoritative archive.
          await refreshLibrary();
          setWarning("");
          window.dispatchEvent(new Event("gamdow:steam-updated"));
        }
      } catch (e) {
        if (
          live &&
          !(
            e instanceof ApiError &&
            [
              "STEAM_NOT_CONNECTED",
              "STEAM_NOT_CONFIGURED",
              "STEAM_BUSY",
            ].includes(e.code)
          )
        )
          setWarning(
            e instanceof Error
              ? e.message
              : "Steam could not refresh. Saved data remains available.",
          );
      } finally {
        busy = false;
      }
    }
    void update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    const timer = setInterval(update, 300000);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refreshLibrary, retry]);
  return warning ? (
    <Alert
      severity="warning"
      onClose={() => setWarning("")}
      action={
        <Button color="inherit" onClick={() => setRetry((n) => n + 1)}>
          Retry Steam
        </Button>
      }
      sx={{ mb: 2 }}
    >
      {warning}
    </Alert>
  ) : null;
}
