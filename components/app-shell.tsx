"use client";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  AddRounded,
  AutoAwesomeRounded,
  BarChartRounded,
  CollectionsBookmarkRounded,
  DashboardRounded,
  GridViewRounded,
  MenuBookRounded,
  MoreHorizRounded,
  SearchRounded,
  SettingsRounded,
  ViewTimelineRounded,
  CloseRounded,
} from "@mui/icons-material";
import { glass } from "@/theme/gamdow-theme";
export type AppPage =
  | "dashboard"
  | "library"
  | "planner"
  | "collections"
  | "reviews"
  | "gallery"
  | "statistics"
  | "settings";
export const navigation: { page: AppPage; label: string; icon: ReactNode }[] = [
  { page: "dashboard", label: "Home", icon: <DashboardRounded /> },
  { page: "library", label: "Library", icon: <GridViewRounded /> },
  { page: "planner", label: "Planner", icon: <ViewTimelineRounded /> },
  {
    page: "collections",
    label: "Browse",
    icon: <CollectionsBookmarkRounded />,
  },
  { page: "reviews", label: "Reviews", icon: <MenuBookRounded /> },
  { page: "gallery", label: "Gallery", icon: <AutoAwesomeRounded /> },
  { page: "statistics", label: "Statistics", icon: <BarChartRounded /> },
  { page: "settings", label: "Settings", icon: <SettingsRounded /> },
];
type Props = PropsWithChildren<{
  page: AppPage;
  onPageChange: (page: AppPage) => void;
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  name: string;
}>;
export function AppShell({
  children,
  page,
  onPageChange,
  search,
  onSearch,
  onAdd,
  name,
}: Props) {
  const [more, setMore] = useState(false);
  const go = (next: AppPage) => {
    onPageChange(next);
    setMore(false);
  };
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        p: { xs: 1.25, md: 2 },
        pb: { xs: "calc(106px + env(safe-area-inset-bottom))", md: 2 },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          ...glass,
          top: { xs: 10, md: 16 },
          borderRadius: 4,
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, md: 3 }, px: { xs: 1.5, md: 2.5 } }}>
          <Button
            onClick={() => go("dashboard")}
            sx={{
              minWidth: { md: 186 },
              justifyContent: "flex-start",
              color: "text.primary",
              p: 0,
            }}
            aria-label="gamdow home"
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                mr: 1,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontSize: 25,
                fontWeight: 900,
              }}
            >
              g
            </Box>
            <Typography
              sx={{
                display: { xs: "none", sm: "block" },
                fontWeight: 850,
                fontSize: 23,
                letterSpacing: "-.06em",
              }}
            >
              gamdow
            </Typography>
          </Button>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.4,
              py: 0.3,
              width: { xs: "100%", md: "min(520px, 50%)" },
              border: 1,
              borderColor: "divider",
              bgcolor: "rgba(0,0,0,.12)",
              borderRadius: 3,
            }}
          >
            <SearchRounded fontSize="small" color="action" />
            <InputBase
              inputProps={{ "aria-label": "Search all games" }}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Find your next story…"
              sx={{ ml: 1, flex: 1, minWidth: 0, fontSize: 14 }}
            />
            {search && (
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => onSearch("")}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={onAdd}
            sx={{ display: { xs: "none", md: "flex" }, whiteSpace: "nowrap" }}
          >
            Add game
          </Button>
          <IconButton
            aria-label="Profile settings"
            onClick={() => go("settings")}
          >
            <Avatar
              sx={{
                width: 33,
                height: 33,
                fontSize: 13,
                bgcolor: "rgba(166,219,212,.15)",
                color: "secondary.main",
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { md: "210px minmax(0,1fr)" },
          gap: { md: 3, xl: 4 },
          width: "100%",
          mt: { xs: 3, md: 3 },
        }}
      >
        <Paper
          component="aside"
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            position: "sticky",
            top: 104,
            height: "calc(100dvh - 125px)",
            p: 1.25,
            borderRadius: 4,
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 1.5, py: 1 }}
          >
            YOUR PLAY SPACE
          </Typography>
          <List disablePadding>
            {navigation.map((item) => (
              <ListItemButton
                key={item.page}
                selected={page === item.page}
                onClick={() => go(item.page)}
                sx={{
                  borderRadius: 2.5,
                  mb: 0.75,
                  "&.Mui-selected": {
                    bgcolor: "rgba(212,247,125,.12)",
                    color: "primary.main",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 35, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: { sx: { fontSize: 14, fontWeight: 600 } },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ mt: "auto", p: 1.5 }}>
            <Typography variant="body2" color="primary.main">
              Every game, a story.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Make this space yours.
            </Typography>
          </Box>
        </Paper>
        <Box
          component="main"
          sx={{ minWidth: 0, px: { xs: 0.5, md: 0 }, pr: { md: 1 }, pb: 3 }}
        >
          {children}
        </Box>
      </Box>
      <Paper
        component="nav"
        aria-label="Mobile navigation"
        sx={{
          ...glass,
          display: { xs: "block", md: "none" },
          position: "fixed",
          zIndex: 1200,
          bottom: "calc(14px + env(safe-area-inset-bottom))",
          left: 16,
          right: 16,
          mx: "auto",
          maxWidth: 480,
          p: 0.75,
          borderRadius: 5,
          bgcolor: "rgba(18,31,32,.9)",
          boxShadow: "0 18px 60px #0009, inset 0 1px 0 #ffffff1a",
        }}
      >
        <BottomNavigation
          showLabels
          value={
            ["dashboard", "library", "planner"].includes(page) ? page : "more"
          }
          onChange={(_, v) =>
            v === "more" ? setMore(true) : v === "add" ? onAdd() : go(v)
          }
        >
          {navigation.slice(0, 3).map((item) => (
            <BottomNavigationAction
              key={item.page}
              value={item.page}
              label={item.label}
              icon={item.icon}
            />
          ))}
          <BottomNavigationAction
            value="add"
            label="Add game"
            icon={<AddRounded />}
          />
          <BottomNavigationAction
            value="more"
            label="More"
            icon={<MoreHorizRounded />}
          />
        </BottomNavigation>
      </Paper>
      <Dialog
        open={more}
        onClose={() => setMore(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Explore gamdow
          <IconButton
            aria-label="Close menu"
            onClick={() => setMore(false)}
            sx={{ float: "right" }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <List>
            {navigation.slice(3).map((item) => (
              <ListItemButton
                key={item.page}
                onClick={() => go(item.page)}
                selected={page === item.page}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
