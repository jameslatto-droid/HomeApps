import { google } from 'googleapis';
import { getOAuth2Client } from './auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime: string;
}

// Cache for folder IDs to reduce API calls
const folderCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class GoogleDriveService {
  private drive;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Get the current week folder name in format "Week YYYY-MM-DD"
   */
  private getWeekFolderName(): string {
    const now = new Date();
    // Get Monday of current week
    const monday = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    
    return `Week ${year}-${month}-${date}`;
  }

  /**
   * Find or create the root Governance folder
   */
  async findOrCreateGovernanceFolder(): Promise<string> {
    const folderName = 'Governance Workflow';
    const cacheKey = `root_${this.accessToken.substring(0, 10)}`;
    
    // Check cache first
    const cached = folderCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.id;
    }
    
    // Search for existing folder
    const response = await this.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id!;
      folderCache.set(cacheKey, { id: folderId, timestamp: Date.now() });
      return folderId;
    }

    // Create folder if not found
    const folder = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    const folderId = folder.data.id!;
    folderCache.set(cacheKey, { id: folderId, timestamp: Date.now() });
    return folderId;
  }

  /**
   * Find or create week folder inside Governance folder
   */
  async findOrCreateWeekFolder(): Promise<string> {
    const rootFolderId = await this.findOrCreateGovernanceFolder();
    const weekFolderName = this.getWeekFolderName();
    const cacheKey = `week_${weekFolderName}_${this.accessToken.substring(0, 10)}`;
    
    // Check cache first
    const cached = folderCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.id;
    }

    // Search for existing week folder
    const response = await this.drive.files.list({
      q: `name='${weekFolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id!;
      folderCache.set(cacheKey, { id: folderId, timestamp: Date.now() });
      return folderId;
    }

    // Create week folder
    const folder = await this.drive.files.create({
      requestBody: {
        name: weekFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      },
      fields: 'id',
    });

    return folder.data.id!;
  }

  /**
   * Upload a file to the current week's folder
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DriveFile> {
    const folderId = await this.findOrCreateWeekFolder();

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: file as any,
      },
      fields: 'id, name, mimeType, webViewLink, createdTime',
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: response.data.mimeType!,
      webViewLink: response.data.webViewLink || undefined,
      createdTime: response.data.createdTime!,
    };
  }

  /**
   * List files in the current week's folder
   */
  async listWeekFiles(): Promise<DriveFile[]> {
    const folderId = await this.findOrCreateWeekFolder();

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
      spaces: 'drive',
    });

    return (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      webViewLink: file.webViewLink || undefined,
      createdTime: file.createdTime!,
    }));
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({
      fileId,
    });
  }

  /**
   * Get week folder link for sharing
   */
  async getWeekFolderLink(): Promise<string> {
    const folderId = await this.findOrCreateWeekFolder();
    
    const response = await this.drive.files.get({
      fileId: folderId,
      fields: 'webViewLink',
    });

    return response.data.webViewLink || '';
  }
}
