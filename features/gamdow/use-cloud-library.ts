"use client";
import { useEffect, useRef, useState } from "react";
import type { LibraryResponse, SaveLibraryInput } from "@/types/api";
import { libraryRepository } from "@/services/library-repository";
import { ApiError } from "@/services/http-client";
export interface ServerOperationControl {
  cancelled: () => boolean;
  report: (message: string) => void;
}
export type RunServerOperation = <T>(
  operation: (revision: number, control: ServerOperationControl) => Promise<T>,
  label?: string,
) => Promise<T>;
export function useCloudLibrary(initial: LibraryResponse) {
  const [data, setData] = useState(initial.snapshot);
  const [externalMessage, setExternalMessage] = useState("");
  const external = useRef(false);
  const cancelRequested = useRef(false);
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
  const runServerOperation: RunServerOperation = async (
    operation,
    label = "Updating your archive…",
  ) => {
    if (external.current || inFlight.current || data !== saved.current || error)
      throw new Error(
        "Wait until your changes are saved before syncing Steam.",
      );
    external.current = true;
    cancelRequested.current = false;
    setExternalMessage(label);
    try {
      return await operation(revision.current, {
        cancelled: () => cancelRequested.current,
        report: setExternalMessage,
      });
    } finally {
      // A failed request may still have committed. Reload the authoritative revision before editing again.
      try {
        const result = await libraryRepository.load();
        if (result.snapshot.profile.id !== data.profile.id)
          throw new Error(
            "Your signed-in account changed. Reload to continue.",
          );
        saved.current = result.snapshot;
        revision.current = result.revision;
        attempt.current = null;
        if (mounted.current) {
          setData(result.snapshot);
          setStatus("saved");
          setError("");
          setCode("");
        }
      } catch {
        if (mounted.current) {
          setError(
            "Could not reload after the Steam operation. Reload before editing to avoid a conflict.",
          );
          setCode("REVISION_CONFLICT");
          setStatus("error");
        }
      }
      external.current = false;
      if (mounted.current) setExternalMessage("");
    }
  };
  return {
    runServerOperation,
    externalMessage,
    cancelExternal: () => {
      cancelRequested.current = true;
    },
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
