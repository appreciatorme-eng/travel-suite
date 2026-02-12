# Monetization Plan (Travel Suite)

## Goal
Offer Travel Suite as a **B2B SaaS platform for travel agents/tour operators**, with a client-facing mobile app and a dedicated admin web app. Monetize via subscription tiers and optional usage-based add-ons.

## Target Customers
- Independent travel agents
- Tour operators (small–mid sized)
- Boutique travel agencies offering custom itineraries and ground services

## Value Proposition
- Deliver a premium client experience (mobile app + push updates)
- Reduce operational overhead (automation, templates, notifications)
- Enable multi-agent collaboration and reporting

## Product Packaging
### Core Components
- **Admin Web App** (Next.js): trip management, client CRM, driver assignments, notifications
- **Client Mobile App** (Flutter): trip details, itinerary, notifications, driver info
- **Backend** (Supabase + Edge Functions): auth, database, notifications, analytics

### Subscription Tiers (Initial)
- **Free**
  - Single organization
  - Limited monthly itineraries
  - Basic notifications
  - Watermarked/"Powered by" branding
- **Pro**
  - Higher itinerary limits
  - Custom branding (logo/colors)
  - Advanced notifications
  - PDF export + sharing
- **Enterprise**
  - Multiple organizations/teams
  - Custom domains + white label
  - Priority support + SLA
  - Dedicated onboarding

## Revenue Model
- **SaaS subscription** per organization, optionally per seat
- **Usage-based add-ons**
  - AI itinerary generation volume
  - SMS/WhatsApp delivery (if enabled)
  - Advanced analytics exports

## Feature Gating Strategy
- **Database**: `organizations.subscription_tier` already supports `free | pro | enterprise`
- **Admin UI**: gate settings, branding, and advanced notifications by tier
- **API**: enforce limits server-side (Edge Functions / RLS / Supabase policies)

## Technical Requirements
- Tenant isolation in Supabase (organization_id scoping)
- Role-based access control in admin app
- Audit logs and billing metadata
- Usage tracking for AI and notification volume

## Roadmap (Monetization)
1. **Phase 1**: Tier-based feature flags in admin app
2. **Phase 2**: Usage tracking tables + reporting
3. **Phase 3**: Billing integration (Stripe) + invoicing
4. **Phase 4**: White-label customization & multi-tenant onboarding

## Success Metrics
- Agent activation rate
- Monthly active organizations
- Trip volume per org
- Conversion from Free → Pro
- Retention after 90 days
