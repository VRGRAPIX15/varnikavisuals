import React from 'react';
import { Search, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import { useGallery } from '@/contexts/GalleryContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Header3SortProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header3Sort({ searchQuery, onSearchChange }: Header3SortProps) {
  const { sortBy, setSortBy, selectAll, deselectAll, selectedPhotos, currentFolderPhotos, currentFolder, isSubmitted } = useGallery();

  const allSelected = currentFolder && currentFolderPhotos.length > 0 
    ? currentFolderPhotos.every(p => selectedPhotos.has(p.id))
    : false;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  return (
    <header className="header-sticky top-[104px] py-2 px-4 md:px-6 border-t-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-[140px] h-9 bg-secondary border-0">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-newest">Newest First</SelectItem>
              <SelectItem value="date-oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Select All Toggle - Only show when in a folder */}
          {currentFolder && !isSubmitted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectAll}
              className="h-9 gap-2"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
