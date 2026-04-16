import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListCampaigns, 
  useCreateCampaign,
  getListCampaignsQueryKey
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [promptInstructions, setPromptInstructions] = useState("");

  const { data: campaigns, isLoading } = useListCampaigns(workspaceId || "", {
    query: { enabled: !!workspaceId }
  });

  const createCampaign = useCreateCampaign();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim() || !context.trim() || !promptInstructions.trim()) return;

    createCampaign.mutate({
      workspaceId,
      data: {
        name,
        description,
        context,
        promptInstructions,
        isActive: true
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(workspaceId) });
        toast({ title: "Campaign created" });
        setIsCreateOpen(false);
        setName("");
        setDescription("");
        setContext("");
        setPromptInstructions("");
      },
      onError: () => {
        toast({ title: "Failed to create campaign", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context">Product/Service Context *</Label>
                <Textarea 
                  id="context" 
                  value={context} 
                  onChange={e => setContext(e.target.value)} 
                  required 
                  className="min-h-[100px]"
                  placeholder="Describe your product, value proposition, and key selling points..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Instructions for AI *</Label>
                <Textarea 
                  id="prompt" 
                  value={promptInstructions} 
                  onChange={e => setPromptInstructions(e.target.value)} 
                  required 
                  className="min-h-[100px]"
                  placeholder="Instructions on how to write the messages. Keep it professional, short, etc."
                />
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim() || !context.trim() || !promptInstructions.trim() || createCampaign.isPending}>
                {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No campaigns yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first campaign to generate AI outreach messages.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Create Campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map(campaign => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="h-full flex flex-col cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
                      {campaign.description && (
                        <CardDescription className="line-clamp-1 mt-1">{campaign.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={campaign.isActive ? "default" : "secondary"}>
                      {campaign.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {campaign.context}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 text-xs text-muted-foreground flex justify-between">
                  <span>Created {format(new Date(campaign.createdAt), 'MMM d, yyyy')}</span>
                  {campaign.triggerStage && <span>Trigger: {campaign.triggerStage}</span>}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
