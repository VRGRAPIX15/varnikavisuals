import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <h1 className={cn('font-display font-semibold tracking-wide text-primary', sizes[size])}>
        Varnika Visuals
      </h1>
      <p className={cn(
        'font-body text-muted-foreground tracking-[0.3em] uppercase',
        size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'
      )}>
        Photography
      </p>
    </div>
  );
}
