import { libraryView } from "@/server/library-storage";
import { redirect } from "next/navigation";
import { GamdowApp } from "@/features/gamdow/gamdow-app";
import { currentSession } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return (
    <GamdowApp
      initial={{
        snapshot: await libraryView(session.account),
        revision: session.account.revision,
      }}
    />
  );
}
