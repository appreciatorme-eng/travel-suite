-- Fix: shared_itineraries SELECT policy is too permissive (USING true).
-- Restrict to only non-expired shares (defence in depth).
-- The application should still filter by share_code, but this prevents full-table enumeration.

DROP POLICY IF EXISTS "Anyone can view shared itinerary by code" ON public.shared_itineraries;

CREATE POLICY "Shared itineraries viewable when not expired"
    ON public.shared_itineraries FOR SELECT
    USING (
        expires_at IS NULL OR expires_at > now()
    );

-- Allow owners to always see their own shares (for management)
CREATE POLICY "Owners can view own shares"
    ON public.shared_itineraries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.itineraries
            WHERE itineraries.id = shared_itineraries.itinerary_id
            AND itineraries.user_id = auth.uid()
        )
    );

-- Allow owners to delete their shares
CREATE POLICY "Owners can delete own shares"
    ON public.shared_itineraries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.itineraries
            WHERE itineraries.id = shared_itineraries.itinerary_id
            AND itineraries.user_id = auth.uid()
        )
    );

-- Fix: push_tokens needs admin policy for cleaning stale tokens
CREATE POLICY "Admins can manage push tokens"
    ON public.push_tokens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Fix: add updated_at trigger to notification_logs
CREATE TRIGGER handle_updated_at_notification_logs
    BEFORE UPDATE ON public.notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_logs
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
