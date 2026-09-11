"use client";
import { useCallback, useEffect, useState } from "react";
import { gameActivityRepository } from "@/services/game-activity-repository";
import type { Game } from "@/types/game";
import type {
  GameActivityEvent,
  GameStatusSuggestion,
} from "@/types/game-activity";
import { useLibrary } from "../library-context";
import { GameTimeline } from "./game-timeline";

export function GameTimelinePanel({ game }: { game: Game }) {
  const { saveGame } = useLibrary();
  const [items, setItems] = useState<GameActivityEvent[]>([]);
  const [suggestion, setSuggestion] = useState<GameStatusSuggestion>();
  const [cursor, setCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextCursor?: string, signal?: AbortSignal) => {
      nextCursor ? setLoadingMore(true) : setLoading(true);
      setError("");
      try {
        const page = await gameActivityRepository.timeline(
          game.id,
          nextCursor,
          signal,
        );
        setItems((current) => (nextCursor ? [...current, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setSuggestion(page.statusSuggestion);
      } catch (reason) {
        if (!signal?.aborted)
          setError(reason instanceof Error ? reason.message : "Could not load play history.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [game.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("gamdow:steam-updated", refresh);
    return () => window.removeEventListener("gamdow:steam-updated", refresh);
  }, [load]);

  return (
    <GameTimeline
      items={items}
      suggestion={suggestion}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={!!cursor}
      onLoadMore={() => cursor && void load(cursor)}
      onApplySuggestion={(value) => {
        saveGame({ ...game, status: value.status });
        setSuggestion(undefined);
      }}
    />
  );
}
