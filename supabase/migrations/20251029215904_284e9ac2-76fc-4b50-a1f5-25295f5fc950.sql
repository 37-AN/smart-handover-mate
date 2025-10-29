-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shift handovers table
CREATE TABLE public.shift_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_leaving TEXT NOT NULL,
  shift_coming_in TEXT NOT NULL,
  is_swap_or_cover TEXT,
  downtime_notes TEXT,
  standup_notes TEXT,
  dts_report TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues/breakdowns table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_id UUID REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  machine TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Images table
CREATE TABLE public.handover_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_id UUID REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI conversations table for persistent memory
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_id UUID REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('handover-images', 'handover-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies (public access for now - can be restricted later)
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Allow public access (can be restricted to authenticated users if needed)
CREATE POLICY "Allow public access to shift_handovers" ON public.shift_handovers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to issues" ON public.issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to handover_images" ON public.handover_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to ai_conversations" ON public.ai_conversations FOR ALL USING (true) WITH CHECK (true);

-- Storage policies
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'handover-images');
CREATE POLICY "Allow public access to images" ON storage.objects FOR SELECT USING (bucket_id = 'handover-images');
CREATE POLICY "Allow public deletes" ON storage.objects FOR DELETE USING (bucket_id = 'handover-images');

-- Indexes for better performance
CREATE INDEX idx_handovers_date ON public.shift_handovers(date DESC);
CREATE INDEX idx_issues_handover ON public.issues(handover_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_images_handover ON public.handover_images(handover_id);
CREATE INDEX idx_images_issue ON public.handover_images(issue_id);
CREATE INDEX idx_ai_conversations_handover ON public.ai_conversations(handover_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_shift_handovers_updated_at BEFORE UPDATE ON public.shift_handovers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();