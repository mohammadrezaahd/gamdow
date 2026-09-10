import type { UserProfile } from "./profile";
export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}
export interface RegisterInput {
  rememberMe?: boolean;
  displayName: string;
  email: string;
  password: string;
}
export interface RegisterFormValues extends RegisterInput {
  confirmPassword: string;
}
export interface AuthSession {
  user: UserProfile;
  expiresAt: string;
}
// Implemented by services/auth-repository.ts. Sessions are held in HttpOnly cookies.
export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}
