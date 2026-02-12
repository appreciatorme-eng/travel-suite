-- Migration: Add onboarding fields to profiles
-- Up Migration

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "bio" text,
ADD COLUMN IF NOT EXISTS "phone_whatsapp" text,
ADD COLUMN IF NOT EXISTS "dietary_requirements" text[],
ADD COLUMN IF NOT EXISTS "mobility_needs" text,
ADD COLUMN IF NOT EXISTS "driver_info" jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "client_info" jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.onboarding_step IS '0: New, 1: Basic Info, 2: Complete';
COMMENT ON COLUMN public.profiles.driver_info IS 'Stores driver-specific data: license_number, vehicle_details (make, model, year, plate), languages, experience_years, services_offered';
COMMENT ON COLUMN public.profiles.client_info IS 'Stores client-specific data: emergency_contact, insurance_details, passport_expiry (encrypted ideally, but jsonb for now)';

-- Down Migration
-- ALTER TABLE public.profiles
-- DROP COLUMN IF EXISTS "onboarding_step",
-- DROP COLUMN IF EXISTS "bio",
-- DROP COLUMN IF EXISTS "phone_whatsapp",
-- DROP COLUMN IF EXISTS "dietary_requirements",
-- DROP COLUMN IF EXISTS "mobility_needs",
-- DROP COLUMN IF EXISTS "driver_info",
-- DROP COLUMN IF EXISTS "client_info";
