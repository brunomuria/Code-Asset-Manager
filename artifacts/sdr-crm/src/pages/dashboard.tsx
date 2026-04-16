import React from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useGetDashboard, useGetActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: dashboard, isLoading: isDashboardLoading } = useGetDashboard(workspaceId || "", {
    query: { enabled: !!workspaceId }
  });

  const { data: activities, isLoading: isActivitiesLoading } = useGetActivity(
    workspaceId || "",
    { limit: 10 },
    {
      query: { enabled: !!workspaceId }
    }
  );

  if (isDashboardLoading || !dashboard) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Leads", value: dashboard.totalLeads, icon: Users },
    { title: "Active Campaigns", value: dashboard.totalCampaigns, icon: Target },
    { title: "Messages Generated", value: dashboard.totalMessagesGenerated, icon: MessageSquare },
    { title: "Messages Sent", value: dashboard.totalMessagesSent, icon: Send },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.leadsByStage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stageName" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isActivitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                    <div className="text-sm font-medium">{activity.description}</div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>{activity.leadName}</span>
                      <span>{format(new Date(activity.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
