import type { OfferStatus } from '@/lib/types/offer';

const badgeBase =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';

/**
 * Semantic badge styles for {@link OfferStatus} — tuned for light and dark via CSS variables.
 *
 * | Status | Semantics |
 * |--------|-----------|
 * | NEW, ARCHIVED | muted |
 * | IN_REVIEW | warning (pending attention) |
 * | COUNTER_OFFER | accent (negotiation in progress) |
 * | ACCEPTED | success |
 * | REJECTED | destructive |
 * | AWAITING_DELIVERY | success (agreed, logistics) |
 * | DELIVERED | info (completed delivery milestone) |
 */
export function offerStatusBadgeClassName(status: OfferStatus): string {
  switch (status) {
    case 'NEW':
      return `${badgeBase} border-border bg-muted text-muted-foreground`;
    case 'IN_REVIEW':
      return `${badgeBase} border-warning/35 bg-warning/15 text-warning`;
    case 'COUNTER_OFFER':
      return `${badgeBase} border-primary/30 bg-primary/12 text-primary`;
    case 'ACCEPTED':
      return `${badgeBase} border-success/35 bg-success/15 text-success`;
    case 'REJECTED':
      return `${badgeBase} border-destructive/35 bg-destructive/15 text-destructive`;
    case 'AWAITING_DELIVERY':
      return `${badgeBase} border-success/35 bg-success/15 text-success`;
    case 'DELIVERED':
      return `${badgeBase} border-info/35 bg-info/15 text-info`;
    case 'ARCHIVED':
      return `${badgeBase} border-border bg-muted/80 text-muted-foreground opacity-90`;
    default:
      return `${badgeBase} border-border bg-muted text-muted-foreground`;
  }
}

/** User-proposed / novelty SKU chip (shared across buyer & vendor tables). */
export const noveltyBadgeClassName =
  'inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning';
