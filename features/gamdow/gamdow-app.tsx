"use client";
import { useEffect, useState } from "react";
import { LinearProgress } from "@mui/material";
import { AppShell, navigation, type AppPage } from "@/components/app-shell";
import type { LibraryResponse } from "@/types/api";
import type { Game } from "@/types/game";
import { LibraryProvider, useLibrary } from "./library-context";
import { GameForm } from "./forms/game-form";
import { GameDetail } from "./game-detail";
import { DashboardPage } from "./pages/dashboard-page";
import {
  LibraryPage,
  defaultFilters,
  type LibraryFilters,
} from "./pages/library-page";
import { PlannerPage } from "./pages/planner-page";
import { BrowsePage } from "./pages/browse-page";
import { ReviewsPage } from "./pages/reviews-page";
import { GalleryPage } from "./pages/gallery-page";
import { StatisticsPage } from "./pages/statistics-page";
import { ProfilePage } from "./pages/profile-page";
import { SettingsPage } from "./pages/settings-page";
interface Route {
  page: AppPage;
  gameId?: string;
  tab?: number;
  search: string;
  filters: LibraryFilters;
}
const initialRoute: Route = {
  page: "dashboard",
  search: "",
  filters: defaultFilters,
};
function readRoute(): Route {
  const p = new URLSearchParams(location.search);
  const page = p.get("page") as AppPage;
  const filters = { ...defaultFilters };
  for (const key of Object.keys(filters) as (keyof LibraryFilters)[]) {
    const v = p.get(key);
    if (v !== null) {
      if (key === "favorites") filters.favorites = v === "true";
      else filters[key] = v;
    }
  }
  return {
    page: navigation.some((n) => n.page === page) ? page : "dashboard",
    gameId: p.get("game") ?? undefined,
    tab: Math.min(3, Math.max(0, Number(p.get("tab")) || 0)),
    search: p.get("q") ?? "",
    filters,
  };
}
function AppContent() {
  const { data, ready } = useLibrary();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [form, setForm] = useState<Game | "new" | null>(null);
  useEffect(() => {
    setRoute(readRoute());
    const pop = () => setRoute(readRoute());
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  const navigate = (next: Route, replace = false) => {
    setRoute(next);
    const p = new URLSearchParams();
    p.set("page", next.page);
    if (next.gameId) p.set("game", next.gameId);
    if (next.tab) p.set("tab", String(next.tab));
    if (next.search) p.set("q", next.search);
    for (const key of Object.keys(defaultFilters) as (keyof LibraryFilters)[])
      if (next.filters[key] !== defaultFilters[key])
        p.set(key, String(next.filters[key]));
    history[replace ? "replaceState" : "pushState"](null, "", `?${p}`);
    if (!replace) window.scrollTo({ top: 0, behavior: "instant" });
  };
  const page = (page: AppPage) =>
    navigate({ ...route, page, gameId: undefined, tab: undefined });
  const openGame = (gameId: string, tab = 0) =>
    navigate({ ...route, gameId, tab });
  const search = (value: string) =>
    navigate(
      { ...route, page: "library", gameId: undefined, search: value },
      true,
    );
  const game = data.games.find((g) => g.id === route.gameId);
  return (
    <AppShell
      page={route.page}
      onPageChange={page}
      search={route.search}
      onSearch={search}
      onAdd={() => setForm("new")}
      name={data.profile.displayName}
      avatarImage={data.profile.avatarImage}
    >
      {!ready ? (
        <LinearProgress aria-label="Loading your library" />
      ) : game ? (
        <GameDetail
          key={game.id}
          game={game}
          initialTab={route.tab}
          onBack={() =>
            navigate({ ...route, gameId: undefined, tab: undefined })
          }
          onEdit={() => setForm(game)}
          onGame={openGame}
        />
      ) : (
        <>
          {route.page === "dashboard" && (
            <DashboardPage
              onGame={openGame}
              onLibrary={() => page("library")}
              onPlanner={() => page("planner")}
              onAdd={() => setForm("new")}
            />
          )}
          {route.page === "library" && (
            <LibraryPage
              search={route.search}
              onSearch={search}
              filters={route.filters}
              onFilters={(filters) => navigate({ ...route, filters }, true)}
              onGame={openGame}
              onAdd={() => setForm("new")}
              onEdit={setForm}
            />
          )}
          {route.page === "planner" && (
            <PlannerPage onGame={openGame} onAdd={() => setForm("new")} />
          )}
          {route.page === "collections" && <BrowsePage onGame={openGame} />}
          {route.page === "reviews" && <ReviewsPage onGame={openGame} />}
          {route.page === "gallery" && <GalleryPage onGame={openGame} />}
          {route.page === "statistics" && <StatisticsPage />}
          {route.page === "profile" && <ProfilePage />}
          {route.page === "settings" && (
            <SettingsPage onProfile={() => page("profile")} />
          )}
        </>
      )}
      {ready && form && (
        <GameForm
          game={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
    </AppShell>
  );
}
export function GamdowApp({ initial }: { initial: LibraryResponse }) {
  return (
    <LibraryProvider initial={initial}>
      <AppContent />
    </LibraryProvider>
  );
}
