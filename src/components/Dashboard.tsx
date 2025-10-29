import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { data: recentHandovers, isLoading: handoversLoading } = useQuery({
    queryKey: ["recentHandovers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_handovers")
        .select("*")
        .order("date", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: issueStats } = useQuery({
    queryKey: ["issueStats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("status");
      
      if (error) throw error;
      
      const ongoing = data.filter(i => i.status === "ongoing").length;
      const resolved = data.filter(i => i.status === "resolved").length;
      
      return { ongoing, resolved, total: data.length };
    },
  });

  const { data: recentIssues } = useQuery({
    queryKey: ["recentIssues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issueStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing Issues</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{issueStats?.ongoing || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Issues</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{issueStats?.resolved || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully fixed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Handovers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Recent Shift Handovers
          </CardTitle>
          <CardDescription>Latest shift transitions and notes</CardDescription>
        </CardHeader>
        <CardContent>
          {handoversLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentHandovers && recentHandovers.length > 0 ? (
            <div className="space-y-3">
              {recentHandovers.map((handover) => (
                <div
                  key={handover.id}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{format(new Date(handover.date), "PPP")}</span>
                        {handover.is_swap_or_cover && (
                          <Badge variant="secondary">{handover.is_swap_or_cover}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {handover.shift_leaving} → {handover.shift_coming_in}
                      </p>
                      {handover.downtime_notes && (
                        <p className="text-sm mt-2">{handover.downtime_notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No handovers yet. Create your first one!</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Issues
          </CardTitle>
          <CardDescription>Latest equipment and system problems</CardDescription>
        </CardHeader>
        <CardContent>
          {recentIssues && recentIssues.length > 0 ? (
            <div className="space-y-3">
              {recentIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={issue.status === "resolved" ? "default" : "destructive"}>
                        {issue.status}
                      </Badge>
                      <Badge variant="outline">{issue.priority}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-primary">{issue.area}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{issue.machine}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No issues reported yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
