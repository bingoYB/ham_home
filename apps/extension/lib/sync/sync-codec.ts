/**
 * Encoding of bookmark content chunks and content fingerprints (pure, no storage or network).
 *
 * Remote chunk format: `{ "data": base64(gzip(JSON.stringify({ content }))) }`.
 * Earlier versions decoded gzip data with `unzipSync` (zip and gzip are different formats),
 * which always failed, so every bookmark pulled from another device ended up without
 * content. `decompressSync` detects gzip/zlib/deflate, so chunks already on the server are
 * readable without any migration.
 */
import { decompressSync, gzipSync, strFromU8, strToU8 } from 'fflate';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Content -> chunk file body. */
export function encodeContentChunk(content: string): { data: string } {
  return { data: bytesToBase64(gzipSync(strToU8(JSON.stringify({ content })))) };
}

/**
 * Chunk file body -> content.
 *
 * Throws on any format problem so callers keep the local content instead of writing an
 * empty string over it.
 */
export function decodeContentChunk(chunk: unknown): string {
  const data = (chunk as { data?: unknown } | null)?.data;
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Invalid content chunk: missing data');
  }
  const json = JSON.parse(strFromU8(decompressSync(base64ToBytes(data)))) as { content?: unknown };
  if (typeof json.content !== 'string') {
    throw new Error('Invalid content chunk: missing content');
  }
  return json.content;
}

/**
 * Content fingerprint: length + 32-bit FNV-1a hash.
 *
 * Stored in the remote meta to tell whether the remote content differs from the local
 * copy, so chunks are only transferred when the content actually changed rather than on
 * every metadata edit.
 */
export function contentFingerprint(content: string | undefined | null): string | undefined {
  if (!content) return undefined;
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${content.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}
