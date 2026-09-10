/** Epic account linking is separate from game metadata and personal archive data. */
export interface EpicConnection {
  configured: boolean;
  connected: boolean;
  accountId?: string;
  displayName?: string;
  connectedAt?: string;
  capabilities: {
    libraryImport: boolean;
    playtime: boolean;
    achievements: boolean;
  };
}
