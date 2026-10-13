'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8 w-8 rounded-xl text-xs',
  md: 'h-10 w-10 rounded-2xl text-sm',
  lg: 'h-14 w-14 rounded-2xl text-xl',
  xl: 'h-20 w-20 rounded-3xl text-3xl',
} as const;

/** A user's photo, falling back to their initial when there is none or it fails to load. */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border border-purple-500/20 bg-purple-900/80 font-semibold text-white',
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        // Avatars are arbitrary user-supplied URLs, which next/image cannot
        // optimise without an allow-list of hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src!)}
        />
      ) : (
        <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || '?'}</span>
      )}
    </div>
  );
}
