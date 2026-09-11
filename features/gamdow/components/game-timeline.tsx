import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Chip } from "@/components/ui";
import type {
  GameActivityEvent,
  GameStatusSuggestion,
} from "@/types/game-activity";

const labels: Record<GameActivityEvent["type"], string> = {
  BASELINE: "Tracking baseline",
  ADDED: "Added to library",
  STATUS_CHANGED: "Status changed",
  STARTED: "Journey started",
  COMPLETED: "Game completed",
  COMPLETION_CLEARED: "Completion reopened",
  START_DATE_CHANGED: "Start date changed",
  START_DATE_CLEARED: "Start date cleared",
  PLAYTIME_UPDATED: "Manual playtime updated",
  COMPLETION_DATE_CHANGED: "Completion date changed",
  EXTERNAL_ACTIVITY: "External play session synced",
};

const duration = (minutes?: number) => {
  if (minutes === undefined) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ") || "0m";
};

const detail = (item: GameActivityEvent) => {
  if (item.fromStatus && item.toStatus)
    return `${item.fromStatus} → ${item.toStatus}`;
  if (item.toStatus) return item.toStatus;
  if (item.type === "PLAYTIME_UPDATED" || item.type === "EXTERNAL_ACTIVITY") {
    const total = duration(item.totalMinutes);
    const delta = item.deltaMinutes
      ? `${item.deltaMinutes > 0 ? "+" : "−"}${duration(Math.abs(item.deltaMinutes))}`
      : undefined;
    return [total && `${total} total`, delta].filter(Boolean).join(" · ");
  }
  return item.note;
};

export function GameTimeline({
  items,
  suggestion,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onApplySuggestion,
}: {
  items: GameActivityEvent[];
  suggestion?: GameStatusSuggestion;
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  onApplySuggestion: (suggestion: GameStatusSuggestion) => void;
}) {
  if (loading)
    return (
      <Stack direction="row" spacing={1.5} role="status">
        <CircularProgress size={20} />
        <Typography>Loading play history…</Typography>
      </Stack>
    );

  return (
    <Stack spacing={2.5}>
      {suggestion && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                {suggestion.source} SUGGESTION · {suggestion.confidence} confidence
              </Typography>
              <Typography variant="h6">Set status to {suggestion.status}?</Typography>
              <Typography variant="body2" color="text.secondary">
                {suggestion.reason}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => onApplySuggestion(suggestion)}
              sx={{ flexShrink: 0 }}
            >
              Apply status
            </Button>
          </Stack>
        </Paper>
      )}

      {error && <Typography color="error.main">{error}</Typography>}
      {!items.length && !error ? (
        <Typography color="text.secondary">
          The first status or playtime change will appear here.
        </Typography>
      ) : (
        <Stack component="ol" spacing={0} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {items.map((item, index) => (
            <Stack
              component="li"
              direction="row"
              spacing={2}
              key={item.id}
              sx={{ minWidth: 0 }}
            >
              <Stack sx={{ alignItems: "center", flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    mt: 0.8,
                    borderRadius: "50%",
                    bgcolor: item.source === "MANUAL" ? "primary.main" : "secondary.main",
                    boxShadow: "0 0 0 5px rgba(125,255,191,.08)",
                  }}
                />
                {index < items.length - 1 && (
                  <Box sx={{ width: 1, flex: 1, minHeight: 52, bgcolor: "divider" }} />
                )}
              </Stack>
              <Box sx={{ minWidth: 0, pb: 2.5, flex: 1 }}>
                <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 700 }}>{labels[item.type]}</Typography>
                  <Chip size="small" label={item.source} />
                  {item.inferred && <Chip size="small" label="Inferred" />}
                </Stack>
                {detail(item) && (
                  <Typography color="text.secondary">{detail(item)}</Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.occurredAt))}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
      {hasMore && (
        <Button disabled={loadingMore} onClick={onLoadMore} sx={{ alignSelf: "center" }}>
          {loadingMore ? "Loading…" : "Load older activity"}
        </Button>
      )}
    </Stack>
  );
}
