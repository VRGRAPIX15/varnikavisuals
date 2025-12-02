import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Logo } from './Logo';
import { useGallery } from '@/contexts/GalleryContext';

export function Header1Branding() {
  const { getBreadcrumbs, setCurrentFolder } = useGallery();
  const breadcrumbs = getBreadcrumbs();

  const handleBreadcrumbClick = (id: string) => {
    if (id === 'home') {
      setCurrentFolder(null);
    } else {
      setCurrentFolder(id);
    }
  };

  return (
    <header className="header-sticky top-0 py-3 px-4 md:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo size="sm" />

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                className={`px-2 py-1 rounded transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {crumb.id === 'home' ? (
                  <Home className="w-4 h-4" />
                ) : (
                  crumb.name
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Mobile Breadcrumb */}
        <div className="md:hidden flex items-center gap-1 text-sm">
          <button
            onClick={() => setCurrentFolder(null)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Home className="w-4 h-4" />
          </button>
          {breadcrumbs.length > 1 && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium truncate max-w-[150px]">
                {breadcrumbs[breadcrumbs.length - 1].name}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
