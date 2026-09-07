import { redirect } from "next/navigation";
import { currentSession } from "@/server/session";
import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";
export const metadata: Metadata = { title: "Log in · gamdow" };
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await currentSession()) redirect("/");
  return <AuthPage mode="login" />;
}
