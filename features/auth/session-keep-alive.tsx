"use client";
import { useEffect } from "react";
import { apiRequest } from "@/services/http-client";
/** Visible activity renews HttpOnly sessions; transient failures never discard an unsaved archive. */
export function SessionKeepAlive() {
  useEffect(() => {
    let pending = false,
      lastAttempt = 0;
    const controller = new AbortController();
    const renew = async () => {
      if (
        document.visibilityState !== "visible" ||
        pending ||
        Date.now() - lastAttempt < 60000
      )
        return;
      pending = true;
      lastAttempt = Date.now();
      try {
        await apiRequest("/api/auth/session", {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
      } catch {
        /* Existing save UI handles an expired session without losing edits. */
      } finally {
        pending = false;
      }
    };
    void renew();
    const interval = window.setInterval(renew, 15 * 60000);
    window.addEventListener("focus", renew);
    document.addEventListener("visibilitychange", renew);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", renew);
      document.removeEventListener("visibilitychange", renew);
    };
  }, []);
  return null;
}
