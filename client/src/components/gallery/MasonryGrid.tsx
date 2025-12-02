import React from 'react';
import Masonry from 'react-masonry-css';
import { Photo, Folder } from '@/types/gallery';
import { PhotoCard } from './PhotoCard';
import { FolderCard } from './FolderCard';
import { useGallery } from '@/contexts/GalleryContext';

interface MasonryGridProps {
  photos: Photo[];
  folders: Folder[];
  onPhotoClick: (photo: Photo) => void;
  onFolderClick: (folder: Folder) => void;
}

export function MasonryGrid({ photos, folders, onPhotoClick, onFolderClick }: MasonryGridProps) {
  const { gridColumns } = useGallery();

  // Generate responsive breakpoints based on gridColumns
  const breakpointColumnsObj = {
    default: gridColumns,
    1536: Math.min(gridColumns, 7),
    1280: Math.min(gridColumns, 6),
    1024: Math.min(gridColumns, 5),
    768: Math.min(gridColumns, 4),
    640: Math.min(gridColumns, 3),
    480: Math.min(gridColumns, 2),
  };

  const hasContent = folders.length > 0 || photos.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-lg">No photos found</p>
        <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Folders */}
      {folders.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-medium mb-4 px-1">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {folders.map((folder, index) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={() => onFolderClick(folder)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h2 className="font-display text-xl font-medium mb-4 px-1">Photos</h2>
          )}
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                index={index}
              />
            ))}
          </Masonry>
        </div>
      )}
    </div>
  );
}
