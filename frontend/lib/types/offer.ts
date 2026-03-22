export type OfferStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'COUNTER_OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AWAITING_DELIVERY'
  | 'DELIVERED'
  | 'ARCHIVED';

export type OfferTurn = 'BUYER' | 'VENDOR';
export type InitiatorRole = 'BUYER' | 'VENDOR';

export interface OfferItemDetail {
  id: string;
  skuId: string | null;
  productName: string | null;
  category: string | null;
  isNovelty: boolean;
  currentPrice: string;
  volume: number;
  unit: string;
  sku: {
    id: string;
    name: string;
    uom: string;
    category: string;
    targetPrice: string | null;
    createdBy: { id: string; name: string; companyName: string };
  } | null;
}

export interface OfferListItem {
  id: string;
  buyerId: string | null;
  vendorId: string;
  initiatorRole: InitiatorRole;
  deliveryTerms: string | null;
  deliveryDate: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  acceptedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OfferItemDetail[];
  vendor: { id: string; name: string; companyName: string };
  buyer?: { id: string; name: string; companyName: string } | null;
  hasUnread?: boolean;
}

export interface OfferDetail {
  id: string;
  buyerId: string | null;
  vendorId: string;
  initiatorRole: InitiatorRole;
  deliveryTerms: string | null;
  deliveryDate: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  acceptedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OfferItemDetail[];
  buyer: { id: string; name: string; companyName: string } | null;
  vendor: { id: string; name: string; companyName: string };
}

export type SystemEventType = 'PRICE_CHANGED' | 'DEAL_ACCEPTED' | 'TERMS_UPDATED' | 'DELIVERY_RESCHEDULED' | 'DELIVERY_CONFIRMED' | 'OFFER_ARCHIVED';

export interface OfferMessage {
  id: string;
  offerId: string;
  senderId: string;
  content: string | null;
  isSystemEvent: boolean;
  eventType: SystemEventType | null;
  metaData: Record<string, unknown> | null;
  createdAt: string;
  sender?: { id: string; name: string; companyName: string };
}
