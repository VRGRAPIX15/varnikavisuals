// Client-side API integration with real Google Apps Script backend
// File: Client_new/src/lib/api.ts

const API_BASE_URL = '/api/google-proxy';

export interface ApiResponse<T = any> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

export interface Photo {
  id: string;
  name: string;
  src: string;
  thumbnail: string;
  width: number;
  height: number;
  size: string;
  date: string;
  folderId: string;
  mimeType?: string;
  sizeBytes?: number;
  previewUrl?: string;
  downloadUrl?: string;
  likedByMe?: boolean;
  likeCount?: number;
  commentCount?: number;
  preset?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  coverImage?: string;
  photoCount?: number;
  type?: 'folder';
}

export interface Comment {
  id?: string;
  photoId?: string;
  userId: string;
  userName: string;
  text: string;
  createdAt?: string;
  timestamp?: string;
}

export interface User {
  userId: string;
  displayName: string;
  photoUrl?: string;
  selectionLimit: number;
  folderId: string;
  folderName: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

class ClientApi {
  private token: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.token = localStorage.getItem('varnika_client_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('varnika_client_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('varnika_client_token');
    this.stopAutoSync();
  }

  getToken() {
    return this.token;
  }

  // Start auto-sync every 30 seconds
  startAutoSync(onSync: (data: any) => void) {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(async () => {
      if (!this.token) return;
      const result = await this.listFolder();
      if (result.ok) {
        onSync(result);
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

  // ============ AUTHENTICATION ============
  
  async login(userId: string, password: string): Promise<ApiResponse<{
    token: string;
    user: User;
    expiresAt: string;
  }>> {
    return this.request({ action: 'login', userId, password }, 'GET');
  }

  async logout(): Promise<ApiResponse> {
    const result = await this.request({ action: 'logout', token: this.token }, 'POST');
    this.clearToken();
    return result;
  }

  async me(): Promise<ApiResponse<{ user: User }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    return this.request({ action: 'me', token: this.token }, 'GET');
  }

  // ============ FOLDER & FILE LISTING ============
  
  async listFolder(folderId?: string): Promise<ApiResponse<{
    folderId: string;
    breadcrumb: BreadcrumbItem[];
    folders: Folder[];
    items: Photo[];
    counts: { totalLikes: number; totalComments: number };
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    const params: any = { action: 'list', token: this.token };
    if (folderId) params.folderId = folderId;
    
    const result = await this.request(params, 'GET');
    
    // Transform API response to match Photo interface
    if (result.ok && result.items) {
      result.items = result.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        src: item.previewUrl || item.thumbnail,
        thumbnail: item.thumbnail,
        width: 1200,
        height: 1600,
        size: item.sizeBytes ? this.formatBytes(item.sizeBytes) : '0 MB',
        date: item.createdAt || new Date().toISOString(),
        folderId: folderId || result.folderId,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        previewUrl: item.previewUrl,
        downloadUrl: item.downloadUrl,
        likedByMe: item.likedByMe,
        likeCount: item.likeCount || 0,
        commentCount: item.commentCount || 0,
        preset: item.preset || ''
      }));
    }
    
    return result;
  }

  async listFolders(parentId?: string): Promise<ApiResponse<{
    parentId: string;
    folders: Folder[];
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    const params: any = { action: 'list_folders', token: this.token };
    if (parentId) params.parentId = parentId;
    
    return this.request(params, 'GET');
  }

  // ============ INTERACTIONS ============
  
  async toggleLike(folderId: string, fileId: string, liked: boolean): Promise<ApiResponse> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'like',
      token: this.token,
      folderId,
      fileId,
      liked: String(liked)
    }, 'POST');
  }

  async addComment(folderId: string, fileId: string, text: string): Promise<ApiResponse> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'comment',
      token: this.token,
      folderId,
      fileId,
      text
    }, 'POST');
  }

  async readComments(folderId: string, fileId: string): Promise<ApiResponse<{
    comments: Comment[];
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    const result = await this.request({
      action: 'read_comments',
      token: this.token,
      folderId,
      fileId
    }, 'GET');
    
    // Transform timestamp to createdAt for consistency
    if (result.ok && result.comments) {
      result.comments = result.comments.map((c: any) => ({
        ...c,
        createdAt: c.timestamp || c.createdAt
      }));
    }
    
    return result;
  }

  async setPreset(folderId: string, fileId: string, preset: string): Promise<ApiResponse> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'setpreset',
      token: this.token,
      folderId,
      fileId,
      preset
    }, 'POST');
  }

  // ============ SELECTION & SUBMISSION ============
  
  async submitSelection(folderId: string, fileIds: string[]): Promise<ApiResponse<{
    batchId: string;
    count: number;
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'submitselected',
      token: this.token,
      folderId,
      fileIds: fileIds.join(','),
      submit: 'true'
    }, 'POST');
  }

  async getCounts(folderId: string): Promise<ApiResponse<{
    counts: { totalLikes: number; totalComments: number };
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'counts',
      token: this.token,
      folderId
    }, 'GET');
  }

  // ============ BRANDING ============
  
  async getBranding(): Promise<ApiResponse<{
    branding: Record<string, any>;
  }>> {
    return this.request({ action: 'get_branding' }, 'GET');
  }

  // ============ HELPER FUNCTIONS ============
  
  private formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  // ============ STATE PERSISTENCE ============
  
  async readState(folderId: string, fileName: string = 'gallery_state.json'): Promise<ApiResponse<{
    exists: boolean;
    data: any;
  }>> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'readjsonfile',
      token: this.token,
      folderId,
      fileName
    }, 'POST');
  }

  async writeState(folderId: string, data: any, fileName: string = 'gallery_state.json'): Promise<ApiResponse> {
    if (!this.token) return { ok: false, error: 'Not authenticated' };
    
    return this.request({
      action: 'writejsonfile',
      token: this.token,
      folderId,
      fileName,
      data
    }, 'POST');
  }
}

export const clientApi = new ClientApi();