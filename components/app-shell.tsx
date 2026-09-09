"use client";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Button, Dialog, IconButton, InputBase } from "@/components/ui";
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
  PersonOutlineRounded,
  ViewTimelineRounded,
  CloseRounded,
  NorthEastRounded,
} from "@mui/icons-material";
import { archiveTokens as t, glass } from "@/theme/gamdow-theme";
export type AppPage =
  | "dashboard"
  | "library"
  | "planner"
  | "collections"
  | "reviews"
  | "gallery"
  | "statistics"
  | "settings"
  | "profile";
export const navigation: { page: AppPage; label: string; icon: ReactNode }[] = [
  { page: "dashboard", label: "Overview", icon: <DashboardRounded /> },
  { page: "library", label: "Library", icon: <GridViewRounded /> },
  { page: "planner", label: "Up next", icon: <ViewTimelineRounded /> },
  {
    page: "collections",
    label: "Collections",
    icon: <CollectionsBookmarkRounded />,
  },
  { page: "reviews", label: "Reviews", icon: <MenuBookRounded /> },
  { page: "gallery", label: "Gallery", icon: <AutoAwesomeRounded /> },
  { page: "statistics", label: "Statistics", icon: <BarChartRounded /> },
  { page: "profile", label: "Profile", icon: <PersonOutlineRounded /> },
  { page: "settings", label: "Settings", icon: <SettingsRounded /> },
];
type Props = PropsWithChildren<{
  page: AppPage;
  onPageChange: (page: AppPage) => void;
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  name: string;
  avatarImage?: string;
}>;
export function AppShell({
  children,
  page,
  onPageChange,
  search,
  onSearch,
  onAdd,
  name,
  avatarImage,
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
        width: "100%",
        minWidth: 0,
        px: { xs: 2, md: 3 },
        pb: { xs: "calc(110px + env(safe-area-inset-bottom))", md: 3 },
      }}
    >
      <AppBar
        elevation={0}
        position="sticky"
        sx={{
          top: 0,
          background: "#111311ee",
          backdropFilter: "blur(24px)",
          border: 0,
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: 0,
        }}
      >
        <Toolbar
          disableGutters
          sx={{ minHeight: { xs: 76, md: 92 }, gap: { xs: 2, lg: 4 } }}
        >
          <Button
            aria-label="gamdow home"
            onClick={() => go("dashboard")}
            sx={{
              p: 0,
              minWidth: { xs: 115, md: 205 },
              color: "text.primary",
              justifyContent: "flex-start",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 31,
                height: 35,
                position: "relative",
                color: "primary.main",
                fontFamily: t.display,
                fontSize: 41,
                fontWeight: 700,
                lineHeight: 0.65,
                transform: "rotate(-12deg)",
              }}
            >
              g
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  bgcolor: "primary.main",
                  position: "absolute",
                  bottom: -2,
                  right: -4,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontFamily: t.display,
                fontWeight: 700,
                letterSpacing: "-.075em",
                fontSize: 26,
              }}
            >
              gamdow
            </Typography>
          </Button>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: { xs: "none", lg: "block" }, whiteSpace: "nowrap" }}
          >
            AN INDEPENDENT
            <br />
            PLAY ARCHIVE / VOL. 01
          </Typography>
          <Box
            sx={{
              ml: { md: "auto" },
              width: { xs: "auto", md: 280 },
              minWidth: 0,
              flex: { xs: 1, md: "0 1 280px" },
              display: "flex",
              gap: 1,
              alignItems: "center",
              borderBottom: 1,
              borderColor: "divider",
              py: 0.7,
            }}
          >
            <SearchRounded sx={{ fontSize: 19, color: "text.secondary" }} />
            <InputBase
              inputProps={{ "aria-label": "Search all games" }}
              placeholder="Find a game…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              sx={{ minWidth: 0, width: "100%", fontSize: 12 }}
            />
            {search && (
              <IconButton
                aria-label="Clear search"
                size="small"
                onClick={() => onSearch("")}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Button
            variant="contained"
            onClick={onAdd}
            endIcon={<AddRounded />}
            sx={{ display: { xs: "none", md: "flex" }, whiteSpace: "nowrap" }}
          >
            New entry
          </Button>
          <IconButton
            aria-label="Your profile"
            onClick={() => go("profile")}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <Avatar
              src={avatarImage || undefined}
              alt={name}
              sx={{
                width: 35,
                height: 35,
                fontFamily: t.mono,
                fontSize: 11,
                background: "#d3fc7210",
                color: t.acid,
                border: 1,
                borderColor: "divider",
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
          gridTemplateColumns: { md: "184px minmax(0,1fr)" },
          gap: { md: 4, xl: 6 },
          mt: { xs: 3, md: 4 },
        }}
      >
        <Box
          component="aside"
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            position: "sticky",
            top: 120,
            height: "calc(100dvh - 146px)",
            minHeight: 450,
          }}
        >
          <Typography
            variant="overline"
            sx={{ mb: 2, color: "text.secondary" }}
          >
            INDEX /
          </Typography>
          <List disablePadding>
            {navigation.map((item, i) => (
              <ListItemButton
                key={item.page}
                selected={page === item.page}
                onClick={() => go(item.page)}
                sx={{
                  px: 1.5,
                  py: 1.4,
                  mb: 0.75,
                  border: "1px solid transparent",
                  borderRadius: 1,
                  gap: 1.5,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    background: "#d3fc720c",
                    borderColor: "#d3fc722a",
                    color: "primary.main",
                  },
                  "&:hover": { color: "text.primary" },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontFamily: t.mono, opacity: 0.55 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{item.label}</Typography>
                {page === item.page && (
                  <Box
                    sx={{
                      ml: "auto",
                      width: 5,
                      height: 5,
                      bgcolor: "primary.main",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ mt: "auto", pt: 4, borderTop: 1, borderColor: "divider" }}>
            <Typography
              sx={{
                fontFamily: t.display,
                fontSize: 24,
                letterSpacing: "-.04em",
                lineHeight: 1.15,
              }}
            >
              Good games.
              <br />
              Long memories.
            </Typography>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", mt: 2 }}
            >
              CURATED BY {name.split(" ")[0].toUpperCase()}
            </Typography>
            <NorthEastRounded
              sx={{ color: "primary.main", mt: 2, fontSize: 26 }}
            />
          </Box>
        </Box>
        <Box
          component="main"
          sx={{
            minWidth: 0,
            maxWidth: "100%",
            pb: 4,
            "& > *": { minWidth: 0 },
          }}
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
          left: 16,
          right: 16,
          bottom: "calc(16px + env(safe-area-inset-bottom))",
          maxWidth: 460,
          mx: "auto",
          p: 0.75,
          borderRadius: 5,
          boxShadow: "0 12px 40px #0009, 0 0 0 5px #11131155",
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
            label="New entry"
            icon={<AddRounded sx={{ color: "primary.main" }} />}
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
          The archive
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
            {navigation.slice(3).map((item, i) => (
              <ListItemButton
                key={item.page}
                onClick={() => go(item.page)}
                selected={page === item.page}
                sx={{ gap: 2, borderRadius: 1, py: 2 }}
              >
                <Typography variant="overline" color="text.secondary">
                  0{i + 4}
                </Typography>
                {item.icon}
                <Typography>{item.label}</Typography>
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
