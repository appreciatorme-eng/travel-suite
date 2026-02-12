# Manual Testing Guide

This document outlines manual testing procedures for various features of the Travel Suite application.

## 1. Client & Driver Onboarding

### prerequisites

Before testing, ensure you have applied the latest database migration:

```bash
npx supabase db push
```

### Scenario A: New Client Signup

1.  **Action**: Launch the app and sign up with a new email as a **Client**.
2.  **Expected Behavior**:
    - After signup, you are redirected to the **Onboarding Screen**.
    - **Step 1**: Asking for Bio & WhatsApp. Fill this out.
    - **Step 2**: Asking for Dietary Requirements & Mobility Needs. Fill this out.
    - Click **Complete**.
    - You are redirected to the **Home Screen** (Trips).
    - No "Complete Profile" banner should be visible.
3.  **Validation**: Check Supabase `profiles` table. `onboarding_step` should be `2`. `client_info` should contain your answers.

### Scenario B: New Driver Signup

1.  **Action**: Launch the app and sign up with a new email as a **Driver**.
2.  **Expected Behavior**:
    - After signup, you are redirected to the **Onboarding Screen**.
    - **Step 1**: Asking for Bio & WhatsApp.
    - **Step 2**: Asking for Vehicle Info (Make/Model/Plate) & License Number.
    - Click **Complete**.
    - You are redirected to the **Home Screen**.
3.  **Validation**: Check Supabase `profiles` table. `driver_info` should contain vehicle details.

### Scenario C: Skip Onboarding

1.  **Action**: Sign up (or set `onboarding_step = 0` for a test user).
2.  **Click "Setup Later"**.
3.  **Expected Behavior**:
    - You are redirected to the **Home Screen** immediately.
    - A **"Complete your profile" banner** should appear at the top of the Trips list.
4.  **Action**: Click the banner.
5.  **Expected Behavior**:
    - You are taken back to the Onboarding Flow.
    - Complete the flow.
    - Returned to Home Screen.
    - The banner should **disappear**.

## 2. Admin - Trip Driver Assignment

### Prerequisites

- Create at least two trips with **overlapping dates** (e.g., Trip A: Feb 1-5, Trip B: Feb 3-7).
- Have at least one driver created in the system.

### Scenario A: Assign Available Driver

1.  **Action**: Open **Trip A** detail page.
2.  **Action**: Navigate to "Day 1" (Feb 1).
3.  **Action**: Select "Driver X" from the assignment dropdown.
4.  **Action**: Click **Save Changes**.
5.  **Expected Behavior**:
    - The driver is successfully assigned.
    - No warning or error is displayed.
    - The UI reflects "Driver X" is assigned to Day 1.

### Scenario B: Detect Busy Driver (Conflict)

1.  **Action**: Open **Trip B** detail page.
2.  **Action**: Navigate to "Day 1" (Feb 3).
    - Note: If Trip A is Feb 1-5, then Feb 3 is Day 3 of Trip A.
    - Ensure "Driver X" is assigned to Day 3 of Trip A (or whatever date overlaps with Trip B Day 1).
3.  **Action**: Click the Driver Assignment dropdown for Trip B Day 1.
4.  **Expected Behavior**:
    - "Driver X" should appear in the list but be **disabled** (grayed out).
    - The text should include `(Unavailable - Assigned to another trip)`.
    - You should NOT be able to select this driver.
5.  **Validation**:
    - Attempt to force selection (if possible via devtools) or observe that UI prevents it.
    - Verify that un-assigning the driver from Trip A immediately makes them available in Trip B (after refresh).
