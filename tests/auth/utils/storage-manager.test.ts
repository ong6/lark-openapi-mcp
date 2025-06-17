import { StorageManager } from '../../../src/auth/utils/storage-manager';
import { EncryptionUtil } from '../../../src/auth/utils/encryption';
import { AUTH_CONFIG } from '../../../src/auth/config';
import keytar from 'keytar';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('keytar');
jest.mock('fs');
jest.mock('../../../src/auth/utils/encryption');

const mockKeytar = keytar as jest.Mocked<typeof keytar>;
const mockFs = fs as jest.Mocked<typeof fs>;
const MockEncryptionUtil = EncryptionUtil as jest.MockedClass<typeof EncryptionUtil>;

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockEncryptInstance: jest.Mocked<EncryptionUtil>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EncryptionUtil
    mockEncryptInstance = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as any;

    MockEncryptionUtil.mockImplementation(() => mockEncryptInstance);
    MockEncryptionUtil.generateKey = jest.fn().mockReturnValue('mock-key');

    // Mock keytar
    mockKeytar.getPassword.mockResolvedValue(null);
    mockKeytar.setPassword.mockResolvedValue(undefined);

    // Mock fs
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockReturnValue(undefined);

    storageManager = new StorageManager();
  });

  describe('initialization', () => {
    it('should initialize with existing AES key', async () => {
      mockKeytar.getPassword.mockResolvedValue('existing-key');

      await storageManager.initialize();

      expect(mockKeytar.getPassword).toHaveBeenCalledWith(AUTH_CONFIG.SERVER_NAME, AUTH_CONFIG.AES_KEY_NAME);
      expect(MockEncryptionUtil).toHaveBeenCalledWith('existing-key');
    });

    it('should generate new AES key if none exists', async () => {
      mockKeytar.getPassword.mockResolvedValue(null);

      await storageManager.initialize();

      expect(MockEncryptionUtil.generateKey).toHaveBeenCalled();
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        AUTH_CONFIG.SERVER_NAME,
        AUTH_CONFIG.AES_KEY_NAME,
        'mock-key',
      );
      expect(MockEncryptionUtil).toHaveBeenCalledWith('mock-key');
    });

    it('should create storage directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await storageManager.initialize();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(AUTH_CONFIG.STORAGE_DIR, { recursive: true });
    });

    it('should not create storage directory if it exists', async () => {
      mockFs.existsSync.mockReturnValue(true);

      await storageManager.initialize();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await storageManager.initialize();
      await storageManager.initialize(); // Second call should be ignored

      expect(mockKeytar.getPassword).toHaveBeenCalledTimes(1);
    });

    it('should handle keytar errors during initialization', async () => {
      mockKeytar.getPassword.mockRejectedValue(new Error('Keytar error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(storageManager.initialize()).rejects.toThrow('Keytar error');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize encryption:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize StorageManager:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle keytar setPassword errors during initialization', async () => {
      mockKeytar.getPassword.mockResolvedValue(null);
      mockKeytar.setPassword.mockRejectedValue(new Error('Keytar setPassword error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(storageManager.initialize()).rejects.toThrow('Keytar setPassword error');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize encryption:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('encryption/decryption', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should encrypt data', () => {
      mockEncryptInstance.encrypt.mockReturnValue('encrypted-data');

      const result = storageManager.encrypt('test-data');

      expect(mockEncryptInstance.encrypt).toHaveBeenCalledWith('test-data');
      expect(result).toBe('encrypted-data');
    });

    it('should decrypt data', () => {
      mockEncryptInstance.decrypt.mockReturnValue('decrypted-data');

      const result = storageManager.decrypt('encrypted-data');

      expect(mockEncryptInstance.decrypt).toHaveBeenCalledWith('encrypted-data');
      expect(result).toBe('decrypted-data');
    });

    it('should throw error if not initialized', () => {
      const uninitializedManager = new StorageManager();

      expect(() => uninitializedManager.encrypt('data')).toThrow('StorageManager not initialized');
      expect(() => uninitializedManager.decrypt('data')).toThrow('StorageManager not initialized');
    });
  });

  describe('storage operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should load storage data from file', async () => {
      const mockData = { tokens: {}, clients: {} };
      const storageFile = path.join(AUTH_CONFIG.STORAGE_DIR, AUTH_CONFIG.STORAGE_FILE);
      const encryptedData = 'encrypted-json-data';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(encryptedData);
      mockEncryptInstance.decrypt.mockReturnValue(JSON.stringify(mockData));

      const result = await storageManager.loadStorageData();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(storageFile, 'utf8');
      expect(mockEncryptInstance.decrypt).toHaveBeenCalledWith(encryptedData);
      expect(result).toEqual(mockData);
    });

    it('should return empty data if file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageManager.loadStorageData();

      expect(result).toEqual({ tokens: {}, clients: {} });
    });

    it('should return empty data on read error', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await storageManager.loadStorageData();

      expect(result).toEqual({ tokens: {}, clients: {} });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load storage data:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should return empty data when file contains empty string', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(''); // 空字符串
      mockEncryptInstance.decrypt.mockReturnValue('');

      const result = await storageManager.loadStorageData();

      expect(result).toEqual({ tokens: {}, clients: {} });
    });

    it('should save storage data to file', async () => {
      const mockData = {
        tokens: {
          token1: {
            token: 'test-token',
            clientId: 'test-client',
            scopes: ['scope1'],
            expiresAt: Date.now() / 1000 + 3600,
          },
        },
        clients: {},
      };
      const storageFile = path.join(AUTH_CONFIG.STORAGE_DIR, AUTH_CONFIG.STORAGE_FILE);
      const encryptedData = 'encrypted-mock-data';

      mockEncryptInstance.encrypt.mockReturnValue(encryptedData);

      await storageManager.saveStorageData(mockData);

      expect(mockEncryptInstance.encrypt).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(storageFile, encryptedData);
    });

    it('should throw error on save failure', async () => {
      const mockData = { tokens: {}, clients: {} };
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      await expect(storageManager.saveStorageData(mockData)).rejects.toThrow('Write error');
    });

    it('should update storage data atomically', async () => {
      const initialData = { tokens: {}, clients: {} };
      const storageFile = path.join(AUTH_CONFIG.STORAGE_DIR, AUTH_CONFIG.STORAGE_FILE);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialData));

      // 使用 loadStorageData 然后 saveStorageData 来模拟更新操作
      const data = await storageManager.loadStorageData();
      data.tokens['new-token'] = {
        token: 'test-token',
        clientId: 'test-client',
        scopes: ['scope1'],
        expiresAt: Date.now() / 1000 + 3600,
      };
      await storageManager.saveStorageData(data);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should auto-initialize when loading storage data', async () => {
      const uninitializedManager = new StorageManager();
      mockFs.existsSync.mockReturnValue(false);

      const result = await uninitializedManager.loadStorageData();

      expect(result).toEqual({ tokens: {}, clients: {} });
      expect(mockKeytar.getPassword).toHaveBeenCalled();
    });

    it('should auto-initialize when saving storage data', async () => {
      const uninitializedManager = new StorageManager();
      const mockData = { tokens: {}, clients: {} };

      await uninitializedManager.saveStorageData(mockData);

      expect(mockKeytar.getPassword).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });
});
