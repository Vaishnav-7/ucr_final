
-- Table to store meter recommendation configuration (single-row config pattern)
CREATE TABLE public.meter_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  power_meter_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  power_footer_note TEXT NOT NULL DEFAULT '',
  water_recommendation TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meter_recommendations ENABLE ROW LEVEL SECURITY;

-- Anyone can read the config
CREATE POLICY "Anyone can read meter recommendations"
  ON public.meter_recommendations FOR SELECT
  USING (true);

-- Anyone can update (no auth in this app yet)
CREATE POLICY "Anyone can update meter recommendations"
  ON public.meter_recommendations FOR UPDATE
  USING (true);

-- Anyone can insert (for initial seed)
CREATE POLICY "Anyone can insert meter recommendations"
  ON public.meter_recommendations FOR INSERT
  WITH CHECK (true);

-- Seed with default data
INSERT INTO public.meter_recommendations (power_meter_rows, power_footer_note, water_recommendation)
VALUES (
  '[
    {"make":"Saral","model":"Saral -305","conn":"1-phase","ct":"NO","remark":"For Load below 60 Amps"},
    {"make":"Secure","model":"Sprint 350","conn":"3-phase","ct":"NO","remark":"For load below 60 Amps"},
    {"make":"Secure","model":"Elite 440/445","conn":"3-phase","ct":"YES","remark":"For load above 60A"},
    {"make":"Schneider Electric","model":"EM6400NG/Regor","conn":"3-phase","ct":"YES","remark":"For load above 60A"},
    {"make":"L&T","model":"WL4405","conn":"3-phase","ct":"YES","remark":"For load above 60A"}
  ]'::jsonb,
  'Before procuring Energy meters, Approval to be taken from P&E Department.',
  'Only pulse enabled (AMR Compatibility) water meters to be installed to support Automated Meter Reading.'
);
