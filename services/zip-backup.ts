"use client";
import {
  BlobReader,
  BlobWriter,
  ZipReader,
  ZipWriter,
  Uint8ArrayReader,
  type FileEntry,
} from "@zip.js/zip.js";
import { apiRequest, ApiError } from "./http-client";
import { validateBackup } from "@/lib/backup";
import type { BackupManifest, BackupImportSession } from "@/types/backup";
import type { LibrarySnapshot } from "@/types/game";
import type { ServerOperationControl } from "@/features/gamdow/use-cloud-library";
const MAX_FILE = 3 * 1024 * 1024;
const hash = async (bytes: Uint8Array<ArrayBuffer>) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
function check(control: ServerOperationControl) {
  if (control.cancelled())
    throw new Error(
      "Backup operation cancelled. Your current library is unchanged.",
    );
}
export async function boundedEntry(entry: FileEntry, limit: number) {
  if (entry.encrypted || entry.uncompressedSize > limit)
    throw new Error("Backup contains an encrypted or oversized file.");
  const parts: Uint8Array[] = [];
  let size = 0;
  await entry.getData(
    new WritableStream<Uint8Array>({
      write(bytes) {
        size += bytes.length;
        if (size > limit)
          throw new Error("Backup file exceeds its declared size.");
        parts.push(bytes);
      },
    }),
    { checkSignature: true, useWebWorkers: false },
  );
  const result = new Uint8Array(size);
  let offset = 0;
  for (const bytes of parts) {
    result.set(bytes, offset);
    offset += bytes.length;
  }
  return result;
}
export async function openBackup(file: File, current: LibrarySnapshot) {
  const reader = new ZipReader(new BlobReader(file), {
    useWebWorkers: false,
    checkSignature: true,
  });
  try {
    const entries = new Map<string, FileEntry>();
    for await (const entry of reader.getEntriesGenerator()) {
      if (
        entry.directory ||
        entry.encrypted ||
        entries.size >= 10001 ||
        entries.has(entry.filename) ||
        !/^(manifest\.json|media\/[a-f0-9-]{36}\.jpg)$/.test(entry.filename)
      )
        throw new Error("This is not a supported gamdow ZIP backup.");
      entries.set(entry.filename, entry);
    }
    const json = entries.get("manifest.json");
    if (!json) throw new Error("Backup manifest is missing.");
    const manifest = validateBackup(
      JSON.parse(new TextDecoder().decode(await boundedEntry(json, MAX_FILE))),
      current,
    );
    if (
      entries.size !== manifest.assets.length + 1 ||
      manifest.assets.some(
        (a) =>
          !a.sha256 ||
          !entries.has(a.path) ||
          entries.get(a.path)!.uncompressedSize !== a.size,
      )
    )
      throw new Error("The ZIP is incomplete or its image sizes do not match.");
    return { manifest, entries, close: () => reader.close() };
  } catch (e) {
    await reader.close();
    throw e;
  }
}
export type OpenBackup = Awaited<ReturnType<typeof openBackup>>;
export type BackupDestination = {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
};
export async function chooseBackupDestination(): Promise<
  BackupDestination | undefined
> {
  const picker = (
    window as Window & {
      showSaveFilePicker?: (options: unknown) => Promise<BackupDestination>;
    }
  ).showSaveFilePicker;
  return picker?.({
    suggestedName: `gamdow-${new Date().toISOString().slice(0, 10)}.zip`,
    types: [
      {
        description: "gamdow ZIP backup",
        accept: { "application/zip": [".zip"] },
      },
    ],
  });
}
export async function exportZip(
  control: ServerOperationControl,
  destination?: BackupDestination,
) {
  const manifest = await apiRequest<BackupManifest>("/api/backups/export");
  // Use direct-to-disk output when supported. The fallback is bounded for mobile memory.
  if (
    !destination &&
    manifest.assets.reduce((n, a) => n + a.size, 0) > 256 * 1024 * 1024
  )
    throw new Error(
      "This browser cannot stream a large backup to disk. Export using a desktop browser with Save File support (Chrome or Edge).",
    );
  const output = destination ? await destination.createWritable() : undefined;
  const writer = new ZipWriter(output ?? new BlobWriter("application/zip"), {
    level: 0,
    useWebWorkers: false,
  });
  try {
    for (let i = 0; i < manifest.assets.length; i++) {
      check(control);
      const asset = manifest.assets[i];
      control.report(`Exporting image ${i + 1} / ${manifest.assets.length}…`);
      const response = await fetch(`/api/media/${asset.id}`, {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          "An image could not be downloaded. Please retry the export.",
        );
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== asset.size || bytes.length > MAX_FILE)
        throw new Error(
          "An image changed during export. Retry after saving your changes.",
        );
      asset.sha256 = await hash(bytes);
      await writer.add(asset.path, new Uint8ArrayReader(bytes));
    }
    check(control);
    const json = new TextEncoder().encode(JSON.stringify(manifest));
    if (json.length > MAX_FILE)
      throw new Error("Backup metadata exceeds 3 MB.");
    await writer.add("manifest.json", new Uint8ArrayReader(json));
    const result = await writer.close();
    if (!destination && result instanceof Blob) {
      const url = URL.createObjectURL(result),
        a = document.createElement("a");
      a.href = url;
      a.download = `gamdow-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } catch (e) {
    if (output) {
      try {
        await output.abort(e);
      } catch {
        /* Stream already closed. */
      }
    }
    throw e;
  }
}
export async function importZip(
  backup: OpenBackup,
  revision: number,
  control: ServerOperationControl,
) {
  const id = crypto.randomUUID();
  let reserved = false;
  try {
    check(control);
    control.report("Checking images and reserving storage…");
    // Server rejects insufficient capacity before any image transfer.
    const job = await apiRequest<BackupImportSession>("/api/backups/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest: backup.manifest,
        revision,
        requestId: id,
      }),
    });
    reserved = true;
    for (let i = 0; i < job.files.length; i++) {
      check(control);
      const file = job.files[i],
        asset = backup.manifest.assets.find((a) => a.id === file.originalId)!;
      control.report(`Importing image ${i + 1} / ${job.files.length}…`);
      const bytes = await boundedEntry(
        backup.entries.get(file.path)!,
        asset.size,
      );
      if (bytes.length !== asset.size || (await hash(bytes)) !== asset.sha256)
        throw new Error(
          "A backup image failed its checksum. Your current library was kept.",
        );
      for (let attempt = 0; ; attempt++) {
        try {
          await apiRequest(`/api/backups/${id}/files/${file.mediaId}`, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: bytes,
          });
          break;
        } catch (e) {
          if (
            attempt ||
            (e instanceof ApiError &&
              e.status < 500 &&
              e.code !== "STORAGE_BUSY")
          )
            throw e;
        }
      }
    }
    check(control);
    control.report("Saving your restored library…");
    await apiRequest(`/api/backups/${id}/commit`, { method: "POST" });
  } catch (e) {
    // Even a lost preflight response may have reserved files. Cancellation is safe after commit too.
    try {
      await apiRequest(`/api/backups/${id}`, { method: "DELETE" });
    } catch {
      if (reserved)
        throw new Error(
          "Import stopped. Cancel the unfinished import in Settings to release reserved storage.",
        );
    }
    throw e;
  }
}
