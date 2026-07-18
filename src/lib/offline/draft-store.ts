const DB_NAME = "kekere_drafts";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

interface DraftRecord {
  storyId: string;
  content: object;
  title: string;
  hookLine: string;
  timestamp: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "storyId" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Returns whether the write actually landed — most callers treat IndexedDB
 *  as a best-effort enhancement and ignore this, but a caller relying on it
 *  as the primary (or only) persistence layer needs to know if it silently
 *  failed instead of assuming success. */
export async function saveDraft(
  storyId: string,
  content: object,
  title: string,
  hookLine: string,
  timestamp: string,
): Promise<boolean> {
  try {
    const db = await openDB();
    const record: DraftRecord = { storyId, content, title, hookLine, timestamp };
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    // Silently fail — IndexedDB is an enhancement, never blocks the editor
    return false;
  }
}

export async function getDraft(
  storyId: string,
): Promise<{ content: object; title: string; hookLine: string; timestamp: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(storyId);
    const record = await new Promise<DraftRecord | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (!record) return null;

    return {
      content: record.content,
      title: record.title,
      hookLine: record.hookLine,
      timestamp: record.timestamp,
    };
  } catch {
    return null;
  }
}

export async function clearDraft(storyId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(storyId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail
  }
}

export async function getPendingDrafts(): Promise<Array<{ storyId: string; timestamp: string }>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    const records = await new Promise<DraftRecord[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return records.map((r) => ({ storyId: r.storyId, timestamp: r.timestamp }));
  } catch {
    return [];
  }
}
