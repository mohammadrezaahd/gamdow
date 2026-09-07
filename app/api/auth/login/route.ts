import { authenticate } from "@/server/auth";
export const runtime = "nodejs";
export const POST = (request: Request) => authenticate(request, false);
