import type {
  AgentMessage,
  Memory,
  MemoryEntry,
  MemoryQueryOptions,
  MemorySession,
  MemoryWriteOptions,
} from "../core/types";

const DEFAULT_SESSION_ID = "default";
const DB_VERSION = 1;
const MESSAGE_STORE = "messages";
const SESSION_STORE = "sessions";

let idbGlobalSequence = 0;

export interface InMemoryOptions {
  maxMessages?: number;
}

export interface IndexedDBMemoryOptions extends InMemoryOptions {
  dbName?: string;
}

type StoredMemoryEntry = MemoryEntry & {
  sequence: number;
};

/**
 * Browser-safe short-term memory backed by an in-memory array.
 *
 * Sessions are isolated by `sessionId`, so UI code can list sessions and render
 * entries without deriving grouping from message metadata.
 *
 * Example:
 * ```ts
 * const memory = new InMemory({ maxMessages: 20 });
 * await memory.add({ role: "user", content: "hello" }, { sessionId: "s1" });
 * await memory.get({ sessionId: "s1" });
 * ```
 */
export class InMemory implements Memory {
  private readonly maxMessages?: number;
  private readonly entries = new Map<string, StoredMemoryEntry[]>();
  private readonly sessions = new Map<string, MemorySession>();
  private sequence = 0;

  constructor(options: InMemoryOptions = {}) {
    this.maxMessages = options.maxMessages;
    this.ensureSession(DEFAULT_SESSION_ID);
  }

  add(message: AgentMessage, options: MemoryWriteOptions = {}): void {
    const sessionId = options.sessionId ?? DEFAULT_SESSION_ID;
    const session = this.ensureSession(sessionId);
    const entries = this.entries.get(sessionId) ?? [];
    const now = Date.now();

    entries.push({
      id: createId("message"),
      sessionId,
      message: cloneMessage(message),
      createdAt: now,
      sequence: this.sequence++,
    });

    this.entries.set(sessionId, this.trim(entries));
    this.sessions.set(sessionId, { ...session, updatedAt: now });
  }

  get(options: MemoryQueryOptions = {}): AgentMessage[] {
    return this.getEntries(options).map((entry) => cloneMessage(entry.message));
  }

  getEntries(options: MemoryQueryOptions = {}): MemoryEntry[] {
    const sessionId = options.sessionId ?? DEFAULT_SESSION_ID;
    const entries = this.entries.get(sessionId) ?? [];
    const limited = options.limit ? entries.slice(-options.limit) : entries;
    return limited.map(({ sequence: _sequence, ...entry }) => ({
      ...entry,
      message: cloneMessage(entry.message),
    }));
  }

  createSession(session: Partial<MemorySession> = {}): MemorySession {
    const created = normalizeSession(session);
    this.sessions.set(created.id, created);
    if (!this.entries.has(created.id)) {
      this.entries.set(created.id, []);
    }
    return cloneSession(created);
  }

  getSession(sessionId: string): MemorySession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : undefined;
  }

  listSessions(): MemorySession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(cloneSession);
  }

  clear(options: MemoryQueryOptions = {}): void {
    if (options.sessionId) {
      this.entries.set(options.sessionId, []);
      const session = this.ensureSession(options.sessionId);
      this.sessions.set(options.sessionId, { ...session, updatedAt: Date.now() });
      return;
    }

    this.entries.clear();
    this.sessions.clear();
    this.ensureSession(DEFAULT_SESSION_ID);
  }

  deleteSession(sessionId: string): void {
    this.entries.delete(sessionId);
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0) {
      this.ensureSession(DEFAULT_SESSION_ID);
    }
  }

  private ensureSession(sessionId: string): MemorySession {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const session = normalizeSession({ id: sessionId });
    this.sessions.set(sessionId, session);
    this.entries.set(sessionId, []);
    return session;
  }

  private trim(entries: StoredMemoryEntry[]): StoredMemoryEntry[] {
    return this.maxMessages && entries.length > this.maxMessages ? entries.slice(-this.maxMessages) : entries;
  }
}

/**
 * Persistent browser memory built on IndexedDB.
 *
 * Example:
 * ```ts
 * const memory = new IndexedDBMemory({ dbName: "my-agent" });
 * await memory.createSession({ id: "cart-help", title: "Cart help" });
 * await memory.add({ role: "user", content: "hello" }, { sessionId: "cart-help" });
 * ```
 */
export class IndexedDBMemory implements Memory {
  private readonly dbName: string;
  private readonly maxMessages?: number;
  private dbPromise?: Promise<IDBDatabase>;

  constructor(options: IndexedDBMemoryOptions = {}) {
    this.dbName = options.dbName ?? "browser-agent-sdk-memory";
    this.maxMessages = options.maxMessages;
  }

  async add(message: AgentMessage, options: MemoryWriteOptions = {}): Promise<void> {
    const sessionId = options.sessionId ?? DEFAULT_SESSION_ID;
    const now = Date.now();
    await this.ensureSession(sessionId);

    const db = await this.open();
    await txDone(db.transaction(MESSAGE_STORE, "readwrite").objectStore(MESSAGE_STORE).add({
      id: createId("message"),
      sessionId,
      message: cloneMessage(message),
      createdAt: now,
      sequence: idbGlobalSequence++,
    } satisfies StoredMemoryEntry));

    await this.updateSessionTimestamp(sessionId, now);
    await this.enforceLimit(sessionId);
  }

