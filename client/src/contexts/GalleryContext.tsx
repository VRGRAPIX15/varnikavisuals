// Updated GalleryContext with real backend integration
// File: Client_new/src/contexts/GalleryContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Photo, Folder, Comment, clientApi } from '@/lib/api';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

export interface GalleryState {
  user: any;
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

interface GalleryContextType extends GalleryState {
  loading: boolean;
  toggleLike: (photoId: string) => Promise<void>;
  toggleSelect: (photoId: string) => void;
  addComment: (photoId: string, text: string) => Promise<void>;
  deleteComment: (photoId: string, commentId: string) => void;
  setCurrentFolder: (folderId: string | null) => Promise<void>;
  setGridColumns: (columns: number) => void;
  setSortBy: (sort: GalleryState['sortBy']) => void;
  setTheme: (theme: GalleryState['theme']) => void;
  submitSelection: () => Promise<void>;
  selectAll: () => void;
  deselectAll: () => void;
  getPhotoComments: (photoId: string) => Promise<Comment[]>;
  getBreadcrumbs: () => { id: string; name: string }[];
  filteredPhotos: Photo[];
  currentFolderPhotos: Photo[];
  currentFolderSubfolders: Folder[];
  refreshGallery: () => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [currentFolder, setCurrentFolderState] = useState<string | null>(null);
  const [gridColumns, setGridColumnsState] = useState(4);
  const [sortBy, setSortByState] = useState<GalleryState['sortBy']>('date-newest');
  const [theme, setThemeState] = useState<GalleryState['theme']>('system');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);

