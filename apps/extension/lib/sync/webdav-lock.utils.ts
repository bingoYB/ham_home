import { XMLParser, XMLValidator } from 'fast-xml-parser';

interface XMLNode { [key: string]: unknown }
export interface DiscoveredLock { token: string; owner: string; timeout?: string; root?: string }
const array = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const node = (value: unknown): XMLNode => value && typeof value === 'object' ? value as XMLNode : {};
const string = (value: unknown): string => typeof value === 'string' ? value : '';

export function parseDAVXML(xml: string): XMLNode {
  if (!xml.trim() || /<!DOCTYPE/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new Error('Invalid WebDAV lock response');
  }
  return new XMLParser({ removeNSPrefix: true, parseTagValue: false, trimValues: true }).parse(xml);
}

export function normalizeLockToken(value: unknown): string {
  return string(value).trim().replace(/^<|>$/g, '');
}

function locksFromProperty(prop: XMLNode): DiscoveredLock[] {
  return array(node(prop.lockdiscovery).activelock).flatMap(value => {
    const lock = node(value);
    const token = normalizeLockToken(node(lock.locktoken).href);
    return token ? [{ token, owner: string(node(lock.owner).href) || string(lock.owner),
      timeout: string(lock.timeout) || undefined, root: string(node(lock.lockroot).href) || undefined }] : [];
  });
}

export function parseLockResponse(xml: string): DiscoveredLock[] {
  return locksFromProperty(node(parseDAVXML(xml).prop));
}

export function parseLockDiscovery(xml: string): { supported: boolean; locks: DiscoveredLock[] } {
  const payload = parseDAVXML(xml);
  let supported = false;
  const locks: DiscoveredLock[] = [];
  for (const response of array(node(payload.multistatus).response)) {
    for (const value of array(node(response).propstat)) {
      const propstat = node(value);
      const prop = node(propstat.prop);
      if (/\s200(?:\s|$)/.test(string(propstat.status)) && 'lockdiscovery' in prop) {
        supported = true;
        locks.push(...locksFromProperty(prop));
      }
    }
  }
  return { supported, locks };
}

export function lockLifetime(timeout?: string): number {
  const seconds = timeout?.match(/^Second-(\d+)$/i)?.[1];
  return seconds ? Math.max(1, Number(seconds)) * 1000 : timeout === 'Infinite' ? Infinity : 600_000;
}
