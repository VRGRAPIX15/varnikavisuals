import { api } from './api';

export const ADMIN_KEY = 'ADMIN@1234';

export interface AuthUser {
  userId: string;
  displayName: string;
  photoUrl?: string;
  isAdmin?: boolean;
}

export const authService = {
  async adminLogin(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    const result = await api.adminLogin(userId, password, ADMIN_KEY);
    
    if (result.ok && result.token) {
      api.setToken(result.token);
      localStorage.setItem('varnika_user', JSON.stringify(result.user));
      localStorage.setItem('varnika_is_admin', 'true');
      return { success: true };
    }
    
    return { success: false, error: result.error || 'Login failed' };
  },

  logout() {
    api.clearToken();
    localStorage.removeItem('varnika_user');
    localStorage.removeItem('varnika_is_admin');
  },

  isAuthenticated(): boolean {
    return !!api.getToken();
  },

  isAdmin(): boolean {
    return localStorage.getItem('varnika_is_admin') === 'true';
  },

  getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem('varnika_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
};
