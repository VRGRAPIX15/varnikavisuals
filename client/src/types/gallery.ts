export interface User {
  id: string;
  username: string;
  name: string;
  selectionLimit: number;
  isFirstLogin: boolean;
}

export interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  name: string;
  width: number;
  height: number;
  size: string;
  date: string;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  coverImage: string;
  photoCount: number;
}

export interface Comment {
  id: string;
  photoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface GalleryState {
  user: User | null;
  photos: Photo[];
  folders: Folder[];
  likedPhotos: Set<string>;
  selectedPhotos: Set<string>;
  comments: Map<string, Comment[]>;
  currentFolder: string | null;
  gridColumns: number;
  sortBy: 'date-newest' | 'date-oldest' | 'name-asc' | 'name-desc' | 'size';
  theme: 'light' | 'dark' | 'system';
  isSubmitted: boolean;
}

export interface Breadcrumb {
  id: string;
  name: string;
  path: string;
}
