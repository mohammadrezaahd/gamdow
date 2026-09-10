export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
  reservedBytes: number;
  fileCount: number;
  freeBytes: number;
}
export interface StoragePlan {
  id: string;
  name: string;
  bytes: number;
  configured: boolean;
  amount?: number;
  currency?: string;
}
