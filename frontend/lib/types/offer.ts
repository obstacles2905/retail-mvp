export type OfferStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'COUNTER_OFFER'
  | 'ACCEPTED'
  | 'REJECTED';

export type OfferTurn = 'BUYER' | 'VENDOR';
export type InitiatorRole = 'BUYER' | 'VENDOR';

export interface OfferListItem {
  id: string;
  skuId: string | null;
  buyerId: string | null;
  productName: string | null;
  vendorId: string;
  initiatorRole: InitiatorRole;
  currentPrice: string;
  volume: number;
  unit: string;
  deliveryTerms: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  createdAt: string;
  updatedAt: string;
  sku: { name: string };
  vendor: { name: string; companyName: string };
  buyer?: { name: string; companyName: string };
}

export interface OfferDetail {
  id: string;
  skuId: string | null;
  buyerId: string | null;
  productName: string | null;
  vendorId: string;
  initiatorRole: InitiatorRole;
  currentPrice: string;
  volume: number;
  unit: string;
  deliveryTerms: string | null;
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

export type SystemEventType = 'PRICE_CHANGED' | 'DEAL_ACCEPTED' | 'TERMS_UPDATED';

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
