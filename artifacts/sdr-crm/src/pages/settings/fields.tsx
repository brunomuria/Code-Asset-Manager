import React, { useState } from "react";
import { 
  useListCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  getListCustomFieldsQueryKey
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function FieldsSettingsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "select">("text");
  const [optionsStr, setOptionsStr] = useState("");

  const { data: fields, isLoading } = useListCustomFields(workspaceId || "", {
    query: { enabled: !!workspaceId }
  });

  const createField = useCreateCustomField();
  const deleteField = useDeleteCustomField();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;

    const options = fieldType === "select" 
      ? optionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    if (fieldType === "select" && (!options || options.length === 0)) {
      toast({ title: "Please provide options for select field", variant: "destructive" });
      return;
    }

    createField.mutate({
      workspaceId,
      data: {
        name,
        fieldType,
        options
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey(workspaceId) });
        toast({ title: "Custom field created" });
        setIsCreateOpen(false);
        setName("");
        setFieldType("text");
        setOptionsStr("");
      },
      onError: () => {
        toast({ title: "Failed to create field", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!workspaceId) return;
    if (confirm("Are you sure you want to delete this custom field? Existing data in leads will be preserved but inaccessible.")) {
      deleteField.mutate({
        workspaceId,
        fieldId: id
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey(workspaceId) });
          toast({ title: "Custom field deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete field", variant: "destructive" });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">Define custom data fields to collect for your leads.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select value={fieldType} onValueChange={(v: any) => setFieldType(v)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (Single Line)</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fieldType === "select" && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (comma separated) *</Label>
                  <Input 
                    id="options" 
                    value={optionsStr} 
                    onChange={e => setOptionsStr(e.target.value)} 
                    placeholder="Option 1, Option 2, Option 3"
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={!name.trim() || createField.isPending}>
                {createField.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Field
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fields?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No custom fields</h3>
          <p className="text-muted-foreground mt-1 mb-4">Add custom fields to store specific information about your leads.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Add Field</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields?.map((field) => (
            <Card key={field.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <div className="font-semibold">{field.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{field.slug}</div>
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="capitalize">{field.fieldType}</Badge>
                    {field.fieldType === "select" && field.options && (
                      <div className="text-xs text-muted-foreground">
                        {field.options.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(field.id)}
                  disabled={deleteField.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
