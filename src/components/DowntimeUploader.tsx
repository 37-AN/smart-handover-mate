import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const DowntimeUploader = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setResult(null);
    }
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Find header row
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(20, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row.some(cell => cell && typeof cell === 'string' && cell.toLowerCase().includes('machine'))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            reject(new Error("Could not find header row in Excel file"));
            return;
          }

          const headers = jsonData[headerRowIndex] as string[];
          const records = [];

          // Parse each row after header
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0 || !row[0]) continue;

            const record: any = {};
            headers.forEach((header, index) => {
              if (header) {
                record[header.trim()] = row[index];
              }
            });

            // Only process rows with valid machine data
            if (record['Machine']) {
              records.push({
                machine: record['Machine'] || 'Unknown',
                description: record['DT Description'] || '',
                category: record['Category'] || '',
                comment: record['Comment'] || '',
                duration: parseFloat(record['Mins Qty']) || 0,
                startTime: record['DT Start Time'] || '',
                endTime: record['DT End Time'] || '',
                userName: record['User Name'] || '',
              });
            }
          }

          resolve(records);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setResult(null);

    try {
      toast({
        title: "Processing File",
        description: "Parsing Excel and analyzing with AI...",
      });

      // Parse Excel file on client side
      const records = await parseExcelFile(uploadedFile);

      if (records.length === 0) {
        throw new Error("No valid records found in the file");
      }

      // Send parsed data to edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-downtime-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ records }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Success!",
        description: data.message,
      });

      // Clear file after successful upload
      setUploadedFile(null);
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to process downtime report",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-accent" />
          Upload Downtime Report
        </CardTitle>
        <CardDescription>
          Upload your Excel downtime report. AI will automatically analyze, categorize, and create issues for each entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="downtime-file"
            disabled={isUploading}
          />
          <label
            htmlFor="downtime-file"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Click to upload Excel file</p>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx and .xls formats
              </p>
            </div>
          </label>
        </div>

        {uploadedFile && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{uploadedFile.name}</span>
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process Report
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  {result.message}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All issues have been analyzed by AI and saved to the tracker.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DowntimeUploader;
