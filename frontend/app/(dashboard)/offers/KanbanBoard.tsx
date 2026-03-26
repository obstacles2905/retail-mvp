'use client';

import Link from 'next/link';
import { OfferListItem } from '@/lib/types/offer';
import { offerStatusBadgeClassName } from '@/lib/offer-status-badge';

interface KanbanBoardProps {
  offers: OfferListItem[];
  unread: Record<string, number>;
  actionInProgress: string | null;
  onMarkDelivered: (id: string) => void;
  onArchive: (id: string) => void;
}

type ColumnId = 'NEW' | 'NEGOTIATING' | 'WAITING_VENDOR' | 'AGREED' | 'DELIVERED' | 'REJECTED';

interface ColumnDef {
  id: ColumnId;
  title: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'NEW', title: 'Нові / Вхідні' },
  { id: 'NEGOTIATING', title: 'В процесі торгів' },
  { id: 'WAITING_VENDOR', title: 'Очікуємо на постачальника' },
  { id: 'AGREED', title: 'Укладено / Очікує доставки' },
  { id: 'DELIVERED', title: 'Виконано / Доставлено' },
  { id: 'REJECTED', title: 'Відхилено' },
];

function getColumnForOffer(offer: OfferListItem): ColumnId {
  if (offer.status === 'NEW') return 'NEW';
  if (offer.status === 'IN_REVIEW' || offer.status === 'COUNTER_OFFER') {
    return offer.currentTurn === 'BUYER' ? 'NEGOTIATING' : 'WAITING_VENDOR';
  }
  if (offer.status === 'ACCEPTED' || offer.status === 'AWAITING_DELIVERY') return 'AGREED';
  if (offer.status === 'DELIVERED') return 'DELIVERED';
  if (offer.status === 'REJECTED') return 'REJECTED';
  return 'NEW'; // Fallback
}

function getOfferProductNames(offer: OfferListItem): string {
  if (!offer.items || offer.items.length === 0) return '—';
  const first = offer.items[0].sku?.name ?? offer.items[0].productName ?? '—';
  if (offer.items.length === 1) return first;
  return `${first} +${offer.items.length - 1}`;
}

function getOfferTotalVolume(offer: OfferListItem): string {
  if (!offer.items || offer.items.length === 0) return '';
  if (offer.items.length === 1) return `${offer.items[0].volume} ${offer.items[0].unit}`;
  return ''; // If multiple, maybe don't show total volume or sum if same unit
}

function getOfferCurrentPrice(offer: OfferListItem): string {
  if (!offer.items || offer.items.length === 0) return '—';
  if (offer.items.length === 1) return `${offer.items[0].currentPrice} грн`;
  return 'Різні ціни';
}

export default function KanbanBoard({
  offers,
  unread,
  actionInProgress,
  onMarkDelivered,
  onArchive,
}: KanbanBoardProps) {
  // Group offers by column
  const columnsData: Record<ColumnId, OfferListItem[]> = {
    NEW: [],
    NEGOTIATING: [],
    WAITING_VENDOR: [],
    AGREED: [],
    DELIVERED: [],
    REJECTED: [],
  };

  offers.forEach((offer) => {
    if (offer.isArchived) return; // Optional: hide archived from Kanban, or put them somewhere else
    const col = getColumnForOffer(offer);
    columnsData[col].push(offer);
  });

  return (
    <div className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-4 min-h-0">
      {COLUMNS.map((col) => (
        <div key={col.id} className="flex w-[300px] shrink-0 flex-col rounded-lg bg-muted/50 p-3 h-full">
          <div className="mb-3 flex items-center justify-between px-1 shrink-0">
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
              {columnsData[col.id].length}
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 pr-1">
            {columnsData[col.id].map((offer) => (
              <Link
                key={offer.id}
                href={`/offers/${offer.id}`}
                className="group relative flex flex-col rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                {unread[offer.id] ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                    {unread[offer.id]}
                  </span>
                ) : null}

                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium text-foreground">
                    {getOfferProductNames(offer)}
                  </span>
                </div>

                <div className="mb-3 flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{offer.vendor.companyName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{getOfferCurrentPrice(offer)}</span>
                    <span>{getOfferTotalVolume(offer)}</span>
                  </div>
                </div>

                {/* Assignee / Action Area */}
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2" title={offer.buyer?.name || 'Невідомо'}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {offer.buyer?.name ? offer.buyer.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {offer.buyer?.name || '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {col.id === 'AGREED' && offer.status === 'AWAITING_DELIVERY' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onMarkDelivered(offer.id);
                        }}
                        disabled={actionInProgress === offer.id}
                        className="rounded bg-success px-2 py-1 text-[10px] font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
                      >
                        {actionInProgress === offer.id ? '…' : 'Доставлено'}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            
            {columnsData[col.id].length === 0 && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-transparent">
                <span className="text-xs text-muted-foreground">Немає угод</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
