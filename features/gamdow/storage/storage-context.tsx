"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { StorageUsage } from "@/types/storage";
import { apiRequest } from "@/services/http-client";
const Context = createContext<{
  usage: StorageUsage | null;
  error: string;
  refresh: () => Promise<void>;
} | null>(null);
export function StorageProvider({ children }: PropsWithChildren) {
  const [usage, setUsage] = useState<StorageUsage | null>(null),
    [error, setError] = useState("");
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setUsage(await apiRequest<StorageUsage>("/api/storage"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Storage is unavailable.");
    } finally {
      busy.current = false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    const update = () => {
      void refresh();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("gamdow:storage-updated", update);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("gamdow:storage-updated", update);
      window.removeEventListener("focus", update);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ usage, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useStorage() {
  const context = useContext(Context);
  if (!context) throw new Error("StorageProvider missing");
  return context;
}
