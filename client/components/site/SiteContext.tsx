import { createContext, useContext } from 'react';
import type { SiteData } from '../../lib/site';

const EMPTY_SITE: SiteData = { settings: {}, nav: {}, services: {}, galleries: {} };

export const SiteContext = createContext<SiteData | null>(null);

export function useSite(): SiteData {
  return useContext(SiteContext) || EMPTY_SITE;
}

export const RequestPopupContext = createContext<() => void>(() => undefined);

export function useRequestPopup(): () => void {
  return useContext(RequestPopupContext);
}
