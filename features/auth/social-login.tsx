"use client";
import { useEffect, useState } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import { Google, SportsEsportsRounded } from "@mui/icons-material";
import { Button } from "@/components/ui";
import { apiRequest } from "@/services/http-client";
const messages: Record<string, string> = {
  connected: "Google sign-in connected to your existing account.",
  OAUTH_EMAIL_EXISTS:
    "This email already has a gamdow account. Log in with your password, then connect Google in Profile to keep your collection.",
  OAUTH_ACCOUNT_CONFLICT:
    "That login is already associated with another gamdow account.",
  OAUTH_NOT_CONFIGURED: "This login provider is not configured yet.",
  OAUTH_VERIFICATION_FAILED:
    "Sign-in was cancelled, expired or could not be verified. Please try again.",
};
export function SocialLogin({
  linkGoogle = false,
  remember = false,
  disabled = false,
}: {
  linkGoogle?: boolean;
  remember?: boolean;
  disabled?: boolean;
}) {
  const [providers, setProviders] = useState<{
    google: boolean;
    steam: boolean;
    googleConnected: boolean;
  }>();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const result = new URLSearchParams(location.search).get("auth");
    if (result)
      setMessage(messages[result] || "Sign-in could not be completed.");
    apiRequest<typeof providers>("/api/auth/providers")
      .then((p) => {
        if (active) setProviders(p);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Sign-in options could not be loaded. Email login remains available.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function signIn(provider: "google" | "steam") {
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest<{ url: string }>(
        `/api/auth/${provider}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remember, link: linkGoogle }),
        },
      );
      window.location.assign(result.url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start sign-in.");
      setBusy(false);
    }
  }
  return (
    <Stack spacing={1.5}>
      {message && (
        <Alert
          severity={message === messages.connected ? "success" : "warning"}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}
      {linkGoogle && <Typography variant="h5">Sign-in methods</Typography>}
      <Button
        type="button"
        variant="outlined"
        startIcon={<Google />}
        disabled={
          disabled ||
          busy ||
          !providers?.google ||
          (linkGoogle && providers.googleConnected)
        }
        onClick={() => signIn("google")}
      >
        {linkGoogle
          ? providers?.googleConnected
            ? "Google connected"
            : "Connect Google sign-in"
          : "Sign in with Google"}
      </Button>
      {!linkGoogle && (
        <Button
          type="button"
          variant="outlined"
          startIcon={<SportsEsportsRounded />}
          disabled={disabled || busy || !providers?.steam}
          onClick={() => signIn("steam")}
        >
          Sign in with Steam
        </Button>
      )}
      {providers && !providers.google && (
        <Typography variant="caption" color="text.secondary">
          Google sign-in is awaiting server configuration.
        </Typography>
      )}
      {linkGoogle && (
        <Typography variant="caption" color="text.secondary">
          Connecting Google keeps this account and its collection. Steam sign-in
          uses the account connected in the Steam panel.
        </Typography>
      )}
    </Stack>
  );
}
