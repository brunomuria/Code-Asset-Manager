import React, { useState } from "react";
import { 
  useListFunnelStages,
  useCreateFunnelStage,
  useUpdateFunnelStage,
  useDeleteFunnelStage,
  getListFunnelStagesQueryKey
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function FunnelSettingsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const { data: stages, isLoading } = useListFunnelStages(workspaceId || "", {
    query: { enabled: !!workspaceId }
  });

  const createStage = useCreateFunnelStage();
  const deleteStage = useDeleteFunnelStage();
  // We won't fully implement drag and drop ordering in this basic version to keep it simple,
  // but we will list them in order.

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;

    createStage.mutate({
      workspaceId,
      data: {
        name,
        color,
        order: stages ? stages.length : 0,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFunnelStagesQueryKey(workspaceId) });
        toast({ title: "Stage created" });
        setIsCreateOpen(false);
        setName("");
        setColor("#3b82f6");
      },
      onError: () => {
        toast({ title: "Failed to create stage", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!workspaceId) return;
    if (confirm("Are you sure you want to delete this stage? Leads in this stage might be affected.")) {
      deleteStage.mutate({
        workspaceId,
        stageId: id
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFunnelStagesQueryKey(workspaceId) });
          toast({ title: "Stage deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete stage", variant: "destructive" });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Funnel Stages</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnel Stages</h1>
          <p className="text-muted-foreground mt-1">Configure the pipeline stages for your leads.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funnel Stage</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Stage Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input id="color" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 p-1 h-10" />
                  <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1 font-mono uppercase" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim() || createStage.isPending}>
                {createStage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Stage
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {sortedStages.map((stage) => (
          <Card key={stage.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <GripVertical className="text-muted-foreground/50 h-5 w-5" />
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: stage.color || '#ccc' }} 
              />
              <div className="flex-1">
                <div className="font-semibold">{stage.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{stage.slug}</div>
              </div>
              <div>
                {!stage.isDefault && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(stage.id)}
                    disabled={deleteStage.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                {stage.isDefault && (
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mr-4">Default</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
