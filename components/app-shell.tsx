"use client";

import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import CollectionsBookmarkRounded from "@mui/icons-material/CollectionsBookmarkRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import ViewTimelineRounded from "@mui/icons-material/ViewTimelineRounded";
import { AppBar, Box, BottomNavigation, BottomNavigationAction, IconButton, InputBase, List, ListItemButton, ListItemIcon, ListItemText, Paper, Stack, Toolbar, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";

export type AppPage = "dashboard" | "library" | "planner" | "collections" | "reviews" | "gallery" | "statistics" | "settings";

const navigation: { page: AppPage; label: string; icon: React.ReactNode }[] = [
  { page: "dashboard", label: "Dashboard", icon: <DashboardRounded /> },
  { page: "library", label: "Library", icon: <GridViewRounded /> },
  { page: "planner", label: "Planner", icon: <ViewTimelineRounded /> },
  { page: "collections", label: "Collections", icon: <CollectionsBookmarkRounded /> },
  { page: "reviews", label: "Reviews", icon: <MenuBookRounded /> },
  { page: "gallery", label: "Gallery", icon: <AutoAwesomeRounded /> },
  { page: "statistics", label: "Statistics", icon: <BarChartRounded /> },
  { page: "settings", label: "Settings", icon: <SettingsRounded /> },
];

type AppShellProps = PropsWithChildren<{ page: AppPage; onPageChange: (page: AppPage) => void }>;

export function AppShell({ children, page, onPageChange }: AppShellProps) {
  return (
    <Box sx={{ minHeight: "100vh", pb: { xs: 8, md: 0 } }}>
      <AppBar elevation={0} position="sticky" color="transparent" sx={{ borderBottom: 1, borderColor: "divider", backdropFilter: "blur(18px)" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: { md: 230 } }}>
            <Box sx={{ width: 31, height: 31, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 900 }}>g</Box>
            <Typography variant="h6" fontWeight={900} letterSpacing={-0.7}>gamdow</Typography>
          </Stack>
          <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", px: 1.2, width: "min(480px, 100%)", borderRadius: 2, bgcolor: "background.default" }}>
            <SearchRounded color="action" fontSize="small" />
            <InputBase placeholder="Search your collection…" sx={{ ml: 1, flex: 1, fontSize: 14 }} />
            <Typography variant="caption" color="text.secondary">⌘ K</Typography>
          </Paper>
          <Box sx={{ flex: 1 }} />
          <IconButton sx={{ bgcolor: "background.paper" }}>MR</IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "grid", gridTemplateColumns: { md: "252px minmax(0,1fr)" }, maxWidth: 1520, mx: "auto" }}>
        <Box component="aside" sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 65, height: "calc(100vh - 65px)", borderRight: 1, borderColor: "divider", p: 1.5 }}>
          <List disablePadding>
            {navigation.map((item) => <ListItemButton key={item.page} selected={page === item.page} onClick={() => onPageChange(item.page)} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon><ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }} />
            </ListItemButton>)}
          </List>
        </Box>
        <Box component="main" sx={{ p: { xs: 2, sm: 3, lg: 4 }, minWidth: 0 }}>{children}</Box>
      </Box>
      <Paper sx={{ display: { xs: "block", md: "none" }, position: "fixed", zIndex: 10, bottom: 0, left: 0, right: 0, borderRadius: 0 }} elevation={8}>
        <BottomNavigation value={page} onChange={(_, value) => onPageChange(value)}>
          {navigation.slice(0, 5).map((item) => <BottomNavigationAction key={item.page} value={item.page} label={item.label} icon={item.icon} />)}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
