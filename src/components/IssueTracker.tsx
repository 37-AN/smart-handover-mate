import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Filter, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const IssueTracker = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: issues, isLoading } = useQuery({
    queryKey: ["issues", statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase
        .from("issues")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", issueId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Issue Resolved",
        description: "The issue has been marked as resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issueStats"] });
    },
  });

  const filteredIssues = issues?.filter((issue) =>
    issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.machine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "resolved": return "default";
      case "escalated": return "destructive";
      default: return "secondary";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Tracker</CardTitle>
        <CardDescription>Monitor and manage all equipment issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issues List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredIssues && filteredIssues.length > 0 ? (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusVariant(issue.status)}>
                      {issue.status}
                    </Badge>
                    <Badge variant={getPriorityVariant(issue.priority)}>
                      {issue.priority}
                    </Badge>
                  </div>
                  {issue.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveIssueMutation.mutate(issue.id)}
                      disabled={resolveIssueMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-primary">{issue.area}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{issue.machine}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(issue.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No issues found matching your filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IssueTracker;
