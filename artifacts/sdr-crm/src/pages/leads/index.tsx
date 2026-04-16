import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListFunnelStages, 
  useListLeads, 
  useCreateLead,
  getListLeadsQueryKey
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function LeadsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadCompany, setNewLeadCompany] = useState("");
  const [newLeadRole, setNewLeadRole] = useState("");

  const { data: stages, isLoading: stagesLoading } = useListFunnelStages(workspaceId || "", {
    query: { enabled: !!workspaceId }
  });

  const { data: leads, isLoading: leadsLoading } = useListLeads(
    workspaceId || "", 
    { search: search || undefined }, 
    { query: { enabled: !!workspaceId } }
  );

  const createLead = useCreateLead();

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newLeadName.trim() || !stages?.length) return;

    createLead.mutate({
      workspaceId,
      data: {
        name: newLeadName,
        company: newLeadCompany,
        role: newLeadRole,
        stage: stages[0].slug
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(workspaceId) });
        toast({ title: "Lead created" });
        setIsCreateOpen(false);
        setNewLeadName("");
        setNewLeadCompany("");
        setNewLeadRole("");
      },
      onError: () => {
        toast({ title: "Failed to create lead", variant: "destructive" });
      }
    });
  };

  if (stagesLoading || leadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[300px] space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={newLeadName} onChange={e => setNewLeadName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={newLeadCompany} onChange={e => setNewLeadCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={newLeadRole} onChange={e => setNewLeadRole(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={!newLeadName.trim() || createLead.isPending}>
                {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full pb-4">
          {sortedStages.map(stage => {
            const stageLeads = leads?.filter(l => l.stage === stage.slug) || [];
            return (
              <div key={stage.id} className="min-w-[320px] w-[320px] flex flex-col bg-muted/30 rounded-lg border">
                <div className="p-3 border-b flex items-center justify-between font-medium">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color || 'hsl(var(--primary))' }}
                    />
                    {stage.name}
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{stageLeads.length}</span>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {stageLeads.map(lead => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">{lead.name}</div>
                          {(lead.company || lead.role) && (
                            <div className="text-sm text-muted-foreground">
                              {lead.role} {lead.role && lead.company ? 'at' : ''} {lead.company}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
