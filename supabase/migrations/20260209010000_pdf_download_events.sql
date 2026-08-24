-- Unique version assigned during migration-history reconciliation.
-- Track individual PDF download events for analytics
CREATE TABLE IF NOT EXISTS public.pdf_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  download_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdf_download_events_business_id_idx
  ON public.pdf_download_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pdf_download_events_site_id_idx
  ON public.pdf_download_events(site_id, created_at DESC);

ALTER TABLE public.pdf_download_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pdf_download_events FROM anon, authenticated;
GRANT ALL ON TABLE public.pdf_download_events TO service_role;
