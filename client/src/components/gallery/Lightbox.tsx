import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Download, 
  Share2,
  Check,
  Send
} from 'lucide-react';
import { Photo } from '@/types/gallery';
import { useGallery } from '@/contexts/GalleryContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface LightboxProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
}

export function Lightbox({ photo, photos, onClose, onNavigate }: LightboxProps) {
  const { 
    likedPhotos, 
    selectedPhotos, 
    toggleLike, 
    toggleSelect, 
    getPhotoComments, 
    addComment,
    isSubmitted,
    user 
  } = useGallery();
  
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const isLiked = likedPhotos.has(photo.id);
  const isSelected = selectedPhotos.has(photo.id);
  const comments = getPhotoComments(photo.id);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsLoading(true);
      onNavigate(photos[currentIndex - 1]);
    }
  }, [currentIndex, photos, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setIsLoading(true);
      onNavigate(photos[currentIndex + 1]);
    }
  }, [currentIndex, photos, onNavigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        handlePrev();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case 'Escape':
        onClose();
        break;
      case 'l':
        toggleLike(photo.id);
        break;
      case 'c':
        setShowComments(prev => !prev);
        break;
      case 'd':
        window.open(photo.src, '_blank');
        break;
    }
  }, [handlePrev, handleNext, onClose, photo.id, toggleLike, photo.src]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleLike = () => {
    toggleLike(photo.id);
  };

  const handleSelect = () => {
    if (isSubmitted) {
      toast({
        title: "Selection Locked",
        description: "Your selection has been submitted.",
      });
      return;
    }
    if (!isSelected && user && selectedPhotos.size >= user.selectionLimit) {
      toast({
        title: "Selection Limit Reached",
        description: `Maximum ${user.selectionLimit} photos allowed.`,
        variant: "destructive",
      });
      return;
    }
    toggleSelect(photo.id);
  };

  const handleDownload = () => {
    toast({
      title: "Downloading",
      description: `${photo.name} (watermarked)`,
    });
    window.open(photo.src, '_blank');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Photo link copied to clipboard.",
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment(photo.id, newComment);
      setNewComment('');
      toast({
        title: "Comment Added",
        description: "Your comment has been saved.",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="lightbox-overlay flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <p className="font-medium text-sm">{photo.name}</p>
            <p className="text-xs text-muted-foreground">{currentIndex + 1} / {photos.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleLike}
            className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={() => setShowComments(prev => !prev)}
            className={`p-2 rounded-full transition-colors ${showComments ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button onClick={handleDownload} className="p-2 hover:bg-muted rounded-full transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={handleShare} className="p-2 hover:bg-muted rounded-full transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSelect}
            className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Image */}
        <div className={`flex-1 flex items-center justify-center p-4 ${showComments ? 'md:mr-80' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.img
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: isLoading ? 0.5 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={photo.src}
              alt={photo.name}
              className="lightbox-image rounded-lg"
              onLoad={() => setIsLoading(false)}
              draggable={false}
            />
          </AnimatePresence>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-card/80 backdrop-blur-sm rounded-full shadow-medium hover:bg-card transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-card/80 backdrop-blur-sm rounded-full shadow-medium hover:bg-card transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Comments Panel */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              className="absolute md:relative right-0 top-0 bottom-0 w-80 bg-card border-l border-border flex flex-col"
            >
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-medium">Comments</h3>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-elegant">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden md:flex items-center justify-center gap-6 py-2 bg-card/90 backdrop-blur-sm text-xs text-muted-foreground">
        <span>← → Navigate</span>
        <span>L Like</span>
        <span>C Comments</span>
        <span>D Download</span>
        <span>Esc Close</span>
      </div>
    </motion.div>
  );
}