  async get(options: MemoryQueryOptions = {}): Promise<AgentMessage[]> {
    const entries = await this.getEntries(options);
    return entries.map((entry) => cloneMessage(entry.message));
  }

  async getEntries(options: MemoryQueryOptions = {}): Promise<MemoryEntry[]> {
    const sessionId = options.sessionId ?? DEFAULT_SESSION_ID;
    const entries = await this.getSessionEntries(sessionId);
    const limited = options.limit ? entries.slice(-options.limit) : entries;
    return limited.map(({ sequence: _sequence, ...entry }) => ({
      ...entry,
      message: cloneMessage(entry.message),
    }));
  }

  async createSession(session: Partial<MemorySession> = {}): Promise<MemorySession> {
    const created = normalizeSession(session);
    const db = await this.open();
    await txDone(db.transaction(SESSION_STORE, "readwrite").objectStore(SESSION_STORE).put(created));
    return cloneSession(created);
  }

  async getSession(sessionId: string): Promise<MemorySession | undefined> {
    const db = await this.open();
    const session = await requestToPromise<MemorySession | undefined>(
      db.transaction(SESSION_STORE, "readonly").objectStore(SESSION_STORE).get(sessionId),
    );
    return session ? cloneSession(session) : undefined;
  }

  async listSessions(): Promise<MemorySession[]> {
    const db = await this.open();
    const sessions = await requestToPromise<MemorySession[]>(
      db.transaction(SESSION_STORE, "readonly").objectStore(SESSION_STORE).getAll(),
    );
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(cloneSession);
  }

  async clear(options: MemoryQueryOptions = {}): Promise<void> {
    if (options.sessionId) {
      const db = await this.open();
      const tx = db.transaction(MESSAGE_STORE, "readwrite");
      await deleteMessagesForSession(tx.objectStore(MESSAGE_STORE), options.sessionId);
      await transactionToPromise(tx);
      await this.updateSessionTimestamp(options.sessionId, Date.now());
      return;
    }

    const db = await this.open();
    const tx = db.transaction([MESSAGE_STORE, SESSION_STORE], "readwrite");
    tx.objectStore(MESSAGE_STORE).clear();
    tx.objectStore(SESSION_STORE).clear();
    await transactionToPromise(tx);
    await this.createSession({ id: DEFAULT_SESSION_ID });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([MESSAGE_STORE, SESSION_STORE], "readwrite");
    tx.objectStore(SESSION_STORE).delete(sessionId);
    await deleteMessagesForSession(tx.objectStore(MESSAGE_STORE), sessionId);
    await transactionToPromise(tx);
  }

  private async ensureSession(sessionId: string): Promise<MemorySession> {
    const existing = await this.getSession(sessionId);
    return existing ?? this.createSession({ id: sessionId });
  }

  private async updateSessionTimestamp(sessionId: string, updatedAt: number): Promise<void> {
    const session = await this.ensureSession(sessionId);
    const db = await this.open();
    await txDone(
      db.transaction(SESSION_STORE, "readwrite")
        .objectStore(SESSION_STORE)
        .put({ ...session, updatedAt }),
    );
  }

  private async enforceLimit(sessionId: string): Promise<void> {
    if (!this.maxMessages) {
      return;
    }

    const db = await this.open();
    const entries = await this.getSessionEntries(sessionId);
    const stale = entries.slice(0, Math.max(0, entries.length - this.maxMessages));
    if (stale.length === 0) {
      return;
    }

    const tx = db.transaction(MESSAGE_STORE, "readwrite");
    const store = tx.objectStore(MESSAGE_STORE);
    stale.forEach((entry) => store.delete(entry.id));
    await transactionToPromise(tx);
  }

  private async getSessionEntries(sessionId: string): Promise<StoredMemoryEntry[]> {
    const db = await this.open();
    const store = db.transaction(MESSAGE_STORE, "readonly").objectStore(MESSAGE_STORE);
    const index = store.index("bySessionId");
    const entries = await requestToPromise<StoredMemoryEntry[]>(index.getAll(sessionId));
    return entries.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.sequence - b.sequence;
    });
  }

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this environment.");
    }

    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
          const store = db.createObjectStore(MESSAGE_STORE, { keyPath: "id" });
          store.createIndex("bySessionId", "sessionId", { unique: false });
        }
      };

      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      request.onsuccess = () => resolve(request.result);
    });

    return this.dbPromise;
  }
}

function normalizeSession(session: Partial<MemorySession>): MemorySession {
  const now = Date.now();
  return {
    id: session.id ?? createId("session"),
    title: session.title,
    createdAt: session.createdAt ?? now,
    updatedAt: session.updatedAt ?? now,
    metadata: { ...session.metadata },
  };
}

function cloneMessage(message: AgentMessage): AgentMessage {
  return { ...message, metadata: { ...message.metadata } };
}

function cloneSession(session: MemorySession): MemorySession {
  return { ...session, metadata: { ...session.metadata } };
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.oncomplete = () => resolve();
  });
}

async function txDone<T>(request: IDBRequest<T>): Promise<T> {
  const result = await requestToPromise(request);
  if (request.transaction) {
    await transactionToPromise(request.transaction);
  }
  return result;
}

function deleteMessagesForSession(store: IDBObjectStore, sessionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index("bySessionId").openKeyCursor(sessionId);

    request.onerror = () => reject(request.error ?? new Error("Failed to delete session messages."));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      // Deleting while walking the index keeps all removals inside the active
      // transaction, which avoids IndexedDB auto-closing between awaited calls.
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}
