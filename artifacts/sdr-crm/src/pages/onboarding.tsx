import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateWorkspace } from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { setWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [name, setName] = useState("");
  
  const createWorkspace = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createWorkspace.mutate(
      { data: { name } },
      {
        onSuccess: (workspace) => {
          setWorkspaceId(workspace.id);
          toast({ title: "Workspace created successfully." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Failed to create workspace.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to SDR CRM</h1>
          <p className="text-muted-foreground mt-2">Let's set up your first workspace to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 border rounded-lg shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input 
              id="workspace-name" 
              placeholder="e.g. Acme Corp Sales" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createWorkspace.isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || createWorkspace.isPending}>
            {createWorkspace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
