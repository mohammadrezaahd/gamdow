"use client";
import { useState } from "react";
import Link from "next/link";
import { Box, FormControlLabel, Stack, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { Button, Checkbox, TextField } from "@/components/ui";
import { PasswordField } from "@/components/ui/password-field";
import type { LoginInput, RegisterFormValues } from "@/types/auth";
export interface AuthFormProps {
  mode: "login" | "register";
}
interface AuthFormValues extends RegisterFormValues {
  rememberMe: LoginInput["rememberMe"];
}
export function AuthForm({ mode }: AuthFormProps) {
  const registering = mode === "register";
  const [values, setValues] = useState<AuthFormValues>({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
  });
  const field = <K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  return (
    // Intentionally inert: no API call, session, password persistence, or redirect.
    <Box
      component="form"
      noValidate
      onSubmit={(event) => event.preventDefault()}
      aria-label={registering ? "Registration preview" : "Login preview"}
    >
      <Stack spacing={2.5}>
        {registering && (
          <TextField
            label="Display name"
            name="displayName"
            autoComplete="nickname"
            value={values.displayName}
            onChange={(e) => field("displayName", e.target.value)}
          />
        )}
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => field("email", e.target.value)}
        />
        <PasswordField
          name="password"
          autoComplete={registering ? "new-password" : "current-password"}
          value={values.password}
          onChange={(e) => field("password", e.target.value)}
        />
        {registering && (
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => field("confirmPassword", e.target.value)}
          />
        )}
        {!registering && (
          <FormControlLabel
            label="Remember me"
            control={
              <Checkbox
                checked={values.rememberMe}
                onChange={(_, checked) => field("rememberMe", checked)}
              />
            }
          />
        )}
        <Button
          type="submit"
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          size="large"
        >
          {registering ? "Create account" : "Log in"}
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          id="auth-preview-note"
        >
          Design preview — these forms do not create an account or sign you in.
        </Typography>
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
