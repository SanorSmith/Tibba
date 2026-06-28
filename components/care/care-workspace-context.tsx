"use client";

import { createContext, useContext, ReactNode } from "react";

interface CareWorkspaceContextValue {
  workspaceId: string;
}

const CareWorkspaceContext = createContext<CareWorkspaceContextValue | null>(null);

export function CareWorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  return (
    <CareWorkspaceContext.Provider value={{ workspaceId }}>
      {children}
    </CareWorkspaceContext.Provider>
  );
}

export function useCareWorkspace() {
  const ctx = useContext(CareWorkspaceContext);
  if (!ctx) {
    throw new Error("useCareWorkspace must be used within a CareWorkspaceProvider");
  }
  return ctx;
}
