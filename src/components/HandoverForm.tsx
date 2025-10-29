import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import IssueForm from "./IssueForm";

const HandoverForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift_leaving: "",
    shift_coming_in: "",
    is_swap_or_cover: "",
    downtime_notes: "",
    standup_notes: "",
    dts_report: "",
  });
  const [issues, setIssues] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const createHandoverMutation = useMutation({
    mutationFn: async () => {
      // Create handover
      const { data: handover, error: handoverError } = await supabase
        .from("shift_handovers")
        .insert([formData])
        .select()
        .single();

      if (handoverError) throw handoverError;

      // Create issues
      if (issues.length > 0) {
        const issuesWithHandoverId = issues.map(issue => ({
          ...issue,
          handover_id: handover.id,
        }));
        
        const { error: issuesError } = await supabase
          .from("issues")
          .insert(issuesWithHandoverId);

        if (issuesError) throw issuesError;
      }

      // Upload images
      if (images.length > 0) {
        for (const image of images) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${handover.id}/${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('handover-images')
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          await supabase.from("handover_images").insert({
            handover_id: handover.id,
            file_path: fileName,
            file_name: image.name,
            file_size: image.size,
          });
        }
      }

      return handover;
    },
    onSuccess: () => {
      toast({
        title: "Handover Created",
        description: "Shift handover has been successfully recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["recentHandovers"] });
      queryClient.invalidateQueries({ queryKey: ["issueStats"] });
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        shift_leaving: "",
        shift_coming_in: "",
        is_swap_or_cover: "",
        downtime_notes: "",
        standup_notes: "",
        dts_report: "",
      });
      setIssues([]);
      setImages([]);
      setImagePreviews([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create handover: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Shift Handover</CardTitle>
          <CardDescription>Document the shift transition and any ongoing issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swap">Swap or Cover?</Label>
              <Select
                value={formData.is_swap_or_cover}
                onValueChange={(value) => setFormData({ ...formData, is_swap_or_cover: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Swap">Swap</SelectItem>
                  <SelectItem value="Cover">Cover</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaving">Shift Leaving</Label>
              <Input
                id="leaving"
                placeholder="e.g., B/Q"
                value={formData.shift_leaving}
                onChange={(e) => setFormData({ ...formData, shift_leaving: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coming">Shift Coming In</Label>
              <Input
                id="coming"
                placeholder="e.g., C/Ethan"
                value={formData.shift_coming_in}
                onChange={(e) => setFormData({ ...formData, shift_coming_in: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="downtime">Downtime Notes</Label>
            <Textarea
              id="downtime"
              placeholder="Any comments for next shift tech regarding downtime..."
              value={formData.downtime_notes}
              onChange={(e) => setFormData({ ...formData, downtime_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="standup">Morning Standup / Meeting Notes</Label>
            <Textarea
              id="standup"
              placeholder="Notes from morning standup or Wednesday meeting..."
              value={formData.standup_notes}
              onChange={(e) => setFormData({ ...formData, standup_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dts">DTS Report</Label>
            <Textarea
              id="dts"
              placeholder="DTS report details..."
              value={formData.dts_report}
              onChange={(e) => setFormData({ ...formData, dts_report: e.target.value })}
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Images</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Click to upload images or drag and drop
                </p>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issues Section */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown Handover</CardTitle>
          <CardDescription>Document any ongoing issues or breakdowns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {issues.map((issue, index) => (
            <div key={index} className="p-4 border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Issue #{index + 1}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIssues(issues.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Area:</span> {issue.area}</div>
                <div><span className="text-muted-foreground">Machine:</span> {issue.machine}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {issue.description}</div>
                <div><span className="text-muted-foreground">Status:</span> {issue.status}</div>
                <div><span className="text-muted-foreground">Priority:</span> {issue.priority}</div>
              </div>
            </div>
          ))}

          <IssueForm onSubmit={(issue) => setIssues([...issues, issue])} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setFormData({
              date: new Date().toISOString().split('T')[0],
              shift_leaving: "",
              shift_coming_in: "",
              is_swap_or_cover: "",
              downtime_notes: "",
              standup_notes: "",
              dts_report: "",
            });
            setIssues([]);
            setImages([]);
            setImagePreviews([]);
          }}
        >
          Clear Form
        </Button>
        <Button
          onClick={() => createHandoverMutation.mutate()}
          disabled={createHandoverMutation.isPending || !formData.shift_leaving || !formData.shift_coming_in}
        >
          {createHandoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Handover
        </Button>
      </div>
    </div>
  );
};

export default HandoverForm;
