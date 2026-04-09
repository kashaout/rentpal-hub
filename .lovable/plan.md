
# RentPal Onboarding & Verification Redesign

## Phase 1: Database Schema Changes
1. **Add `ux_role` column** to `profiles` table (`landlord` | `tenant` | null) — UX-only, no privileges
2. **Create `verification_requests` table** — stores verification submissions with status tracking
   - `id`, `user_id`, `verification_type` (landlord | tenant_short_term | tenant_long_term)
   - `status` (pending | approved | rejected | additional_info_needed)
   - `submitted_data` (JSONB: name, contact, ID info, etc.)
   - `document_paths` (text[]: file references in storage)
   - `admin_notes`, `reviewed_by`, `reviewed_at`
   - RLS: users see own, admins see all
3. **Create `verification-documents` storage bucket** — private, RLS-protected
4. **Remove role selection from signup flow** — `assign_initial_role` RPC no longer called at signup

## Phase 2: Signup Flow Changes
- Auth page: collect only email, phone (optional), password
- Remove role dropdown from signup form
- After signup, redirect to onboarding tutorial (not dashboard)

## Phase 3: Onboarding Tutorial (UX-only)
- Replace current plan-aware wizard with a role-selection wizard:
  - Step 1: "Are you a Landlord or Tenant?" (saves to `profiles.ux_role`)
  - Step 2-N: Tailored tips based on selection (properties tips for landlords, browsing tips for tenants)
  - User can change `ux_role` anytime from Settings
- This does NOT assign any system role

## Phase 4: Verification Flows (Behavior-Driven)
### Landlord Verification (triggered when adding first property)
- Multi-step form: personal info → government ID upload → proof of ownership → address verification → review
- On submit: creates `verification_requests` record with status `pending`
- Property creation blocked until verification approved
- Admin reviews and approves/rejects from Admin Panel

### Tenant Verification (triggered when joining/applying for a property)
- Step 1: Choose tenant type (short-term vs long-term)
- Short-term flow: ID upload → payment method confirmation → optional reviews
- Long-term flow: ID upload → income proof → rental history/references → optional background check (Coming Soon placeholder)
- On submit: creates `verification_requests` record
- Booking/application blocked until verified

## Phase 5: Admin Verification Review Panel
- New tab in Admin Panel: "Verification Requests"
- List pending requests with submitted documents
- Approve/reject with notes
- On approval: system assigns the appropriate role via secure RPC

## Phase 6: Security Fixes (from scan)
- Fix subscription self-upgrade vulnerability (remove user UPDATE entirely)
- Fix lease credentials exposure (already partially done, reinforce)

## Files Modified
- `src/pages/Auth.tsx` — remove role selection
- `src/components/OnboardingWizard.tsx` — complete rewrite
- `src/hooks/useAuth.tsx` — remove role from signUp params
- New: `src/components/verification/LandlordVerificationFlow.tsx`
- New: `src/components/verification/TenantVerificationFlow.tsx`
- New: `src/components/admin/VerificationReviewPanel.tsx`
- New: `src/hooks/useVerification.ts`
- Modified: `src/components/PropertiesPage.tsx` — gate "Add Property" on landlord verification
- Modified: `src/components/SettingsPage.tsx` — add UX role toggle
- Database: 1 migration for schema + RLS + storage + RPC
