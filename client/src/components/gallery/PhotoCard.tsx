import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Download, Check } from 'lucide-react';
import { Photo } from '@/types/gallery';
import { useGallery } from '@/contexts/GalleryContext';
import { toast } from '@/hooks/use-toast';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
  index: number;
}

export function PhotoCard({ photo, onClick, index }: PhotoCardProps) {
  const { likedPhotos, selectedPhotos, toggleLike, toggleSelect, getPhotoComments, isSubmitted, user } = useGallery();
  const [isLoaded, setIsLoaded] = useState(false);
  
  const isLiked = likedPhotos.has(photo.id);
  const isSelected = selectedPhotos.has(photo.id);
  const comments = getPhotoComments(photo.id);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(photo.id);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitted) {
      toast({
        title: "Selection Locked",
        description: "Your selection has been submitted and cannot be modified.",
      });
      return;
    }
    if (!isSelected && user && selectedPhotos.size >= user.selectionLimit) {
      toast({
        title: "Selection Limit Reached",
        description: `You can only select ${user.selectionLimit} photos.`,
        variant: "destructive",
      });
      return;
    }
    toggleSelect(photo.id);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Downloading",
      description: `Downloading ${photo.name} (watermarked)...`,
    });
    // In production, trigger actual download
    window.open(photo.src, '_blank');
  };

  const aspectRatio = photo.height / photo.width;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="group relative mb-3 cursor-pointer"
      onClick={onClick}
    >
      {/* Image Container */}
      <div 
        className="relative overflow-hidden rounded-lg bg-muted"
        style={{ paddingBottom: `${aspectRatio * 100}%` }}
      >
        {/* Skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 skeleton-shimmer animate-shimmer" />
        )}
        
        {/* Image */}
        <img
          src={photo.thumbnail}
          alt={photo.name}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-[1.02]`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />

        {/* Selection Indicator */}
        {isSelected && (
          <div className="selection-badge animate-scale-in">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action Buttons */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`action-icon ${isLiked ? 'action-icon-active' : ''}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Comments */}
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="action-icon relative"
            >
              <MessageCircle className="w-4 h-4" />
              {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                  {comments.length}
                </span>
              )}
            </button>

            {/* Download */}
            <button onClick={handleDownload} className="action-icon">
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Select */}
          <button
            onClick={handleSelect}
            className={`action-icon ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Size Badge */}
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-foreground/70 text-primary-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.size}
        </div>
      </div>

      {/* Mobile Actions - Always Visible */}
      <div className="md:hidden flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3">
          <button onClick={handleLike} className="flex items-center gap-1 text-sm">
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            {comments.length > 0 && <span>{comments.length}</span>}
          </button>
          <button onClick={handleDownload} className="text-muted-foreground">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={handleSelect}
          className={`p-1.5 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
