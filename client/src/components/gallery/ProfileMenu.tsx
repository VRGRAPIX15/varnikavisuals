import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  CheckSquare, 
  Download, 
  Send, 
  HelpCircle, 
  LogOut,
  Sun,
  Moon,
  Monitor,
  Grid3X3
} from 'lucide-react';
import { useGallery } from '@/contexts/GalleryContext';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';

interface ProfileMenuProps {
  onClose: () => void;
  onShowLiked: () => void;
  onShowComments: () => void;
  onShowSelected: () => void;
}

export function ProfileMenu({ onClose, onShowLiked, onShowComments, onShowSelected }: ProfileMenuProps) {
  const { theme, setTheme, gridColumns, setGridColumns, submitSelection, selectedPhotos, isSubmitted } = useGallery();
  const { user, logout } = useAuth();

  const handleDownloadAll = () => {
    toast({
      title: "Download Started",
      description: "Preparing watermarked images for download...",
    });
    onClose();
  };

  const handleSubmit = () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one photo before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    submitSelection();
    toast({
      title: "Selection Submitted! ✓",
      description: `Your selection of ${selectedPhotos.size} photos has been submitted successfully.`,
    });
    onClose();
  };

  const handleHelp = () => {
    toast({
      title: "Help",
      description: "Contact us at help@varnikavisuals.com for assistance.",
    });
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const menuItem = "flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors cursor-pointer text-sm";

  return (
    <div className="py-2">
      {/* User Info */}
      <div className="px-4 py-3 border-b border-border">
        <p className="font-medium">{user?.name}</p>
        <p className="text-xs text-muted-foreground">{user?.username}</p>
      </div>

      {/* Quick Access */}
      <div className="py-1">
        <button className={menuItem} onClick={() => { onShowLiked(); onClose(); }}>
          <Heart className="w-4 h-4" />
          My Likes
        </button>
        <button className={menuItem} onClick={() => { onShowComments(); onClose(); }}>
          <MessageCircle className="w-4 h-4" />
          My Comments
        </button>
        <button className={menuItem} onClick={() => { onShowSelected(); onClose(); }}>
          <CheckSquare className="w-4 h-4" />
          Selected Photos
        </button>
      </div>

      <Separator />

      {/* Grid Size */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm">Grid Size: {gridColumns}</span>
        </div>
        <Slider
          value={[gridColumns]}
          onValueChange={([val]) => setGridColumns(val)}
          min={1}
          max={8}
          step={1}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Theme */}
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground mb-2">Theme</p>
        <div className="flex gap-1">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs transition-colors ${
              theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-champagne-dark'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs transition-colors ${
              theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-champagne-dark'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs transition-colors ${
              theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-champagne-dark'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Auto
          </button>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="py-1">
        <button className={menuItem} onClick={handleDownloadAll}>
          <Download className="w-4 h-4" />
          Download All (ZIP)
        </button>
        
        <button 
          className={`${menuItem} ${isSubmitted ? 'text-green-600 dark:text-green-400' : selectedPhotos.size > 0 ? 'text-primary font-medium' : ''}`}
          onClick={handleSubmit}
          disabled={isSubmitted}
        >
          <Send className="w-4 h-4" />
          {isSubmitted ? 'Submitted ✓' : 'Submit Selection'}
        </button>
      </div>

      <Separator />

      <div className="py-1">
        <button className={menuItem} onClick={handleHelp}>
          <HelpCircle className="w-4 h-4" />
          Help
        </button>
        <button className={`${menuItem} text-destructive`} onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
