'use client';

import { createContext, useContext } from 'react';

type PortalContextValue = {
  consultantId: string;
  userId: string;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({
  consultantId,
  userId,
  children,
}: PortalContextValue & { children: React.ReactNode }) {
  return (
    <PortalContext.Provider value={{ consultantId, userId }}>{children}</PortalContext.Provider>
  );
}

export function usePortalConsultant(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortalConsultant must be used inside the portal layout');
  }
  return ctx;
}
