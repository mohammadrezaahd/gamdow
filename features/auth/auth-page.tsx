"use client";
import Link from "next/link";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { Button, Chip } from "@/components/ui";

import { archiveTokens as t } from "@/theme/gamdow-theme";
import { AuthForm, type AuthFormProps } from "./auth-form";
export function AuthPage({ mode }: AuthFormProps) {
  const registering = mode === "register";
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { md: "1.1fr 1fr" },
      }}
    >
      <Box
        sx={{
          p: { xs: 3, md: 6 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: { md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: "divider",
          background:
            "radial-gradient(ellipse at 40% 40%, #d3fc7216, transparent 65%)",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography
            component={Link}
            href="/"
            sx={{
              fontFamily: t.display,
              fontWeight: 700,
              fontSize: 32,
              color: "text.primary",
              textDecoration: "none",
              letterSpacing: "-.075em",
            }}
          >
            gamdow<span style={{ color: t.acid }}>↗</span>
          </Typography>
          <Typography variant="overline" color="text.secondary">
            PLAY ARCHIVE / VOL. 01
          </Typography>
        </Stack>
        <Box sx={{ py: { xs: 3, md: 5 } }}>
          <Typography variant="overline" color="primary.main">
            FOR THE GAMES THAT STAY WITH YOU
          </Typography>
          <Typography
            component="p"
            sx={{
              fontFamily: t.display,
              fontWeight: 700,
              letterSpacing: "-.07em",
              fontSize: { xs: 42, md: 68, xl: 88 },
              lineHeight: 1.02,
              mt: 2,
            }}
          >
            Good games.
            <br />
            <Box component="span" sx={{ color: "primary.main" }}>
              Long memories.
            </Box>
          </Typography>
          <Box
            aria-hidden
            sx={{
              height: { xs: 0, md: 235, xl: 320 },
              position: "relative",
              mt: { md: 5 },
              display: { xs: "none", md: "block" },
            }}
          >
            {["COLLECT", "PLAY", "REMEMBER"].map((label, index) => (
              <Box
                key={label}
                sx={{
                  position: "absolute",
                  width: "32%",
                  maxWidth: 200,
                  height: "100%",
                  left: `${14 + index * 22}%`,
                  transform: `rotate(${(index - 1) * 12}deg) translateY(${index === 1 ? -8 : 10}px)`,
                  zIndex: index === 1 ? 2 : 1,
                  boxShadow: "0 20px 40px #0009",
                  border: "5px solid #242a20",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: `linear-gradient(${45 + index * 70}deg, #111311, #35462b)`,
                  }}
                >
                  <Typography color="primary.main" variant="overline">
                    0{index + 1} / GAM DOW
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: t.display,
                      fontWeight: 700,
                      color: "primary.main",
                      fontSize: 28,
                      writingMode: "vertical-rl",
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: "none", md: "block" }, mt: 3 }}
        >
          COLLECT / PLAY / REMEMBER
        </Typography>
      </Box>
      <Box
        sx={{
          p: { xs: 3, sm: 5, md: 6 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 460, mx: "auto" }}>
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackRounded />}
            sx={{ mb: 4 }}
          >
            Back to the archive
          </Button>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 4 },
              background: "linear-gradient(145deg, #242b2099, #171a17cc)",
              boxShadow: "0 24px 80px #0004",
            }}
          >
            <Chip
              size="small"
              label="YOUR NEXT CHAPTER"
              sx={{ mb: 2, color: "primary.main" }}
            />
            <Typography variant="h3" component="h1">
              {registering ? "Make it yours." : "Welcome back."}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4 }}>
              {registering
                ? "A home for your collection, your notes and every unforgettable ending."
                : "Your collection. Your stories. Right where you left them."}
            </Typography>
            <AuthForm key={mode} mode={mode} />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
