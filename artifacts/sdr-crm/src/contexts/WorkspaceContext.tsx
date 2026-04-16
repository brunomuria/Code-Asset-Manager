import React, { createContext, useContext, useEffect, useState } from "react";
import { useListWorkspaces } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

interface WorkspaceContextType {
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
  workspace: Workspace | null;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(() => {
    return localStorage.getItem("sdr_workspace_id");
  });

  const { data: workspaces, isLoading: isWorkspacesLoading } = useListWorkspaces({
    query: {
      enabled: isUserLoaded && !!user,
    }
  });

  useEffect(() => {
    if (isUserLoaded && user && workspaces && !isWorkspacesLoading) {
      if (workspaces.length === 0) {
        setLocation("/onboarding");
      } else if (!workspaceId || !workspaces.find(w => w.id === workspaceId)) {
        setWorkspaceId(workspaces[0].id);
      }
    }
  }, [user, isUserLoaded, workspaces, isWorkspacesLoading, workspaceId, setLocation]);

  const setWorkspaceId = (id: string) => {
    localStorage.setItem("sdr_workspace_id", id);
    setWorkspaceIdState(id);
  };

  const workspace = workspaces?.find((w) => w.id === workspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId,
        setWorkspaceId,
        workspace,
        isLoading: !isUserLoaded || isWorkspacesLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
