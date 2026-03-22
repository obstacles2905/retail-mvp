/** Fired so {@link DealSidebar} refetches when the current user mutates an offer (e.g. archive) without a self-targeted socket notification. */
export const OFFERS_LIST_REFRESH_EVENT = 'retailprocure:offers-list-refresh';

export function dispatchOffersListRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OFFERS_LIST_REFRESH_EVENT));
}
