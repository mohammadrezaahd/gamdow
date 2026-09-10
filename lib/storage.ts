export const FREE_STORAGE_BYTES = 1024 ** 3;
export const storagePacks = [
  { id: "1gb", name: "+1 GB", bytes: 1024 ** 3 },
  { id: "5gb", name: "+5 GB", bytes: 5 * 1024 ** 3 },
  { id: "20gb", name: "+20 GB", bytes: 20 * 1024 ** 3 },
] as const;
export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}
