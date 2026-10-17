"use client";
import { EpicConnectionPanel } from "../epic/epic-connection";
import { SocialLogin } from "@/features/auth/social-login";
import { SteamConnectionPanel } from "../steam/steam-connection";
import { useState } from "react";
import { authRepository } from "@/services/auth-repository";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import { EditRounded, ExpandMoreRounded } from "@mui/icons-material";
import { Button, Chip } from "@/components/ui";
import { SectionTitle } from "@/components/page-parts";
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
        eyebrow="YOUR ACCOUNT"
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
          p: { xs: 2.5, md: 3.5 },
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
            fontSize: { xs: 90, md: 170 },
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
              width: { xs: 82, sm: 100 },
              height: { xs: 82, sm: 100 },
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
            <Typography variant="h2" sx={{ mt: 1 }}>
              {profile.displayName}
            </Typography>
            {profile.username && (
              <Typography color="primary.main" sx={{ mt: 1 }}>
                @{profile.username.replace(/^@/, "")}
              </Typography>
            )}
            {profile.bio && <Typography color="text.secondary" sx={{ mt: 1.5, whiteSpace: "pre-wrap", maxWidth: 650 }}>{profile.bio}</Typography>}
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
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Connected accounts</Typography>
            <Typography variant="body2" color="text.secondary">Steam, Epic and Google sign-in</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <SteamConnectionPanel />
            <EpicConnectionPanel />
            <Paper sx={{ p: 2 }}>
              <SocialLogin linkGoogle disabled={hasUnsavedChanges} />
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>
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
