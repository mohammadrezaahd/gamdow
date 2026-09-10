"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Button, Dialog } from "@/components/ui";
import { useStorage } from "./storage-context";
import { formatBytes } from "@/lib/storage";
import type { StoragePlan } from "@/types/storage";
import { apiRequest } from "@/services/http-client";
export function StorageBadge({ onClick }: { onClick: () => void }) {
  const { usage, error } = useStorage();
  return (
    <Button
      size="small"
      onClick={onClick}
      aria-label="View storage and plans"
      sx={{
        minWidth: 0,
        whiteSpace: "nowrap",
        flexShrink: 0,
        fontSize: { xs: 9, md: 11 },
      }}
    >
      {usage
        ? `${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}`
        : error
          ? "Storage unavailable"
          : "Storage…"}
    </Button>
  );
}
export function StoragePanel() {
  const { usage, error, refresh } = useStorage();
  const [payment, setPayment] = useState("");
  useEffect(() => {
    setPayment(
      new URLSearchParams(window.location.search).get("storage") || "",
    );
  }, []);
  const [plans, setPlans] = useState(false),
    [cleaning, setCleaning] = useState(false),
    [cleanupError, setCleanupError] = useState("");
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack spacing={2}>
        <Typography variant="overline" color="primary.main">
          SPACE FOR YOUR MEMORIES
        </Typography>
        <Typography variant="h5">Your storage</Typography>
        {payment === "success" && (
          <Alert severity="info" onClose={() => setPayment("")}>
            Checkout finished. Your capacity updates after payment confirmation,
            usually within a moment. Refresh if the payment is still processing.
          </Alert>
        )}
        {payment === "cancelled" && (
          <Alert severity="info" onClose={() => setPayment("")}>
            Checkout was cancelled. Your storage is unchanged.
          </Alert>
        )}
        {usage ? (
          <>
            <Typography>
              {formatBytes(usage.usedBytes)} of {formatBytes(usage.limitBytes)}{" "}
              used
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (usage.usedBytes / usage.limitBytes) * 100)}
              color={usage.availableBytes === 0 ? "error" : "primary"}
            />
            <Typography variant="body2" color="text.secondary">
              {formatBytes(usage.availableBytes)} available · {usage.fileCount}{" "}
              files
              {usage.reservedBytes > 0
                ? ` · ${formatBytes(usage.reservedBytes)} reserved for an import`
                : ""}
            </Typography>
            {usage.availableBytes === 0 && (
              <Alert severity="warning">
                Your storage is full. Delete personal images or add a storage
                pack.
              </Alert>
            )}
          </>
        ) : (
          <Typography>Loading storage…</Typography>
        )}
        {(error || cleanupError) && (
          <Alert severity="error">{cleanupError || error}</Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          Every account includes 1 GB free. Personal covers, gallery images and
          your avatar count toward storage. Official Steam images stay remote
          and use no space until you save a copy. Storage packs add capacity
          with a one-time payment and no expiry.
        </Typography>
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button variant="contained" onClick={() => setPlans(true)}>
            View storage packs
          </Button>
          <Button
            disabled={cleaning}
            onClick={async () => {
              setCleaning(true);
              setCleanupError("");
              try {
                await apiRequest("/api/storage", { method: "POST" });
                await refresh();
              } catch (e) {
                setCleanupError(
                  e instanceof Error ? e.message : "Cleanup failed.",
                );
              } finally {
                setCleaning(false);
              }
            }}
          >
            {cleaning ? "Cleaning…" : "Refresh & retry file cleanup"}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Deleted files release space after physical removal. Unused uploads are
          removed after 24 hours. Import temporarily needs room for both your
          current images and the backup.
        </Typography>
        {plans && <StoragePlans onClose={() => setPlans(false)} />}
      </Stack>
    </Paper>
  );
}
function StoragePlans({ onClose }: { onClose: () => void }) {
  const [plans, setPlans] = useState<StoragePlan[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    apiRequest<StoragePlan[]>("/api/storage/plans")
      .then(setPlans)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={busy ? undefined : onClose}>
      <DialogTitle>Add storage</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Keep your free 1 GB and add extra capacity. One payment. No monthly
            subscription.
          </Typography>
          {!plans.length && !error && <Typography>Loading packs…</Typography>}
          {plans.map((plan) => (
            <Paper key={plan.id} variant="outlined" sx={{ p: 2 }}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h5">{plan.name}</Typography>
                  <Typography variant="body2">
                    {plan.configured &&
                    plan.amount !== undefined &&
                    plan.currency
                      ? new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: plan.currency,
                        }).format(
                          plan.amount /
                            ([
                              "jpy",
                              "krw",
                              "vnd",
                              "clp",
                              "xaf",
                              "xof",
                              "xpf",
                              "bif",
                              "djf",
                              "gnf",
                              "kmf",
                              "mga",
                              "pyg",
                              "rwf",
                              "ugx",
                              "vuv",
                            ].includes(plan.currency)
                              ? 1
                              : 100),
                        )
                      : "Purchases not configured yet"}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  disabled={!plan.configured || !!busy}
                  onClick={async () => {
                    setBusy(plan.id);
                    setError("");
                    try {
                      const result = await apiRequest<{ url: string }>(
                        "/api/storage/checkout",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            packId: plan.id,
                            requestId: crypto.randomUUID(),
                          }),
                        },
                      );
                      window.location.assign(result.url);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Checkout failed.",
                      );
                      setBusy("");
                    }
                  }}
                >
                  {busy === plan.id ? "Opening…" : "Buy once"}
                </Button>
              </Stack>
            </Paper>
          ))}
          {error && <Alert severity="error">{error}</Alert>}
          <Button onClick={onClose} disabled={!!busy}>
            Close
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
