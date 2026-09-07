import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";
export const metadata: Metadata = { title: "Log in · gamdow" };
export default function LoginPage() {
  return <AuthPage mode="login" />;
}
