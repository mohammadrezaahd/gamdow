import "server-only";
export function config() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error("MONGODB_URI is not configured");
  const storage =
    process.env.MEDIA_STORAGE ?? (process.env.VERCEL ? "vercel-blob" : "local");
  if (!["local", "vercel-blob"].includes(storage))
    throw new Error("Invalid MEDIA_STORAGE");
  if (process.env.VERCEL && storage === "local")
    throw new Error("Local storage is not persistent on Vercel");
  if (
    storage === "vercel-blob" &&
    !process.env.BLOB_READ_WRITE_TOKEN &&
    !process.env.BLOB_STORE_ID
  )
    throw new Error("Connect a private Vercel Blob store");
  return {
    mongodbUri,
    dbName: process.env.MONGODB_DB ?? "gamdow",
    storage,
    localMediaDir: process.env.LOCAL_MEDIA_DIR ?? ".data/uploads",
  };
}
