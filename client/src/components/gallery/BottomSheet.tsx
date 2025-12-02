import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, CheckSquare, Trash2, Download } from 'lucide-react';
import { useGallery } from '@/contexts/GalleryContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

type SheetType = 'liked' | 'comments' | 'selected';

interface BottomSheetProps {
  type: SheetType;
  isOpen: boolean;
  onClose: () => void;
  onPhotoClick: (photoId: string) => void;
}

export function BottomSheet({ type, isOpen, onClose, onPhotoClick }: BottomSheetProps) {
  const { 
    photos, 
    likedPhotos, 
    selectedPhotos, 
    comments, 
    toggleLike, 
    toggleSelect,
    submitSelection,
    isSubmitted
  } = useGallery();

  const getTitle = () => {
    switch (type) {
      case 'liked': return 'Liked Photos';
      case 'comments': return 'My Comments';
      case 'selected': return 'Selected Photos';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'liked': return <Heart className="w-5 h-5" />;
      case 'comments': return <MessageCircle className="w-5 h-5" />;
      case 'selected': return <CheckSquare className="w-5 h-5" />;
    }
  };

  const likedPhotosList = photos.filter(p => likedPhotos.has(p.id));
  const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id));
  
  const allComments = React.useMemo(() => {
    const result: { photoId: string; photoName: string; comment: any }[] = [];
    comments.forEach((commentList, photoId) => {
      const photo = photos.find(p => p.id === photoId);
      commentList.forEach(comment => {
        result.push({
          photoId,
          photoName: photo?.name || 'Unknown',
          comment
        });
      });
    });
    return result.sort((a, b) => 
      new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime()
    );
  }, [comments, photos]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bottom-sheet z-50"
          >
            {/* Handle */}
            <div className="bottom-sheet-handle" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                {getIcon()}
                <h3 className="font-display text-lg font-medium">{getTitle()}</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[60vh]">
              <div className="p-4">
                {type === 'liked' && (
                  <div className="space-y-3">
                    {likedPhotosList.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No liked photos yet</p>
                    ) : (
                      likedPhotosList.map(photo => (
                        <div 
                          key={photo.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                          onClick={() => onPhotoClick(photo.id)}
                        >
                          <img 
                            src={photo.thumbnail} 
                            alt={photo.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{photo.name}</p>
                            <p className="text-xs text-muted-foreground">{photo.size}</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleLike(photo.id); }}
                            className="p-2 hover:bg-muted rounded-full"
                          >
                            <Heart className="w-4 h-4 fill-primary text-primary" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {type === 'comments' && (
                  <div className="space-y-4">
                    {allComments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No comments yet</p>
                    ) : (
                      allComments.map(({ photoId, photoName, comment }) => (
                        <div 
                          key={comment.id}
                          className="p-3 rounded-lg bg-secondary cursor-pointer hover:bg-champagne-dark transition-colors"
                          onClick={() => onPhotoClick(photoId)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-primary">{photoName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {type === 'selected' && (
                  <div className="space-y-3">
                    {selectedPhotosList.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No photos selected yet</p>
                    ) : (
                      <>
                        {selectedPhotosList.map(photo => (
                          <div 
                            key={photo.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                            onClick={() => onPhotoClick(photo.id)}
                          >
                            <img 
                              src={photo.thumbnail} 
                              alt={photo.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{photo.name}</p>
                              <p className="text-xs text-muted-foreground">{photo.size}</p>
                            </div>
                            {!isSubmitted && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                                className="p-2 hover:bg-destructive/10 rounded-full text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-border mt-4">
                          <Button variant="outline" className="flex-1 gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          <Button 
                            className="flex-1 gap-2"
                            onClick={submitSelection}
                            disabled={isSubmitted}
                          >
                            {isSubmitted ? 'Submitted ✓' : 'Submit Selection'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
