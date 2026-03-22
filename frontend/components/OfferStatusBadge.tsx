import clsx from 'clsx';
import type { OfferStatus } from '@/lib/types/offer';
import { offerStatusBadgeClassName } from '@/lib/offer-status-badge';

type Props = {
  status: OfferStatus;
  className?: string;
  children: React.ReactNode;
};

export function OfferStatusBadge({ status, className, children }: Props): JSX.Element {
  return <span className={clsx(offerStatusBadgeClassName(status), className)}>{children}</span>;
}
