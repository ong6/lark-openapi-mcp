import keytar from 'keytar';
import fs from 'fs';
import path from 'path';
import { EncryptionUtil } from './encryption';
import { AUTH_CONFIG } from '../config';
import { StorageData } from '../types';

export class StorageManager {
  private encryptionUtil: EncryptionUtil | undefined;
  private isInitialized = false;

  get storageFile(): string {
    return path.join(AUTH_CONFIG.STORAGE_DIR, AUTH_CONFIG.STORAGE_FILE);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.initializeEncryption();
      this.ensureStorageDir();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize StorageManager:', error);
      throw error;
    }
  }

  private async initializeEncryption(): Promise<void> {
    try {
      let key = await keytar.getPassword(AUTH_CONFIG.SERVER_NAME, AUTH_CONFIG.AES_KEY_NAME);
      if (!key) {
        key = EncryptionUtil.generateKey();
        await keytar.setPassword(AUTH_CONFIG.SERVER_NAME, AUTH_CONFIG.AES_KEY_NAME, key);
      }
      this.encryptionUtil = new EncryptionUtil(key);
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(AUTH_CONFIG.STORAGE_DIR)) {
      fs.mkdirSync(AUTH_CONFIG.STORAGE_DIR, { recursive: true });
    }
  }

  encrypt(data: string): string {
    if (!this.encryptionUtil) {
      throw new Error('StorageManager not initialized');
    }
    return this.encryptionUtil.encrypt(data);
  }

  decrypt(encryptedData: string): string {
    if (!this.encryptionUtil) {
      throw new Error('StorageManager not initialized');
    }
    return this.encryptionUtil.decrypt(encryptedData);
  }

  async loadStorageData(): Promise<StorageData> {
    await this.initialize();
    if (!fs.existsSync(this.storageFile)) {
      return { tokens: {}, clients: {} };
    }
    try {
      const data = fs.readFileSync(this.storageFile, 'utf8');
      return data ? JSON.parse(this.decrypt(data)) : { tokens: {}, clients: {} };
    } catch (error) {
      console.error('Failed to load storage data:', error);
      return { tokens: {}, clients: {} };
    }
  }

  async saveStorageData(data: StorageData): Promise<void> {
    await this.initialize();
    try {
      const encryptedData = this.encrypt(JSON.stringify(data, null, 2));
      fs.writeFileSync(this.storageFile, encryptedData);
    } catch (error) {
      console.error('Failed to save storage data:', error);
      throw error;
    }
  }
}

export const storageManager = new StorageManager();
