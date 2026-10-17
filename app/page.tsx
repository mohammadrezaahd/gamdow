import { libraryView } from "@/server/library-storage";
import { GamdowApp } from "@/features/gamdow/gamdow-app";
import { currentSession } from "@/server/session";
import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Gamdow — Every game leaves a trace",
  description:
    "Your independent game archive. Collect what you play, track your progress, keep the stories, and connect supported game libraries.",
};
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const session = await currentSession();
  if (!session) return <LandingPage />;
  return (
    <GamdowApp
      initial={{
        snapshot: await libraryView(session.account),
        revision: session.account.revision,
      }}
    />
  );
}
