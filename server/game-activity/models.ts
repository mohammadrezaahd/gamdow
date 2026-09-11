import type { GameActivityEvent } from "@/types/game-activity";

export interface GameActivityEventDocument extends GameActivityEvent {
  _id: string;
  userId: string;
  importId?: string;
}
