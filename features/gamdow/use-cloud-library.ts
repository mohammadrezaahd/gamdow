"use client";
import { useEffect, useRef, useState } from "react";
import type { LibraryResponse, SaveLibraryInput } from "@/types/api";
import { libraryRepository } from "@/services/library-repository";
import { ApiError } from "@/services/http-client";
export function useCloudLibrary(initial: LibraryResponse) {
  const [data, setData] = useState(initial.snapshot);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [cycle, setCycle] = useState(0);
  const saved = useRef(initial.snapshot);
  const revision = useRef(initial.revision);
  const inFlight = useRef(false);
  const attempt = useRef<SaveLibraryInput | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dirty = data !== saved.current;
  useEffect(() => {
    if (!dirty || error || inFlight.current) return;
    const timer = setTimeout(() => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus("saving");
      attempt.current ??= {
        snapshot: data,
        revision: revision.current,
        mutationId: crypto.randomUUID(),
      };
      const current = attempt.current;
      libraryRepository
        .save(current)
        .then((result) => {
          revision.current = result.revision;
          saved.current = current.snapshot;
          attempt.current = null;
          if (mounted.current) {
            setStatus("saved");
            setCode("");
          }
        })
        .catch((e) => {
          if (e instanceof ApiError && [400, 413, 415].includes(e.status))
            attempt.current = null;
          if (mounted.current) {
            setStatus("error");
            setError(
              e instanceof Error ? e.message : "Could not save your archive.",
            );
            setCode(e instanceof ApiError ? e.code : "");
          }
        })
        .finally(() => {
          inFlight.current = false;
          if (mounted.current) setCycle((v) => v + 1);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [data, dirty, error, cycle]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return {
    data,
    setData,
    dirty,
    status: dirty && status === "saved" ? "saving" : status,
    error,
    code,
    retry: () => {
      setError("");
      setCycle((v) => v + 1);
    },
  };
}
