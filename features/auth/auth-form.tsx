"use client";
import { SocialLogin } from "./social-login";
import { useState } from "react";
import Link from "next/link";
import { Alert, Box, FormControlLabel, Stack, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Button, Checkbox, TextField } from "@/components/ui";
import { PasswordField } from "@/components/ui/password-field";
import { authRepository } from "@/services/auth-repository";
import type { LoginInput, RegisterFormValues } from "@/types/auth";
export interface AuthFormProps {
  mode: "login" | "register";
}
interface AuthFormValues extends RegisterFormValues {
  rememberMe: LoginInput["rememberMe"];
}
export function AuthForm({ mode }: AuthFormProps) {
  const registering = mode === "register";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<AuthFormValues>({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: true,
  });
  const field = <K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  return (
    <Box
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError("");
        if (registering && values.password !== values.confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        setBusy(true);
        try {
          if (registering)
            await authRepository.register({
              rememberMe: values.rememberMe,
              displayName: values.displayName,
              email: values.email,
              password: values.password,
            });
          else
            await authRepository.login({
              email: values.email,
              password: values.password,
              rememberMe: values.rememberMe,
            });
          window.location.replace("/");
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Could not sign in.",
          );
          setBusy(false);
        }
      }}
      aria-label={registering ? "Registration" : "Login"}
    >
      <Stack spacing={2.5}>
        <SocialLogin disabled={busy} remember={values.rememberMe} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          OR CONTINUE WITH EMAIL
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {registering && (
          <TextField
            required
            disabled={busy}
            label="Display name"
            name="displayName"
            autoComplete="nickname"
            value={values.displayName}
            onChange={(e) => field("displayName", e.target.value)}
          />
        )}
        <TextField
          required
          disabled={busy}
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => field("email", e.target.value)}
        />
        <PasswordField
          required
          disabled={busy}
          helperText={registering ? "Use at least 12 characters." : undefined}
          name="password"
          autoComplete={registering ? "new-password" : "current-password"}
          value={values.password}
          onChange={(e) => field("password", e.target.value)}
        />
        {registering && (
          <PasswordField
            required
            disabled={busy}
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => field("confirmPassword", e.target.value)}
          />
        )}
        <FormControlLabel
          label="Keep me signed in on this device"
          control={
            <Checkbox
              checked={values.rememberMe}
              onChange={(_, checked) => field("rememberMe", checked)}
            />
          }
        />
        <Button
          disabled={busy}
          type="submit"
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          size="large"
        >
          {busy ? "Please wait…" : registering ? "Create account" : "Log in"}
        </Button>
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            {registering ? "Already have an account?" : "New to the archive?"}
          </Typography>
          <Button
            component={Link}
            href={registering ? "/login" : "/register"}
            size="small"
          >
            {registering ? "Log in" : "Create an account"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
