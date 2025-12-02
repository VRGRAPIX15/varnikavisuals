import React from 'react';
import { motion } from 'framer-motion';
import { Folder as FolderIcon, Images } from 'lucide-react';
import { Folder } from '@/types/gallery';

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
  index: number;
}

export function FolderCard({ folder, onClick, index }: FolderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
        {/* Cover Image */}
        <img
          src={folder.coverImage}
          alt={folder.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="w-4 h-4 text-gold" />
            <span className="text-xs text-primary-foreground/80 flex items-center gap-1">
              <Images className="w-3 h-3" />
              {folder.photoCount}
            </span>
          </div>
          <h3 className="font-display text-lg text-primary-foreground font-medium">
            {folder.name}
          </h3>
        </div>
      </div>
    </motion.div>
  );
}
