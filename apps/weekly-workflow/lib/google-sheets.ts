import { google } from 'googleapis';
import { getOAuth2Client } from './auth';

// Cache for spreadsheet ID
const spreadsheetCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface GovernanceEntry {
  id?: string;
  timestamp: string;
  week: string;
  type: 'decision' | 'risk' | 'dataset' | 'financial';
  title: string;
  description: string;
  status?: string;
  owner?: string;
  impact?: string;
  amount?: number;
  [key: string]: any;
}

export class GoogleSheetsService {
  private sheets;
  private spreadsheetId?: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  }

  /**
   * Find or create the Governance spreadsheet
   */
  async findOrCreateSpreadsheet(): Promise<string> {
    if (this.spreadsheetId) {
      return this.spreadsheetId;
    }
    
    const cacheKey = `spreadsheet_${this.accessToken.substring(0, 10)}`;
    const cached = spreadsheetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      this.spreadsheetId = cached.id;
      return this.spreadsheetId;
    }

    const drive = google.drive({ version: 'v3', auth: this.sheets.context._options.auth as any });
    const spreadsheetName = 'Governance Register';

    // Search for existing spreadsheet
    const response = await drive.files.list({
      q: `name='${spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      this.spreadsheetId = response.data.files[0].id!;
      spreadsheetCache.set(cacheKey, { id: this.spreadsheetId, timestamp: Date.now() });
      return this.spreadsheetId;
    }

    // Create new spreadsheet
    const spreadsheet = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: spreadsheetName,
        },
        sheets: [
          { properties: { title: 'Decisions' } },
          { properties: { title: 'Risks' } },
          { properties: { title: 'Datasets' } },
          { properties: { title: 'Financial' } },
        ],
      },
    });

    this.spreadsheetId = spreadsheet.data.spreadsheetId!;
    spreadsheetCache.set(cacheKey, { id: this.spreadsheetId, timestamp: Date.now() });

    // Initialize headers for each sheet
    await this.initializeHeaders();

    return this.spreadsheetId;
  }

  /**
   * Initialize headers for all sheets
   */
  private async initializeHeaders(): Promise<void> {
    const spreadsheetId = this.spreadsheetId!;

    // Get actual sheet metadata
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheets = spreadsheet.data.sheets || [];
    const sheetMap: { [key: string]: number } = {};
    
    sheets.forEach(sheet => {
      const title = sheet.properties?.title || '';
      const id = sheet.properties?.sheetId || 0;
      sheetMap[title] = id;
    });

    const headers = {
      Decisions: ['Timestamp', 'Week', 'Title', 'Description', 'Status', 'Owner', 'Impact'],
      Risks: ['Timestamp', 'Week', 'Title', 'Description', 'Severity', 'Likelihood', 'Mitigation', 'Owner'],
      Datasets: ['Timestamp', 'Week', 'Dataset Name', 'Description', 'Source', 'Status', 'Owner'],
      Financial: ['Timestamp', 'Week', 'Item', 'Description', 'Amount', 'Category', 'Status'],
    };

    const requests = Object.entries(headers).map(([sheetName, headerRow]) => {
      const sheetId = sheetMap[sheetName];
      if (sheetId === undefined) return null;
      
      return {
        updateCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headerRow.length,
          },
          rows: [
            {
              values: headerRow.map(header => ({
                userEnteredValue: { stringValue: header },
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              })),
            },
          ],
          fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat)',
        },
      };
    }).filter(r => r !== null);

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }
  }

  /**
   * Get sheet ID by name (removed - now using dynamic lookup)
   */
  private getCurrentWeek(): string {
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${date}`;
  }

  /**
   * Add a governance entry
   */
  async addEntry(entry: GovernanceEntry): Promise<void> {
    const spreadsheetId = await this.findOrCreateSpreadsheet();
    const week = this.getCurrentWeek();
    const timestamp = new Date().toISOString();

    let sheetName: string;
    let values: any[];

    switch (entry.type) {
      case 'decision':
        sheetName = 'Decisions';
        values = [
          timestamp,
          week,
          entry.title,
          entry.description,
          entry.status || '',
          entry.owner || '',
          entry.impact || '',
        ];
        break;
      case 'risk':
        sheetName = 'Risks';
        values = [
          timestamp,
          week,
          entry.title,
          entry.description,
          entry.severity || '',
          entry.likelihood || '',
          entry.mitigation || '',
          entry.owner || '',
        ];
        break;
      case 'dataset':
        sheetName = 'Datasets';
        values = [
          timestamp,
          week,
          entry.title,
          entry.description,
          entry.source || '',
          entry.status || '',
          entry.owner || '',
        ];
        break;
      case 'financial':
        sheetName = 'Financial';
        values = [
          timestamp,
          week,
          entry.title,
          entry.description,
          entry.amount || 0,
          entry.category || '',
          entry.status || '',
        ];
        break;
      default:
        throw new Error(`Unknown entry type: ${entry.type}`);
    }

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  }

  /**
   * Get all entries from a specific sheet
   */
  async getEntries(type: 'decision' | 'risk' | 'dataset' | 'financial'): Promise<GovernanceEntry[]> {
    const spreadsheetId = await this.findOrCreateSpreadsheet();
    
    const sheetNames: { [key: string]: string } = {
      decision: 'Decisions',
      risk: 'Risks',
      dataset: 'Datasets',
      financial: 'Financial',
    };

    const sheetName = sheetNames[type];
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:Z`, // Skip header row
    });

    const rows = response.data.values || [];
    
    return rows.map((row, index) => ({
      id: `${type}-${index}`,
      timestamp: row[0] || '',
      week: row[1] || '',
      type,
      title: row[2] || '',
      description: row[3] || '',
      status: row[4],
      owner: row[5],
      impact: row[6],
      amount: parseFloat(row[4]) || undefined,
    }));
  }

  /**
   * Get entries for the current week
   */
  async getCurrentWeekEntries(): Promise<GovernanceEntry[]> {
    const week = this.getCurrentWeek();
    const allEntries = await Promise.all([
      this.getEntries('decision'),
      this.getEntries('risk'),
      this.getEntries('dataset'),
      this.getEntries('financial'),
    ]);

    return allEntries.flat().filter(entry => entry.week === week);
  }

  /**
   * Get spreadsheet URL
   */
  async getSpreadsheetUrl(): Promise<string> {
    const spreadsheetId = await this.findOrCreateSpreadsheet();
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }
}
