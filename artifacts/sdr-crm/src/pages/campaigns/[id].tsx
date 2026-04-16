import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useListFunnelStages,
  getGetCampaignQueryKey,
  getListCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export default function CampaignDetailPage() {
  const [, params] = useRoute("/campaigns/:id");
  const [, setLocation] = useLocation();
  const campaignId = params?.id || "";
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    context: "",
    promptInstructions: "",
    triggerStage: "",
    isActive: true,
  });

  const { data: campaign, isLoading } = useGetCampaign(
    workspaceId || "",
    campaignId,
    { query: { enabled: !!workspaceId && !!campaignId } }
  );

  const { data: stages } = useListFunnelStages(workspaceId || "", {
    query: { enabled: !!workspaceId },
  });

  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        description: campaign.description || "",
        context: campaign.context || "",
        promptInstructions: campaign.promptInstructions || "",
        triggerStage: campaign.triggerStage || "",
        isActive: campaign.isActive,
      });
      setIsDirty(false);
    }
  }, [campaign]);

  const handleSave = () => {
    if (!workspaceId || !campaignId) return;
    updateCampaign.mutate(
      {
        workspaceId,
        campaignId,
        data: {
          name: form.name,
          description: form.description || null,
          context: form.context,
          promptInstructions: form.promptInstructions,
          triggerStage: form.triggerStage || null,
          isActive: form.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCampaignQueryKey(workspaceId, campaignId),
          });
          queryClient.invalidateQueries({
            queryKey: getListCampaignsQueryKey(workspaceId),
          });
          toast({ title: "Campaign saved" });
          setIsDirty(false);
        },
        onError: () => {
          toast({ title: "Failed to save campaign", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!workspaceId || !campaignId) return;
    deleteCampaign.mutate(
      { workspaceId, campaignId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListCampaignsQueryKey(workspaceId),
          });
          toast({ title: "Campaign deleted" });
          setLocation("/campaigns");
        },
        onError: () => {
          toast({ title: "Failed to delete campaign", variant: "destructive" });
        },
      }
    );
  };

  const setField = (field: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/campaigns")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">
              Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <Badge variant={campaign.isActive ? "default" : "secondary"}>
            {campaign.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateCampaign.isPending}
          >
            {updateCampaign.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Optional short description"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trigger Stage</Label>
            <Select
              value={form.triggerStage || "__none__"}
              onValueChange={(v) => setField("triggerStage", v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No trigger</SelectItem>
                {sortedStages.map((s) => (
                  <SelectItem key={s.id} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When a lead enters this stage, messages will be automatically generated.
            </p>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive campaigns won't auto-generate messages.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setField("isActive", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product / Service Context</Label>
            <Textarea
              value={form.context}
              onChange={(e) => setField("context", e.target.value)}
              rows={6}
              placeholder="Describe your product or service, value proposition, target audience, and key benefits..."
            />
            <p className="text-xs text-muted-foreground">
              The AI uses this to understand what you're selling and generate relevant outreach.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instructions for AI</Label>
            <Textarea
              value={form.promptInstructions}
              onChange={(e) => setField("promptInstructions", e.target.value)}
              rows={6}
              placeholder="e.g., Keep messages concise and professional. Reference the lead's company. Use a friendly but business tone..."
            />
            <p className="text-xs text-muted-foreground">
              Specific instructions on tone, format, and what the AI should focus on.
            </p>
          </div>
        </CardContent>
      </Card>

      {isDirty && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateCampaign.isPending}
            size="lg"
          >
            {updateCampaign.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
