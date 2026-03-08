import { createClient, AuthType, WebDAVClient } from 'webdav';
import type { WebDAVConfig } from '@/types';

export class WebDAVAdapter {
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig | null = null;

  init(config: WebDAVConfig) {
    this.config = config;
    if (!config.url) {
      this.client = null;
      return;
    }
    
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password,
      authType: AuthType.Password,
      maxContentLength: 50 * 1024 * 1024, // 50MB
    });
  }

  get isInitialized() {
    return this.client !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    try {
      await this.client.getDirectoryContents('/');
      return true;
    } catch (err) {
      console.error('WebDAV connection failed', err);
      return false;
    }
  }

  async getFileContents(filename: string): Promise<string | null> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    try {
      const exists = await this.client.exists(filename);
      if (!exists) {
        return null;
      }
      const contents = await this.client.getFileContents(filename, { format: 'text' });
      return contents as string;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  async putJSON(filename: string, data: any): Promise<boolean> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    try {
      const content = JSON.stringify(data);
      const dirPath = filename.substring(0, filename.lastIndexOf('/'));
      if (dirPath && dirPath !== '') {
        await this.ensureDirectory(dirPath);
      }
      await this.client.putFileContents(filename, content);
      return true;
    } catch (err) {
      console.error(`Failed to put JSON to ${filename}`, err);
      throw err;
    }
  }

  async getJSON<T>(filename: string): Promise<T | null> {
    const contents = await this.getFileContents(filename);
    if (!contents) return null;
    try {
      return JSON.parse(contents) as T;
    } catch (err) {
      console.error(`Failed to parse JSON from ${filename}`, err);
      return null;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    
    const parts = dirPath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += `/${part}`;
      try {
        const exists = await this.client.exists(currentPath);
        if (!exists) {
          await this.client.createDirectory(currentPath);
        }
      } catch (err) {
        // Some providers might throw an error if trying to check/create simultaneously
        console.warn(`Creating directory ${currentPath} might have had an issue:`, err);
      }
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    if (!this.client) throw new Error('WebDAV client not initialized');
    try {
      const exists = await this.client.exists(filename);
      if (exists) {
         await this.client.deleteFile(filename);
      }
      return true;
    } catch (err) {
      console.error(`Failed to delete file ${filename}`, err);
      return false;
    }
  }
}

export const webdavClientAdapter = new WebDAVAdapter();
