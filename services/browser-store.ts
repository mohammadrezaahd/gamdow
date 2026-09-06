import type { LibrarySnapshot } from "@/types/game";
const databaseName = "gamdow-archive";
const storeName = "library";
let connection: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName))
          request.result.createObjectStore(storeName);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = undefined;
        reject(request.error ?? new Error("Browser storage is unavailable."));
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("Close other gamdow tabs and try again."));
      };
    });
  return connection;
}
export async function readSnapshot(): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get("current");
    let value: unknown;
    request.onsuccess = () => {
      value = request.result;
    };
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function writeSnapshot(snapshot: LibrarySnapshot): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(snapshot, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
