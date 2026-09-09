import { Button, Dialog } from "@/components/ui";
import {
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
export function SectionTitle({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        mb: 3,
        minWidth: 0,
        "& > *": { minWidth: 0, maxWidth: "100%" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Box>
        {eyebrow && (
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ letterSpacing: ".15em", fontSize: 10, fontWeight: 700 }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" sx={{ overflowWrap: "anywhere" }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description = "Start a new chapter by adding a game.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Paper sx={{ p: { xs: 3, md: 6 }, textAlign: "center" }}>
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        {description}
      </Typography>
      {action}
    </Paper>
  );
}
export function Metric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <Paper
      sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0, overflowWrap: "anywhere" }}
    >
      <Typography variant="h4">{value}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}
export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{description}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
