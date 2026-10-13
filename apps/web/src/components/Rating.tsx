import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Average rating, or "New" for people nobody has reviewed yet. */
export function Rating({
  value,
  count,
  className,
}: {
  value: number | null | undefined;
  count?: number;
  className?: string;
}) {
  const hasReviews = count === undefined ? (value ?? 0) > 0 : count > 0;

  if (!hasReviews) {
    return <span className={cn('text-xs text-slate-500', className)}>No reviews yet</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold text-amber-400', className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
      {(value ?? 0).toFixed(1)}
      {count !== undefined ? (
        <span className="font-normal text-slate-500">({count})</span>
      ) : null}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn('h-3.5 w-3.5', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700')}
        />
      ))}
    </span>
  );
}
