import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { database } from "./database";
import { sameOrigin, readJson, json, failure, HttpError } from "./http";
import { limitAuth } from "./rate-limit";
import { createSession } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { createEmptyLibrary } from "@/lib/empty-library";
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
  rememberMe: z.boolean().optional(),
});
const registration = credentials.extend({
  displayName: z.string().trim().min(1).max(80),
  password: z
    .string()
    .min(12, "Use at least 12 characters for your password.")
    .max(256),
});
export async function authenticate(request: Request, register: boolean) {
  try {
    sameOrigin(request);
    const input = (register ? registration : credentials).parse(
      await readJson(request, 8192),
    );
    await limitAuth(request, input.email);
    const db = await database();
    let account;
    if (register) {
      const details = registration.parse(input);
      const now = new Date();
      const id = randomUUID();
      account = {
        _id: id,
        email: details.email,
        passwordHash: await hashPassword(details.password),
        createdAt: now,
        snapshot: createEmptyLibrary(
          id,
          details.displayName,
          now.toISOString(),
        ),
        revision: 0,
      };
      try {
        await db.accounts.insertOne(account);
      } catch (error) {
        if ((error as { code?: number }).code === 11000)
          throw new HttpError(
            409,
            "An account with this email already exists.",
            "EMAIL_EXISTS",
          );
        throw error;
      }
    } else {
      account = await db.accounts.findOne({ email: input.email });
      if (
        !(await verifyPassword(input.password, account?.passwordHash)) ||
        !account
      )
        throw new HttpError(
          401,
          "Email or password is incorrect.",
          "INVALID_CREDENTIALS",
        );
    }
    const expiresAt = await createSession(
      account._id,
      input.rememberMe ?? false,
    );
    return json(
      { user: account.snapshot.profile, expiresAt: expiresAt.toISOString() },
      register ? 201 : 200,
    );
  } catch (error) {
    return failure(error);
  }
}
