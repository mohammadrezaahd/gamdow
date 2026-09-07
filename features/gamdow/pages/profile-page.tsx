"use client";
import { useState } from "react";
import { authRepository } from "@/services/auth-repository";
import { Alert, Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import { EditRounded } from "@mui/icons-material";
import { Button, Chip } from "@/components/ui";
import { Metric, SectionTitle } from "@/components/page-parts";
import { archiveTokens as t } from "@/theme/gamdow-theme";
import { useLibrary } from "../library-context";
import { ProfileForm } from "../forms/profile-form";
export function ProfilePage() {
  const { data, hasUnsavedChanges } = useLibrary();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const { profile } = data;
  const [editing, setEditing] = useState(false);
  return (
    <>
      <SectionTitle
        title="Your profile"
        eyebrow="THE PERSON BEHIND THE ARCHIVE"
        action={
          <Button
            variant="contained"
            startIcon={<EditRounded />}
            onClick={() => setEditing(true)}
          >
            Edit profile
          </Button>
        }
      />
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at top right, #d3fc7218, transparent 65%), #1a1d18",
        }}
      >
        <Typography
          aria-hidden
          sx={{
            position: "absolute",
            right: 16,
            top: -30,
            fontFamily: t.display,
            fontSize: { xs: 130, md: 240 },
            fontWeight: 700,
            color: "#d3fc7208",
            pointerEvents: "none",
          }}
        >
          PLAYER
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={4}
          sx={{ position: "relative", alignItems: { sm: "center" } }}
        >
          <Avatar
            src={profile.avatarImage || undefined}
            alt={profile.displayName}
            sx={{
              width: 120,
              height: 120,
              fontFamily: t.display,
              fontSize: 40,
              bgcolor: "#d3fc7214",
              color: "primary.main",
              border: "1px solid #d3fc7240",
              borderRadius: 3,
            }}
          >
            {profile.displayName.slice(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography variant="overline" color="primary.main">
              INDEPENDENT CURATOR / GAM DOW
            </Typography>
            <Typography variant="h2" sx={{ mt: 1 }}>
              {profile.displayName}
            </Typography>
            {profile.username && (
              <Typography color="primary.main" sx={{ mt: 1 }}>
                @{profile.username.replace(/^@/, "")}
              </Typography>
            )}
            <Typography
              color="text.secondary"
              sx={{ mt: 2, whiteSpace: "pre-wrap", maxWidth: 650 }}
            >
              {profile.bio || "Every game leaves a story. Tell yours here."}
            </Typography>
            {profile.location && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {profile.location}
              </Typography>
            )}
            <Stack
              direction="row"
              useFlexGap
              sx={{ flexWrap: "wrap", gap: 1, mt: 2 }}
            >
              {profile.favoritePlatforms.map((platform) => (
                <Chip
                  key={platform}
                  label={platform}
                  sx={{ maxWidth: "100%" }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          my: 3,
        }}
      >
        <Metric value={data.games.length} label="Games collected" />
        <Metric
          value={data.games.filter((g) => g.status === "Completed").length}
          label="Stories finished"
        />
        <Metric
          value={data.games.filter((g) => g.review?.trim()).length}
          label="Reviews written"
        />
        <Metric value={data.gallery.length} label="Memories captured" />
      </Box>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="h5">Account</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              Your collection is private and saved to your account.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled={loggingOut || hasUnsavedChanges}
            onClick={async () => {
              setLoggingOut(true);
              setError("");
              try {
                await authRepository.logout();
                window.location.replace("/login");
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Could not log out.",
                );
                setLoggingOut(false);
              }
            }}
          >
            {loggingOut
              ? "Logging out…"
              : hasUnsavedChanges
                ? "Saving before logout…"
                : "Log out"}
          </Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {editing && <ProfileForm onClose={() => setEditing(false)} />}
    </>
  );
}
