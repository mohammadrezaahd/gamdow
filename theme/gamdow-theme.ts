import { createTheme } from "@mui/material/styles";

export const glass = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.025)), rgba(19,26,27,.72)",
  backdropFilter: "blur(24px) saturate(140%)",
  WebkitBackdropFilter: "blur(24px) saturate(140%)",
  border: "1px solid rgba(220,244,234,.12)",
  boxShadow:
    "0 16px 44px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.045)",
};
export const gamdowTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#d4f77d", contrastText: "#1c260c" },
    secondary: { main: "#a6dbd4" },
    background: { default: "#0b1113", paper: "#182224" },
    text: { primary: "#f1f5ef", secondary: "#a8b9b5" },
    divider: "rgba(220,244,234,.12)",
    info: { main: "#93c7fa" },
    warning: { main: "#e6c788" },
    error: { main: "#f3a69e" },
  },
  typography: {
    fontFamily: "Inter, Arial, sans-serif",
    h1: { fontWeight: 700, letterSpacing: "-.05em" },
    h2: {
      fontWeight: 700,
      letterSpacing: "-.045em",
      fontSize: "clamp(2rem, 4vw, 3.8rem)",
    },
    h3: {
      fontWeight: 650,
      letterSpacing: "-.04em",
      fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
    },
    h4: { fontWeight: 650, letterSpacing: "-.03em" },
    h5: { fontWeight: 650, fontSize: "1.25rem" },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#0b1113" },
        "*": { boxSizing: "border-box" },
      },
    },
    MuiPaper: { styleOverrides: { root: { ...glass } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 700,
          padding: "9px 17px",
          transition: "transform .2s, background .2s",
          "&:hover": { transform: "translateY(-2px)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: "transform .22s, border-color .22s, box-shadow .22s",
          "&:hover": {
            transform: "translateY(-5px)",
            borderColor: "rgba(212,247,125,.35)",
            boxShadow: "0 24px 50px rgba(0,0,0,.3)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { background: "rgba(6,13,16,.28)", borderRadius: 12 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: "rgba(18,29,31,.96)", borderRadius: 24 },
        container: { backdropFilter: "blur(7px)" },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { backgroundColor: "rgba(18,29,31,.97)" } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { background: "transparent" } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          padding: "8px 3px",
          borderRadius: 18,
          "&.Mui-selected": { background: "rgba(212,247,125,.1)" },
        },
        label: { fontSize: ".65rem", "&.Mui-selected": { fontSize: ".65rem" } },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", minWidth: 80 } },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          "&:focus-visible": { outline: "2px solid #d4f77d", outlineOffset: 3 },
        },
      },
    },
  },
});
