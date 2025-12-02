import React, { useState } from 'react';
import { Heart, MessageCircle, CheckSquare, Grid3X3, User, Check } from 'lucide-react';
import { useGallery } from '@/contexts/GalleryContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileMenu } from './ProfileMenu';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Header2ActionsProps {
  onShowLiked: () => void;
  onShowComments: () => void;
  onShowSelected: () => void;
}

export function Header2Actions({ onShowLiked, onShowComments, onShowSelected }: Header2ActionsProps) {
  const { likedPhotos, selectedPhotos, comments, gridColumns, setGridColumns, isSubmitted } = useGallery();
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const totalComments = React.useMemo(() => {
    let count = 0;
    comments.forEach(arr => { count += arr.length; });
    return count;
  }, [comments]);

  return (
    <header className="header-sticky top-[52px] py-2 px-4 md:px-6 border-t-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Liked */}
          <button
            onClick={onShowLiked}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-champagne-dark transition-colors"
          >
            <Heart className={`w-4 h-4 ${likedPhotos.size > 0 ? 'fill-primary text-primary' : ''}`} />
            <span className="text-sm font-medium">{likedPhotos.size}</span>
          </button>

          {/* Comments */}
          <button
            onClick={onShowComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-champagne-dark transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{totalComments}</span>
          </button>

          {/* Selected */}
          <button
            onClick={onShowSelected}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              isSubmitted 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-secondary hover:bg-champagne-dark'
            }`}
          >
            {isSubmitted ? (
              <Check className="w-4 h-4" />
            ) : (
              <CheckSquare className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {selectedPhotos.size}/{user?.selectionLimit || 25}
            </span>
            {isSubmitted && <span className="text-xs ml-1">Submitted</span>}
          </button>
        </div>

        {/* Grid & Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Grid Size */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-champagne-dark transition-colors">
                <Grid3X3 className="w-4 h-4" />
                <span className="text-sm">{gridColumns}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-4" align="end">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Columns</span>
                  <span className="font-medium">{gridColumns}</span>
                </div>
                <Slider
                  value={[gridColumns]}
                  onValueChange={([val]) => setGridColumns(val)}
                  min={1}
                  max={8}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>8</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile */}
          <Popover open={showProfile} onOpenChange={setShowProfile}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-burgundy-light transition-colors">
                <User className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Profile</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <ProfileMenu
                onClose={() => setShowProfile(false)}
                onShowLiked={onShowLiked}
                onShowComments={onShowComments}
                onShowSelected={onShowSelected}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
