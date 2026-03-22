export type OfferStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'COUNTER_OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AWAITING_DELIVERY';

export type OfferTurn = 'BUYER' | 'VENDOR';
export type InitiatorRole = 'BUYER' | 'VENDOR';

export interface OfferListItem {
  id: string;
  skuId: string | null;
  buyerId: string | null;
  productName: string | null;
  category: string | null;
  isNovelty: boolean;
  vendorId: string;
  initiatorRole: InitiatorRole;
  currentPrice: string;
  volume: number;
  unit: string;
  deliveryTerms: string | null;
  deliveryDate: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  createdAt: string;
  updatedAt: string;
  sku: { id: string; name: string; uom: string } | null;
  vendor: { id: string; name: string; companyName: string };
  buyer?: { id: string; name: string; companyName: string } | null;
  hasUnread?: boolean;
}

export interface OfferDetail {
  id: string;
  skuId: string | null;
  buyerId: string | null;
  productName: string | null;
  category: string | null;
  isNovelty: boolean;
  vendorId: string;
  initiatorRole: InitiatorRole;
  currentPrice: string;
  volume: number;
  unit: string;
  deliveryTerms: string | null;
  deliveryDate: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  createdAt: string;
  updatedAt: string;
  sku: {
    id: string;
    name: string;
    category: string;
    targetPrice: string | null;
    createdBy: { id: string; name: string; companyName: string };
  } | null;
  buyer: { id: string; name: string; companyName: string } | null;
  vendor: { id: string; name: string; companyName: string };
}

export type SystemEventType = 'PRICE_CHANGED' | 'DEAL_ACCEPTED' | 'TERMS_UPDATED' | 'DELIVERY_RESCHEDULED';

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
