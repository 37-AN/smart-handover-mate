import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface IssueFormProps {
  onSubmit: (issue: any) => void;
}

const IssueForm = ({ onSubmit }: IssueFormProps) => {
  const [showForm, setShowForm] = useState(false);
  const [issueData, setIssueData] = useState({
    area: "",
    machine: "",
    description: "",
    status: "ongoing",
    priority: "medium",
  });

  const handleSubmit = () => {
    if (issueData.area && issueData.machine && issueData.description) {
      onSubmit(issueData);
      setIssueData({
        area: "",
        machine: "",
        description: "",
        status: "ongoing",
        priority: "medium",
      });
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowForm(true)}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Issue
      </Button>
    );
  }

  return (
    <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/50">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input
            id="area"
            placeholder="e.g., Area 1"
            value={issueData.area}
            onChange={(e) => setIssueData({ ...issueData, area: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="machine">Machine</Label>
          <Input
            id="machine"
            placeholder="e.g., K7-2"
            value={issueData.machine}
            onChange={(e) => setIssueData({ ...issueData, machine: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the issue..."
          value={issueData.description}
          onChange={(e) => setIssueData({ ...issueData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={issueData.status}
            onValueChange={(value) => setIssueData({ ...issueData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={issueData.priority}
            onValueChange={(value) => setIssueData({ ...issueData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          <Plus className="mr-2 h-4 w-4" />
          Add Issue
        </Button>
        <Button variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default IssueForm;
