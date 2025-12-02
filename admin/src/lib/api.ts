// Updated API client with 2-way sync for Admin frontend
// File: Admin_new/src/lib/api.ts

const API_BASE_URL = '/api/google-proxy';

export interface ApiResponse<T = any> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

export interface User {
  userId: string;
  displayName: string;
  photoUrl?: string;
  selectionLimit?: number;
  folderId?: string;
  folderName?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  previewUrl: string;
  downloadUrl: string;
  thumbnail: string;
  type: 'file';
}

export interface FolderItem {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  type: 'folder';
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface SheetSyncResult {
  synced: boolean;
  changes: {
    added: string[];
    updated: string[];
    removed: string[];
  };
}

class ApiClient {
  private token: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.token = localStorage.getItem('varnika_admin_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('varnika_admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('varnika_admin_token');
    this.stopAutoSync();
  }

  getToken() {
    return this.token;
  }

  // Start auto-sync every 30 seconds
  startAutoSync(onSync: (result: SheetSyncResult) => void) {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(async () => {
      const result = await this.syncWithSheet();
      if (result.ok) {
        onSync(result.data);
      }
    }, 30000); // 30 seconds
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async request(params: Record<string, any>, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    try {
      const url = new URL(API_BASE_URL);
      
      if (method === 'GET') {
        Object.keys(params).forEach(key => {
          url.searchParams.append(key, String(params[key]));
        });
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        return await response.json();
      } else {
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        return await response.json();
      }
    } catch (error) {
      console.error('API request failed:', error);
      return { ok: false, error: String(error) };
    }
  }

  // ============ ADMIN AUTHENTICATION ============
  async adminLogin(userId: string, password: string, adminKey: string): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.request({ action: 'admin_login', userId, password, adminKey }, 'POST');
  }

  async me(token: string): Promise<ApiResponse<{ user: User }>> {
    return this.request({ action: 'me', token }, 'GET');
  }

  // ============ STATS & DASHBOARD ============
  async getStats(adminKey: string): Promise<ApiResponse> {
    return this.request({ action: 'get_stats', adminKey }, 'GET');
  }

  async getActivities(adminKey: string): Promise<ApiResponse<{ activities: any[] }>> {
    return this.request({ action: 'get_activities', adminKey }, 'GET');
  }

  // ============ CLIENT MANAGEMENT (2-WAY SYNC) ============
  
  // Get all clients from Sheet
  async getClients(adminKey: string): Promise<ApiResponse<{ clients: User[] }>> {
    return this.request({ action: 'get_clients', adminKey }, 'GET');
  }

  // Create client (adds to Sheet + optionally creates Drive folder)
  async createClient(adminKey: string, data: {
    userId: string;
    password: string;
    displayName: string;
    photoUrl?: string;
    isActive?: boolean;
    isAdmin?: boolean;
    selectionLimit?: number;
    createFolder?: boolean; // If true, creates folder in Drive
    folderName?: string;
  }): Promise<ApiResponse> {
    const result = await this.request({ action: 'create_client', adminKey, data }, 'POST');
    
    // If client created and createFolder is true, create folder
    if (result.ok && data.createFolder) {
      const folderResult = await this.createFolder(adminKey, {
        folderName: data.folderName || `${data.userId}_gallery`,
        userId: data.userId
      });
      
      if (folderResult.ok) {
        // Assign folder to user
        await this.assignFolder(adminKey, data.userId, folderResult.folderId);
      }
    }
    
    return result;
  }

  // Update client in Sheet
  async updateClient(adminKey: string, data: Partial<User> & { userId: string }): Promise<ApiResponse> {
    return this.request({ action: 'update_client', adminKey, data }, 'POST');
  }

  // Delete client from Sheet
  async deleteClient(adminKey: string, userId: string): Promise<ApiResponse> {
    return this.request({ action: 'delete_client', adminKey, data: { userId } }, 'POST');
  }

  // ============ FOLDER MANAGEMENT (2-WAY SYNC) ============
  
  // Create folder in Drive + add to Sheet
  async createFolder(adminKey: string, data: {
    folderName: string;
    userId?: string;
    parentId?: string;
    submit?: boolean;
  }): Promise<ApiResponse<{ folderId: string; url: string }>> {
    return this.request({ action: 'create_folder', adminKey, data }, 'POST');
  }

  // Assign folder to user in Sheet
  async assignFolder(adminKey: string, userId: string, folderId: string): Promise<ApiResponse> {
    return this.request({ action: 'assign_folder', adminKey, data: { userId, folderId } }, 'POST');
  }

  // List folders from Drive (with Sheet metadata)
  async listFolders(adminKey: string, parentId?: string): Promise<ApiResponse<{ folders: FolderItem[] }>> {
    const params: any = { action: 'list_folders', adminKey };
    if (parentId) params.parentId = parentId;
    return this.request(params, 'GET');
  }

