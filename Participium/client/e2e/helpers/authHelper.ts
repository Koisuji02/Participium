import { Page } from '@playwright/test';
import { API_BASE_URL } from '../fixtures/testData';

export class AuthHelper {
  constructor(private page: Page) {}

  async registerUser(userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const response = await this.page.request.post(`${API_BASE_URL}/users`, {
      data: userData,
    });
    
    if (response.ok()) {
      return await response.json();
    }
    throw new Error(`Registration failed: ${response.status()}`);
  }

  /**
   * Login as a user via API and get the token (does not set in browser)
   */
  async loginUser(username: string, password: string): Promise<string> {
    const response = await this.page.request.post(`${API_BASE_URL}/auth/users`, {
      data: { username, password },
    });
    
    if (response.ok()) {
      let token = await response.text();
      // Remove surrounding quotes if present
      token = token.replace(/^"|"$/g, '');
      return token;
    }
    throw new Error(`Login failed: ${response.status()}`);
  }
  
  /**
   * Set authentication token in browser localStorage
   */
  async setAuthToken(token: string, isOfficer: boolean = false) {
    // Navigate to app first to establish context
    await this.page.goto('/');
    await this.page.evaluate(({ token, isOfficer }) => {
      if (isOfficer) {
        localStorage.setItem('officerToken', token);
      } else {
        localStorage.setItem('userToken', token);
      }
    }, { token, isOfficer });
  }

  /**
   * Login as an officer via API and get the token (does not set in browser)
   */
  async loginOfficer(emailOrUsername: string, password: string): Promise<string> {
    const response = await this.page.request.post(`${API_BASE_URL}/auth/officers`, {
      data: { email: emailOrUsername, password },
    });
    
    if (response.ok()) {
      let token = await response.text();
      // Remove surrounding quotes if present
      token = token.replace(/^"|"$/g, '');
      return token;
    }
    throw new Error(`Officer login failed: ${response.status()}`);
  }

  /**
   * Login via the UI (fills the login form)
   */
  async loginViaUI(page: Page, username: string, password: string) {
    await page.goto('/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/\/(map|dashboard)/);
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.evaluate(() => {
      localStorage.removeItem('userToken');
      localStorage.removeItem('officerToken');
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return !!(localStorage.getItem('userToken') || localStorage.getItem('officerToken'));
    });
  }
}
