"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import type { PropsWithChildren } from "react";
import { gamdowTheme } from "@/theme/gamdow-theme";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={gamdowTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