  // Load initial gallery data
  useEffect(() => {
    if (user) {
      loadGallery();
      
      // Load saved preferences
      const savedGrid = localStorage.getItem('gallery_grid');
      const savedTheme = localStorage.getItem('gallery_theme');
      const savedSubmitted = localStorage.getItem('gallery_submitted');
      
      if (savedGrid) setGridColumnsState(parseInt(savedGrid));
      if (savedTheme) setThemeState(savedTheme as GalleryState['theme']);
      if (savedSubmitted) setIsSubmitted(savedSubmitted === 'true');
      
      // Start auto-refresh
      clientApi.startAutoSync((data) => {
        if (data.ok) {
          updateGalleryFromSync(data);
        }
      });
    }
    
    return () => {
      clientApi.stopAutoSync();
    };
  }, [user]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const loadGallery = async (folderId?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await clientApi.listFolder(folderId || currentFolder || user.folderId);
      
      if (res.ok) {
        setPhotos(res.items || []);
        setFolders(res.folders || []);
        setBreadcrumb(res.breadcrumb || []);
        
        // Update liked photos from server
        const likedSet = new Set<string>();
        res.items?.forEach((item: Photo) => {
          if (item.likedByMe) {
            likedSet.add(item.id);
          }
        });
        setLikedPhotos(likedSet);
      } else {
        toast({
          title: "Failed to load gallery",
          description: res.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load gallery:', error);
      toast({
        title: "Error",
        description: "Failed to load gallery",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGalleryFromSync = (data: any) => {
    // Update photos from background sync
    if (data.items) {
      setPhotos(data.items);
    }
    if (data.folders) {
      setFolders(data.folders);
    }
  };

  const refreshGallery = async () => {
    await loadGallery(currentFolder || undefined);
  };

  const toggleLike = useCallback(async (photoId: string) => {
    if (!user || !currentFolder) return;
    
    const isLiked = likedPhotos.has(photoId);
    const newLiked = !isLiked;
    
    // Optimistic update
    setLikedPhotos(prev => {
      const newSet = new Set(prev);
      if (newLiked) {
        newSet.add(photoId);
      } else {
        newSet.delete(photoId);
      }
      return newSet;
    });
    
    // Update photo's like count
    setPhotos(prev => prev.map(p => 
      p.id === photoId 
        ? { ...p, likedByMe: newLiked, likeCount: (p.likeCount || 0) + (newLiked ? 1 : -1) }
        : p
    ));
    
    try {
      const res = await clientApi.toggleLike(currentFolder || user.folderId, photoId, newLiked);
      
      if (!res.ok) {
        // Revert on failure
        setLikedPhotos(prev => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.add(photoId);
          } else {
            newSet.delete(photoId);
          }
          return newSet;
        });
        
        toast({
          title: "Failed to update like",
          description: res.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [user, currentFolder, likedPhotos]);

  const toggleSelect = useCallback((photoId: string) => {
    if (isSubmitted || !user) return;
    
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        if (newSet.size >= user.selectionLimit) {
          toast({
            title: "Selection Limit Reached",
            description: `You can only select up to ${user.selectionLimit} photos`,
            variant: "destructive",
          });
          return prev;
        }
        newSet.add(photoId);
      }
      localStorage.setItem('gallery_selected', JSON.stringify([...newSet]));
      return newSet;
    });
  }, [user, isSubmitted]);

  const addComment = useCallback(async (photoId: string, text: string) => {
    if (!user || !text.trim() || !currentFolder) return;
    
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      photoId,
      userId: user.userId,
      userName: user.displayName || user.userId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update
    setComments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(photoId) || [];
      newMap.set(photoId, [...existing, tempComment]);
      return newMap;
    });
    
    // Update comment count
    setPhotos(prev => prev.map(p =>
      p.id === photoId
        ? { ...p, commentCount: (p.commentCount || 0) + 1 }
        : p
    ));
    
    try {
      const res = await clientApi.addComment(currentFolder || user.folderId, photoId, text);
      
      if (res.ok) {
        // Refresh comments from server
        await getPhotoComments(photoId);
      } else {
        // Revert on failure
        setComments(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(photoId) || [];
          newMap.set(photoId, existing.filter(c => c.id !== tempComment.id));
          return newMap;
        });
        
        toast({
          title: "Failed to add comment",
          description: res.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [user, currentFolder]);

  const getPhotoComments = useCallback(async (photoId: string): Promise<Comment[]> => {
    if (!user || !currentFolder) return [];
    
    try {
      const res = await clientApi.readComments(currentFolder || user.folderId, photoId);
      
      if (res.ok && res.comments) {
        setComments(prev => {
          const newMap = new Map(prev);
          newMap.set(photoId, res.comments);
          return newMap;
        });
        return res.comments;
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
    
    return [];
  }, [user, currentFolder]);

  const deleteComment = useCallback((photoId: string, commentId: string) => {
    setComments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(photoId) || [];
      newMap.set(photoId, existing.filter(c => c.id !== commentId));
      return newMap;
    });
  }, []);

  const setCurrentFolder = useCallback(async (folderId: string | null) => {
    setCurrentFolderState(folderId);
    await loadGallery(folderId || undefined);
  }, []);

  const setGridColumns = useCallback((columns: number) => {
    setGridColumnsState(columns);
    localStorage.setItem('gallery_grid', columns.toString());
  }, []);

  const setSortBy = useCallback((sort: GalleryState['sortBy']) => {
    setSortByState(sort);
  }, []);

  const setTheme = useCallback((newTheme: GalleryState['theme']) => {
    setThemeState(newTheme);
    localStorage.setItem('gallery_theme', newTheme);
  }, []);

  const submitSelection = useCallback(async () => {
    if (selectedPhotos.size === 0 || !user || !currentFolder) return;
    
    try {
      const res = await clientApi.submitSelection(
        currentFolder || user.folderId,
        Array.from(selectedPhotos)
      );
      
      if (res.ok) {
        setIsSubmitted(true);
        localStorage.setItem('gallery_submitted', 'true');
        
        toast({
          title: "Selection Submitted!",
          description: `${selectedPhotos.size} photos submitted successfully`,
        });
      } else {
        toast({
          title: "Submission Failed",
          description: res.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to submit selection:', error);
      toast({
        title: "Error",
        description: "Failed to submit selection",
        variant: "destructive",
      });
    }
  }, [selectedPhotos, user, currentFolder]);

  const selectAll = useCallback(() => {
    if (isSubmitted || !user) return;
    
    const currentPhotos = currentFolder 
      ? photos.filter(p => p.folderId === currentFolder)
      : photos;
    
    const newSelected = new Set(selectedPhotos);
    let added = 0;
    
    for (const photo of currentPhotos) {
      if (newSelected.size >= user.selectionLimit) break;
      if (!newSelected.has(photo.id)) {
        newSelected.add(photo.id);
        added++;
      }
    }
    
    setSelectedPhotos(newSelected);
    localStorage.setItem('gallery_selected', JSON.stringify([...newSelected]));
    
    if (added > 0) {
      toast({
        title: "Photos Selected",
        description: `Added ${added} photos to selection`,
      });
    }
  }, [currentFolder, photos, selectedPhotos, user, isSubmitted]);

  const deselectAll = useCallback(() => {
    if (isSubmitted) return;
    setSelectedPhotos(new Set());
    localStorage.setItem('gallery_selected', JSON.stringify([]));
    
    toast({
      title: "Selection Cleared",
      description: "All selections have been removed",
    });
  }, [isSubmitted]);

  const getBreadcrumbs = useCallback(() => {
    return breadcrumb;
  }, [breadcrumb]);

  // Sort and filter photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos];
    
    switch (sortBy) {
      case 'date-newest':
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'date-oldest':
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'size':
        result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
        break;
    }
    
    return result;
  }, [photos, sortBy]);

  const currentFolderPhotos = useMemo(() => {
    if (!currentFolder) return photos;
    return filteredPhotos.filter(p => p.folderId === currentFolder);
  }, [filteredPhotos, currentFolder, photos]);

  const currentFolderSubfolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolder);
  }, [folders, currentFolder]);

  return (
    <GalleryContext.Provider
      value={{
        user,
        photos,
        folders,
        likedPhotos,
        selectedPhotos,
        comments,
        currentFolder,
        gridColumns,
        sortBy,
        theme,
        isSubmitted,
        loading,
        toggleLike,
        toggleSelect,
        addComment,
        deleteComment,
        setCurrentFolder,
        setGridColumns,
        setSortBy,
        setTheme,
        submitSelection,
        selectAll,
        deselectAll,
        getPhotoComments,
        getBreadcrumbs,
        filteredPhotos,
        currentFolderPhotos,
        currentFolderSubfolders,
        refreshGallery,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
}