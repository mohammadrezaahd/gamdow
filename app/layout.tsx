import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "./providers";
import "react-day-picker/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamdow — The play archive",
  description:
    "An independent archive of games, memories and unfinished adventures.",
};
export const viewport: Viewport = {
  themeColor: "#111311",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
