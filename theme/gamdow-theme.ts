import { createTheme } from "@mui/material/styles";

export const archiveTokens = {
  ink: "#111311",
  surface: "#1a1d18",
  raised: "#23271f",
  line: "#e3efd31f",
  paper: "#eeeee5",
  muted: "#a3ab9a",
  acid: "#d3fc72",
  orange: "#e5a67b",
  display: '"Space Grotesk", sans-serif',
  body: '"DM Sans", Arial, sans-serif',
  mono: '"SFMono-Regular", Consolas, monospace',
};
export const glass = {
  background: "linear-gradient(125deg, #ffffff08, #ffffff02), #171d17e8",
  backdropFilter: "blur(28px) saturate(130%)",
  WebkitBackdropFilter: "blur(28px) saturate(130%)",
  border: `1px solid ${archiveTokens.line}`,
  boxShadow: "0 18px 65px #0005, inset 0 1px 0 #ffffff08",
};
const t = archiveTokens;
export const gamdowTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: t.acid, contrastText: t.ink },
    secondary: { main: t.orange },
    background: { default: t.ink, paper: t.surface },
    text: { primary: t.paper, secondary: t.muted },
    divider: t.line,
    error: { main: "#ffa59c" },
    warning: { main: t.orange },
    info: { main: "#b6c9e5" },
    success: { main: t.acid },
  },
  typography: {
    fontFamily: t.body,
    fontSize: 14,
    h1: {
      fontFamily: t.display,
      fontWeight: 700,
      letterSpacing: "-.065em",
      lineHeight: 0.98,
    },
    h2: {
      fontFamily: t.display,
      fontWeight: 700,
      letterSpacing: "-.06em",
      lineHeight: 1.03,
      fontSize: "clamp(2.7rem, 5vw, 5.5rem)",
    },
    h3: {
      fontFamily: t.display,
      fontWeight: 700,
      letterSpacing: "-.055em",
      lineHeight: 1.1,
      fontSize: "clamp(2rem, 3vw, 3.3rem)",
    },
    h4: { fontFamily: t.display, fontWeight: 700, letterSpacing: "-.045em" },
    h5: {
      fontFamily: t.display,
      fontWeight: 700,
      fontSize: "1.2rem",
      letterSpacing: "-.025em",
    },
    overline: {
      fontFamily: t.mono,
      fontSize: 10,
      letterSpacing: ".13em",
      lineHeight: 1.8,
    },
    caption: { fontSize: 11 },
    button: { fontSize: 13, fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": { colorScheme: "dark" },
        body: { backgroundColor: t.ink, color: t.paper },
        "*": { boxSizing: "border-box" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${t.line}`,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 5,
          padding: "11px 19px",
          fontWeight: 700,
          letterSpacing: "-.015em",
          transition: "background .18s, box-shadow .18s",
          "&:focus-visible": {
            outline: `2px solid ${t.acid}`,
            outlineOffset: 4,
          },
        },
        contained: { boxShadow: "inset 0 -2px 0 #0002" },
        outlined: {
          borderColor: t.line,
          color: t.paper,
          "&:hover": { borderColor: t.acid, background: "#d3fc720a" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          "&:focus-visible": {
            outline: `2px solid ${t.acid}`,
            outlineOffset: 3,
          },
        },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "#0e110fb3",
          borderRadius: 7,
          fontSize: 14,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#a5b58a80",
          },
          "&.Mui-focused": { boxShadow: "0 0 0 3px #d3fc7210" },
        },
        notchedOutline: { borderColor: "#dcebd12b" },
        input: { padding: "14px" },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, fontSize: 11 } },
    },
    MuiSelect: { styleOverrides: { icon: { color: t.acid, fontSize: 20 } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...glass,
          backgroundColor: "#1a211af5",
          padding: 5,
          borderRadius: 9,
        },
        list: { padding: 0 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: 13,
          borderRadius: 4,
          margin: 2,
          "&.Mui-selected": {
            color: t.acid,
            background: "#d3fc7214",
            "&:hover": { background: "#d3fc7222" },
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { ...glass, backgroundColor: "#1a211af5", borderRadius: 9 },
        option: {
          fontSize: 13,
          borderRadius: 4,
          margin: 4,
          '&[aria-selected="true"]': {
            background: "#d3fc7218 !important",
            color: t.acid,
          },
        },
        tag: { borderRadius: 4 },
        popupIndicator: { color: t.acid },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 48, height: 28, padding: 3, margin: 8 },
        switchBase: {
          padding: 6,
          "&.Mui-checked": {
            transform: "translateX(20px)",
            color: t.ink,
            "& + .MuiSwitch-track": { backgroundColor: t.acid, opacity: 1 },
          },
        },
        thumb: { width: 16, height: 16, borderRadius: 4, boxShadow: "none" },
        track: { borderRadius: 6, backgroundColor: "#66715c", opacity: 0.5 },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { height: 4 },
        thumb: { width: 14, height: 22, borderRadius: 4 },
        rail: { opacity: 0.16 },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: "#71825f", borderRadius: 4 } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: 10,
          fontFamily: t.mono,
          borderRadius: 4,
          border: `1px solid ${t.line}`,
          height: 25,
          background: "#d3fc720b",
        },
        colorPrimary: { background: t.acid, color: t.ink },
      },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: 150 },
      styleOverrides: {
        paper: {
          ...glass,
          background: "#1a201af7",
          borderRadius: 16,
          maxHeight: "calc(100dvh - 32px)",
          margin: 16,
        },
        container: { backdropFilter: "blur(10px)" },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: t.display,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-.04em",
          padding: "24px",
        },
      },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: 24 } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "18px 24px",
          gap: 8,
          borderTop: `1px solid ${t.line}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 42 },
        indicator: { height: 2, bottom: 0 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          textTransform: "none",
          fontSize: 12,
          minWidth: 80,
          color: t.muted,
          padding: "10px 16px",
          "&.Mui-selected": { color: t.acid },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { background: "transparent", height: 58 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          padding: "8px 3px",
          borderRadius: 14,
          "&.Mui-selected": { color: t.acid, background: "#d3fc7210" },
        },
        label: { fontSize: 9, marginTop: 4, "&.Mui-selected": { fontSize: 9 } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          borderColor: t.line,
          "&.Mui-selected": { background: "#d3fc7219", color: t.acid },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: 13, border: `1px solid ${t.line}` },
      },
    },
  },
});
