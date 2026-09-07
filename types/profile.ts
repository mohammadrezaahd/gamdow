export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  location: string;
  avatarImage: string;
  favoritePlatforms: string[];
  createdAt: string;
  updatedAt: string;
}
export type ProfileInput = Omit<UserProfile, "id" | "createdAt" | "updatedAt">;
export interface ProfileRepository {
  get(): Promise<UserProfile>;
  update(input: ProfileInput): Promise<UserProfile>;
}
