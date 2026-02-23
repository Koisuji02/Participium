import { Page } from '@playwright/test';
import { API_BASE_URL } from '../fixtures/testData';


export class DatabaseHelper {
  constructor(private page: Page) {}


  /**
   * Create a test report via API
   */
  async createReport(
    token: string,
    reportData: {
      title: string;
      description: string;
      category: string;
      latitude: number;
      longitude: number;
      anonymity: boolean;
    }
  ) {
    const fakeImageBuffer = Buffer.from('fake-image-data');
    
    const response = await this.page.request.post(`${API_BASE_URL}/reports`, {
      multipart: {
        title: reportData.title,
        latitude: reportData.latitude.toString(),
        longitude: reportData.longitude.toString(),
        anonymity: reportData.anonymity ? '1' : '0',
        category: reportData.category,
        description: reportData.description,
        photos: {
          name: 'test-photo.jpg',
          mimeType: 'image/jpeg',
          buffer: fakeImageBuffer,
        },
      },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok()) {
      return await response.json();
    }
    
    const errorBody = await response.text();
    throw new Error(`Failed to create report: ${response.status()} - ${errorBody}`);
  }

  /**
   * Get all approved reports
   */
  async getApprovedReports() {
    const response = await this.page.request.get(`${API_BASE_URL}/reports`);
    
    if (response.ok()) {
      return await response.json();
    }
    return [];
  }
}
