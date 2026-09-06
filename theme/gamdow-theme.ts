import { createTheme } from "@mui/material/styles";
export const gamdowTheme = createTheme({
  palette: { mode: "dark", primary: { main: "#d4f77d", contrastText: "#1c260c" }, background: { default: "#111310", paper: "#1b1e18" }, text: { primary: "#f1f3eb", secondary: "#a3aa99" }, divider: "#30352b", info: { main: "#93c7fa" }, warning: { main: "#e6c788" }, error: { main: "#e8a29b" } },
  typography: { fontFamily: "Inter, Arial, sans-serif", h1: { fontFamily: "Arial Rounded MT Bold, Inter, Arial, sans-serif", fontWeight: 500, letterSpacing: "-.055em" }, h2: { fontFamily: "Arial Rounded MT Bold, Inter, Arial, sans-serif", fontWeight: 500, letterSpacing: "-.035em" } },
  shape: { borderRadius: 12 },
  components: { MuiCssBaseline: { styleOverrides: { body: { backgroundColor: "#111310" }, "*": { boxSizing: "border-box" } } }, MuiButton: { styleOverrides: { root: { borderRadius: 9, textTransform: "none", fontWeight: 700, boxShadow: "none" } } }, MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } } }
});
