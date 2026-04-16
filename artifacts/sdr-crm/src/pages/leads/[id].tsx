import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetLead,
  useUpdateLead,
  useDeleteLead,
  useListCampaigns,
  useListCustomFields,
  useListLeadMessages,
  useGenerateMessages,
  useSendMessage,
  useListFunnelStages,
  getGetLeadQueryKey,
  getListLeadMessagesQueryKey,
  getListLeadsQueryKey,
} from "@workspace/api-client-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Send,
  Copy,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import type { StageValidationError } from "@workspace/api-client-react";

export default function LeadDetailPage() {
  const [, params] = useRoute("/leads/:id");
  const [, setLocation] = useLocation();
  const leadId = params?.id || "";
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [validationError, setValidationError] = useState<StageValidationError | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [messageCount, setMessageCount] = useState(2);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    source: "",
    notes: "",
    stage: "",
    customFieldValues: {} as Record<string, string>,
  });

  const { data: lead, isLoading: leadLoading } = useGetLead(
    workspaceId || "",
    leadId,
    { query: { enabled: !!workspaceId && !!leadId } }
  );

  const { data: stages } = useListFunnelStages(workspaceId || "", {
    query: { enabled: !!workspaceId },
  });

  const { data: campaigns } = useListCampaigns(workspaceId || "", {
    query: { enabled: !!workspaceId },
  });

  const { data: customFields } = useListCustomFields(workspaceId || "", {
    query: { enabled: !!workspaceId },
  });

  const { data: messages, isLoading: messagesLoading } = useListLeadMessages(
    workspaceId || "",
    leadId,
    {},
    { query: { enabled: !!workspaceId && !!leadId } }
  );

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const generateMessages = useGenerateMessages();
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        role: lead.role || "",
        source: lead.source || "",
        notes: lead.notes || "",
        stage: lead.stage || "",
        customFieldValues: (lead.customFieldValues as Record<string, string>) || {},
      });
    }
  }, [lead]);

  const handleSave = (field?: Partial<typeof form>) => {
    if (!workspaceId || !leadId) return;
    const data = field ? { ...form, ...field } : form;
    updateLead.mutate(
      { workspaceId, leadId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(workspaceId, leadId) });
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(workspaceId) });
          toast({ title: "Lead updated" });
        },
        onError: (err: any) => {
          if (err?.response?.status === 422) {
            err.response.json().then((body: StageValidationError) => {
              setValidationError(body);
            });
          } else {
            toast({ title: "Failed to update lead", variant: "destructive" });
          }
        },
      }
    );
  };

  const handleDelete = () => {
    if (!workspaceId || !leadId) return;
    deleteLead.mutate(
      { workspaceId, leadId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(workspaceId) });
          toast({ title: "Lead deleted" });
          setLocation("/leads");
        },
        onError: () => {
          toast({ title: "Failed to delete lead", variant: "destructive" });
        },
      }
    );
  };

  const handleGenerateMessages = () => {
    if (!workspaceId || !leadId || !selectedCampaignId) {
      toast({ title: "Select a campaign first", variant: "destructive" });
      return;
    }
    generateMessages.mutate(
      { workspaceId, leadId, data: { campaignId: selectedCampaignId, count: messageCount } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListLeadMessagesQueryKey(workspaceId, leadId, {}),
          });
          toast({ title: "Messages generated" });
        },
        onError: () => {
          toast({ title: "Failed to generate messages", variant: "destructive" });
        },
      }
    );
  };

  const handleSendMessage = (messageId: string) => {
    if (!workspaceId || !leadId) return;
    sendMessage.mutate(
      { workspaceId, leadId, data: { messageId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(workspaceId, leadId) });
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(workspaceId) });
          queryClient.invalidateQueries({
            queryKey: getListLeadMessagesQueryKey(workspaceId, leadId, {}),
          });
          toast({ title: "Message sent — lead moved to Tentando Contato" });
        },
        onError: () => {
          toast({ title: "Failed to send message", variant: "destructive" });
        },
      }
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (leadLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);
  const currentStageName = sortedStages.find((s) => s.slug === lead.stage)?.name || lead.stage;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/leads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            {(lead.company || lead.role) && (
              <p className="text-sm text-muted-foreground">
                {lead.role}
                {lead.role && lead.company ? " at " : ""}
                {lead.company}
              </p>
            )}
          </div>
          <Badge>{currentStageName}</Badge>
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select
                    value={form.stage}
                    onValueChange={(val) => {
                      setForm((f) => ({ ...f, stage: val }));
                      handleSave({ stage: val });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedStages.map((s) => (
                        <SelectItem key={s.id} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    onBlur={() => handleSave()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  onBlur={() => handleSave()}
                  rows={3}
                />
              </div>

              {customFields && customFields.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-3">Custom Fields</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.name}</Label>
                          <Input
                            value={form.customFieldValues[field.slug] || ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                customFieldValues: {
                                  ...f.customFieldValues,
                                  [field.slug]: e.target.value,
                                },
                              }))
                            }
                            onBlur={() => handleSave()}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Message Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Campaign</Label>
                  <Select
                    value={selectedCampaignId}
                    onValueChange={setSelectedCampaignId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Count</Label>
                  <Select
                    value={String(messageCount)}
                    onValueChange={(v) => setMessageCount(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateMessages}
                  disabled={!selectedCampaignId || generateMessages.isPending}
                >
                  {generateMessages.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>

              {messagesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="border rounded-lg p-4 space-y-3 bg-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm whitespace-pre-wrap flex-1">{msg.content}</p>
                        <Badge
                          variant={msg.status === "sent" ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {msg.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(msg.content)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </Button>
                          {msg.status === "generated" && (
                            <Button
                              size="sm"
                              onClick={() => handleSendMessage(msg.id)}
                              disabled={sendMessage.isPending}
                            >
                              {sendMessage.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Send
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                  No messages yet. Select a campaign and generate messages above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(lead.updatedAt), "MMM d, yyyy")}</span>
              </div>
              {lead.stage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stage</span>
                  <span>{currentStageName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{lead.name}"? This action cannot be undone.
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

      <Dialog
        open={!!validationError}
        onOpenChange={() => setValidationError(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Required Fields Missing</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{validationError?.error}</p>
          {validationError?.missingFields && validationError.missingFields.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-2">Missing fields:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationError.missingFields.map((field) => (
                  <li key={field} className="text-sm text-muted-foreground">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={() => setValidationError(null)}>OK</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