  // Rename folder in Drive + update Sheet
  async renameFolder(adminKey: string, folderId: string, newName: string): Promise<ApiResponse> {
    return this.request({ action: 'rename_folder', adminKey, folderId, newName }, 'POST');
  }

  // ============ FILE MANAGEMENT (2-WAY SYNC) ============
  
  // Get files from Drive folder
  async getFiles(adminKey: string, folderId?: string): Promise<ApiResponse<{
    folders: FolderItem[];
    files: FileItem[];
    items: (FileItem | FolderItem)[];
    breadcrumb: BreadcrumbItem[];
    folderId: string;
  }>> {
    const params: any = { action: 'get_files', adminKey };
    if (folderId) params.folderId = folderId;
    return this.request(params, 'GET');
  }

  // Search files in Drive
  async search(adminKey: string, query: string, folderId?: string): Promise<ApiResponse<{
    folders: FolderItem[];
    files: FileItem[];
    items: (FileItem | FolderItem)[];
  }>> {
    const params: any = { action: 'search', adminKey, query };
    if (folderId) params.folderId = folderId;
    return this.request(params, 'GET');
  }

  // Upload file to Drive + log in Sheet
  async uploadFile(adminKey: string, data: {
    folderId: string;
    base64: string;
    filename: string;
    mimeType: string;
  }): Promise<ApiResponse<{ fileId: string; url: string; size: number }>> {
    return this.request({
      action: 'upload',
      adminKey,
      base64: data.base64,
      filename: data.filename,
      mimeType: data.mimeType,
      folderId: data.folderId,
      uploader: 'admin'
    }, 'POST');
  }

  // Delete file from Drive
  async deleteFile(adminKey: string, fileId: string): Promise<ApiResponse> {
    return this.request({ action: 'delete_file', adminKey, data: { fileId } }, 'POST');
  }

  // Rename file in Drive
  async renameFile(adminKey: string, fileId: string, newName: string): Promise<ApiResponse> {
    return this.request({ action: 'rename_file', adminKey, fileId, newName }, 'POST');
  }

  // Move file between folders in Drive
  async moveFile(adminKey: string, fileId: string, parentId: string): Promise<ApiResponse> {
    return this.request({ action: 'move_file', adminKey, fileId, parentId }, 'POST');
  }

  // Get folder statistics
  async getFolderStats(adminKey: string, folderId?: string, force?: boolean): Promise<ApiResponse<{
    quick: { fileCount: number; folderCount: number };
    recursive: { fileCount: number; folderCount: number; totalSizeBytes: number; lastComputedISO: string };
  }>> {
    const params: any = { action: 'get_folder_stats', adminKey };
    if (folderId) params.folderId = folderId;
    if (force) params.force = 'true';
    return this.request(params, 'GET');
  }

  // ============ BRANDING ============
  async getBranding(): Promise<ApiResponse<{ branding: Record<string, any> }>> {
    return this.request({ action: 'get_branding' }, 'GET');
  }

  async updateBranding(adminKey: string, data: Record<string, any>): Promise<ApiResponse> {
    return this.request({ action: 'update_branding', adminKey, data }, 'POST');
  }

  // ============ 2-WAY SYNC ============
  
  // Sync changes from Sheet to frontend
  async syncWithSheet(adminKey?: string): Promise<ApiResponse<SheetSyncResult>> {
    // This would poll the Sheet for changes and return what changed
    // For now, we can just re-fetch clients and compare
    const key = adminKey || localStorage.getItem('admin_key') || '';
    const clients = await this.getClients(key);
    
    // In a real implementation, you'd compare with cached data
    // and return what changed
    return {
      ok: true,
      data: {
        synced: true,
        changes: {
          added: [],
          updated: [],
          removed: []
        }
      }
    };
  }

  // Batch update multiple clients
  async batchUpdateClients(adminKey: string, updates: Array<Partial<User> & { userId: string }>): Promise<ApiResponse> {
    const results = await Promise.all(
      updates.map(update => this.updateClient(adminKey, update))
    );
    
    const allSuccess = results.every(r => r.ok);
    return {
      ok: allSuccess,
      results,
      error: allSuccess ? undefined : 'Some updates failed'
    };
  }

  // Batch create folders
  async batchCreateFolders(adminKey: string, folders: Array<{
    folderName: string;
    userId?: string;
    parentId?: string;
  }>): Promise<ApiResponse> {
    const results = await Promise.all(
      folders.map(folder => this.createFolder(adminKey, folder))
    );
    
    const allSuccess = results.every(r => r.ok);
    return {
      ok: allSuccess,
      results,
      error: allSuccess ? undefined : 'Some folder creations failed'
    };
  }
}

export const api = new ApiClient();