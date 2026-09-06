export type GameStatus = "Not started" | "Playing" | "On hold" | "Completed" | "Dropped";
export type PlayPlan = "None" | "Up next" | "Soon" | "Someday" | "Not interested";
export interface ScoreBreakdown { gameplay?: number; story?: number; atmosphere?: number; visuals?: number; sound?: number; }
export interface JournalEntry { id: string; date: string; text: string; }
export interface Game { id: string; title: string; releaseYear: number; genres: string[]; series?: string; platform: string; status: GameStatus; plan: PlayPlan; rating?: number; hoursPlayed?: number; favorite: boolean; description: string; review?: string; scoreBreakdown?: ScoreBreakdown; journalEntries: JournalEntry[]; coverImage: string; heroImage?: string; updatedAt: string; }
export interface GameCollection { id: string; name: string; description: string; gameIds: string[]; }
export interface GalleryItem { id: string; gameId: string; image: string; caption: string; capturedAt: string; favorite: boolean; spoiler: boolean; }
export interface UserPreferences { displayName: string; defaultLibraryView: "grid" | "list"; hideSpoilers: boolean; }
