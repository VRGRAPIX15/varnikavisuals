import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header1Branding } from '@/components/gallery/Header1Branding';
import { Header2Actions } from '@/components/gallery/Header2Actions';
import { Header3Sort } from '@/components/gallery/Header3Sort';
import { MasonryGrid } from '@/components/gallery/MasonryGrid';
import { Lightbox } from '@/components/gallery/Lightbox';
import { BottomSheet } from '@/components/gallery/BottomSheet';
import { OnboardingTutorial } from '@/components/gallery/OnboardingTutorial';
import { Footer } from '@/components/gallery/Footer';
import { useGallery } from '@/contexts/GalleryContext';
import { useAuth } from '@/contexts/AuthContext';
import { Photo, Folder } from '@/types/gallery';

export default function Gallery() {
  const { user } = useAuth();
  const { 
    folders, 
    filteredPhotos, 
    currentFolder, 
    setCurrentFolder,
    currentFolderPhotos,
    currentFolderSubfolders 
  } = useGallery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [bottomSheet, setBottomSheet] = useState<{ type: 'liked' | 'comments' | 'selected'; isOpen: boolean }>({
    type: 'liked',
    isOpen: false
  });
  const [showOnboarding, setShowOnboarding] = useState(user?.isFirstLogin ?? false);

  // Get display photos based on current folder
  const displayPhotos = useMemo(() => {
    const photos = currentFolder ? currentFolderPhotos : [];
    if (!searchQuery) return photos;
    return photos.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentFolder, currentFolderPhotos, searchQuery]);

  // Get display folders
  const displayFolders = useMemo(() => {
    if (currentFolder) {
      return currentFolderSubfolders;
    }
    return folders.filter(f => f.parentId === null);
  }, [currentFolder, folders, currentFolderSubfolders]);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolder(folder.id);
  };

  const handleLightboxNavigate = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const openBottomSheet = (type: 'liked' | 'comments' | 'selected') => {
    setBottomSheet({ type, isOpen: true });
  };

  const handleBottomSheetPhotoClick = (photoId: string) => {
    const photo = filteredPhotos.find(p => p.id === photoId);
    if (photo) {
      setBottomSheet(prev => ({ ...prev, isOpen: false }));
      setSelectedPhoto(photo);
    }
  };

  // Get all photos for lightbox navigation
  const allPhotosForLightbox = currentFolder ? currentFolderPhotos : filteredPhotos;

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding Tutorial */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* Headers */}
      <Header1Branding />
      <Header2Actions
        onShowLiked={() => openBottomSheet('liked')}
        onShowComments={() => openBottomSheet('comments')}
        onShowSelected={() => openBottomSheet('selected')}
      />
      <Header3Sort
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <MasonryGrid
          photos={displayPhotos}
          folders={displayFolders}
          onPhotoClick={handlePhotoClick}
          onFolderClick={handleFolderClick}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <Lightbox
            photo={selectedPhoto}
            photos={allPhotosForLightbox}
            onClose={() => setSelectedPhoto(null)}
            onNavigate={handleLightboxNavigate}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheets */}
      <BottomSheet
        type={bottomSheet.type}
        isOpen={bottomSheet.isOpen}
        onClose={() => setBottomSheet(prev => ({ ...prev, isOpen: false }))}
        onPhotoClick={handleBottomSheetPhotoClick}
      />
    </div>
  );
}
