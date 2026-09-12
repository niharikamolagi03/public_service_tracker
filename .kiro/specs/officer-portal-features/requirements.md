# Requirements Document

## Introduction

This document defines requirements for the Officer Portal feature set of the civic grievance redressal platform. The platform already has a Django REST backend (`grievances` app) and a React frontend with a shared `AdminDashboard.js` serving both officer and admin roles. The features below enhance the officer experience with AI routing transparency, real-time complaint management, priority handling, live communication, proof-of-resolution uploads, escalation workflows, performance analytics, and one-click status updates.

---

## Glossary

- **Officer_Portal**: The React frontend view and associated backend APIs used by officers (role = `officer`) to manage grievances assigned to their department.
- **AI_Router**: The existing `ai_router.py` keyword-scoring module that classifies grievances into categories, departments, and priorities.
- **Complaint_Queue**: The ordered list of grievances visible to an officer, filtered by their department.
- **Priority_Queue**: The complaint queue sorted so `critical` and `high` priority grievances appear first with visual urgency indicators.
- **Chat_Thread**: The per-grievance comment thread (`GrievanceComment` model) used for live citizen-officer communication.
- **Resolution_Proof**: Media files (images or documents) uploaded by an officer after marking a grievance resolved, stored via `GrievanceMedia`.
- **Escalation**: The workflow by which an officer promotes a grievance to `escalated` status with a mandatory reason, triggering admin notification.
- **Performance_Dashboard**: The analytics view showing per-officer stats, resolution times, satisfaction scores, and department leaderboard.
- **Status_Update**: A change to a grievance's `status` field, recorded in `GrievanceUpdate`.
- **Confidence_Score**: The `ai_confidence` float (0–1) stored on a `Grievance`, produced by the AI_Router.
- **Matched_Keywords**: The `keywords_matched` list returned by `classify_grievance()` and stored/surfaced to officers.
- **Satisfaction_Score**: The average `rating` from `GrievanceFeedback` records associated with an officer's resolved grievances.
- **Admin**: A user with role = `admin` who has cross-department visibility and receives escalation notifications.

---

## Requirements

### Requirement 1: AI Routing Transparency

**User Story:** As an officer, I want to see why a complaint was routed to my department, so that I can quickly understand its context and validate the AI's decision.

#### Acceptance Criteria

1. WHEN an officer views a grievance in the Officer_Portal, THE Officer_Portal SHALL display the Confidence_Score as a percentage alongside the AI-assigned category and department.
2. WHEN an officer views a grievance in the Officer_Portal, THE Officer_Portal SHALL display the Matched_Keywords that caused the AI_Router to route the grievance to the officer's department.
3. WHEN the AI_Router assigns a confidence score below 50%, THE Officer_Portal SHALL display a visual warning indicator (e.g., "Low confidence — please verify category") on the grievance detail view.
4. THE AI_Router SHALL include `keywords_matched` (up to 5 keywords) and `confidence` in the response returned by the `ai_classify` endpoint and stored on the `Grievance` model.
5. WHEN a grievance is created, THE Backend SHALL persist `ai_confidence` and `ai_category` on the `Grievance` record so the data is available without re-running classification.

---

### Requirement 2: Real-Time Complaint Queue

**User Story:** As an officer, I want a live-updating complaint queue, so that I can see new grievances as they arrive without manually refreshing the page.

#### Acceptance Criteria

1. WHEN the Officer_Portal complaint queue is open, THE Officer_Portal SHALL automatically refresh the grievance list every 30 seconds.
2. WHEN a new grievance arrives in the officer's department during an active session, THE Officer_Portal SHALL display a visual indicator (e.g., badge or toast) notifying the officer of the new item without a full page reload.
3. THE Officer_Portal SHALL display the timestamp of the last successful data refresh so officers know how current the queue is.
4. WHEN the auto-refresh fetch fails, THE Officer_Portal SHALL display an error indicator and retry after 60 seconds.
5. THE Complaint_Queue SHALL be ordered by priority (critical → high → medium → low) and then by submission time (oldest first within the same priority level) by default.

---

### Requirement 3: Priority-Based Complaint Handling

**User Story:** As an officer, I want critical and high-priority complaints surfaced at the top of my queue with clear visual urgency indicators, so that I can triage the most important issues first.

#### Acceptance Criteria

1. THE Officer_Portal SHALL render `critical` priority grievances with a red urgency banner and a pulsing indicator in the complaint list.
2. THE Officer_Portal SHALL render `high` priority grievances with an orange urgency indicator in the complaint list.
3. WHEN a grievance has priority `critical` or `high` and has been in `filed` or `assigned` status for more than 24 hours, THE Officer_Portal SHALL display an overdue warning badge on that grievance row.
4. THE Officer_Portal SHALL allow officers to filter the Complaint_Queue by priority level (critical, high, medium, low) using a single-click filter control.
5. THE Backend SHALL accept a `sort` query parameter on the grievances list endpoint with value `priority_asc` to return grievances ordered critical → high → medium → low.

---

### Requirement 4: Live Citizen-Officer Communication

**User Story:** As an officer, I want a real-time comment thread on each grievance, so that I can communicate directly with the citizen and keep them informed.

#### Acceptance Criteria

1. WHEN an officer opens a grievance detail view, THE Officer_Portal SHALL display the full Chat_Thread (all `GrievanceComment` records for that grievance) in chronological order.
2. WHEN an officer submits a comment, THE Officer_Portal SHALL mark the comment as `is_official = true` and display it with a distinct visual style (e.g., blue background, "Official" badge).
3. WHEN an officer posts a comment on a grievance, THE Backend SHALL send an in-app notification to the grievance's citizen with the comment preview.
4. WHEN a citizen posts a comment on a grievance, THE Backend SHALL send an in-app notification to the assigned officer (if any) or all department officers.
5. THE Officer_Portal SHALL poll the Chat_Thread every 15 seconds while the grievance detail view is open, displaying new messages without a full page reload.
6. IF a comment text is empty, THEN THE Backend SHALL return a 400 error with message "Comment text required".

---

### Requirement 5: Proof-of-Resolution Upload

**User Story:** As an officer, I want to upload photos or documents as proof of resolution when closing a grievance, so that citizens and admins can verify the work was done.

#### Acceptance Criteria

1. WHEN an officer marks a grievance as `resolved`, THE Officer_Portal SHALL present a file upload control accepting images (JPEG, PNG) and documents (PDF) up to 10 MB each.
2. WHEN an officer uploads resolution proof, THE Backend SHALL store each file as a `GrievanceMedia` record linked to the grievance with a `caption` field set to "Resolution proof".
3. THE Backend SHALL accept up to 5 proof files per resolution action.
4. IF an uploaded file exceeds 10 MB, THEN THE Backend SHALL return a 400 error with message "File size exceeds 10 MB limit".
5. IF an uploaded file has an unsupported MIME type (not image/jpeg, image/png, or application/pdf), THEN THE Backend SHALL return a 400 error with message "Unsupported file type".
6. WHEN resolution proof is uploaded, THE Officer_Portal SHALL display thumbnails of uploaded images and file icons for documents in the grievance detail view under a "Resolution Evidence" section.
7. WHEN a citizen views a resolved grievance, THE Officer_Portal (citizen view) SHALL display the resolution proof files so the citizen can verify the resolution.

---

### Requirement 6: Complaint Escalation System

**User Story:** As an officer, I want to escalate a grievance to admin with a reason, so that complex or sensitive cases receive higher-level attention.

#### Acceptance Criteria

1. WHEN an officer clicks "Escalate" on a grievance with status `assigned`, `investigating`, or `in_progress`, THE Officer_Portal SHALL display an escalation form requiring a mandatory reason field (minimum 20 characters).
2. WHEN an officer submits an escalation, THE Backend SHALL update the grievance status to `escalated`, record the reason in `GrievanceUpdate.message`, and send an in-app notification to all Admin users.
3. WHEN a grievance is escalated, THE Backend SHALL include the escalating officer's name and the reason in the admin notification message.
4. IF the escalation reason is fewer than 20 characters, THEN THE Backend SHALL return a 400 error with message "Escalation reason must be at least 20 characters".
5. WHEN a grievance has status `escalated`, THE Officer_Portal SHALL display an "Escalated" badge with the escalation reason visible to both the officer and admin.
6. WHEN an admin views an escalated grievance, THE Officer_Portal SHALL allow the admin to de-escalate by setting the status back to `in_progress` with an optional note.

---

### Requirement 7: Performance Analytics Dashboard

**User Story:** As an officer, I want to see my own performance metrics, and as an admin, I want to see per-officer and department-level analytics, so that performance can be tracked and improved.

#### Acceptance Criteria

1. THE Backend SHALL expose a `/api/grievances/officer_stats/` endpoint that returns, for each officer: total assigned, total resolved, average resolution time in days, and Satisfaction_Score (average feedback rating, or null if no feedback exists).
2. WHEN an officer accesses the Performance_Dashboard, THE Officer_Portal SHALL display that officer's own stats: total assigned, resolved, pending, average resolution time, and Satisfaction_Score.
3. WHEN an admin accesses the Performance_Dashboard, THE Officer_Portal SHALL display a department leaderboard ranking officers by resolution rate (resolved / assigned) within each department.
4. THE Performance_Dashboard SHALL display a bar chart of grievances resolved per week for the last 8 weeks for the current officer (or all officers for admin).
5. THE Performance_Dashboard SHALL display the officer's Satisfaction_Score as a star rating (1–5) with the number of ratings received.
6. WHEN an officer has a resolution rate below 50% with more than 10 assigned grievances, THE Performance_Dashboard SHALL display a performance alert indicator.
7. THE Backend `officer_stats` endpoint SHALL be accessible to officers (own stats only) and admins (all officers).

---

### Requirement 8: One-Click Status Updates

**User Story:** As an officer, I want to update a grievance's status directly from the complaint list with a single click, so that I can process routine transitions quickly without opening a modal.

#### Acceptance Criteria

1. THE Officer_Portal complaint list SHALL display inline action buttons for each grievance based on its current status: `filed` → "Start Review" button; `assigned` or `investigating` → "Mark In Progress" button; `in_progress` → "Mark Resolved" button.
2. WHEN an officer clicks a one-click status button, THE Officer_Portal SHALL immediately call the `update_status` API endpoint with the next logical status and a default system message, without opening a modal dialog.
3. WHEN the one-click status update succeeds, THE Officer_Portal SHALL update the grievance row in-place (optimistic UI update) and show a success toast notification.
4. WHEN the one-click status update fails, THE Officer_Portal SHALL revert the optimistic UI update and display an error toast with the server's error message.
5. THE Officer_Portal SHALL NOT show one-click buttons for status transitions that require mandatory input (reject requires rejection reason; escalate requires escalation reason; resolve when proof upload is configured as required).
6. WHEN an officer performs a one-click status update, THE Backend SHALL create a `GrievanceUpdate` record with `performed_by` set to the officer and a default message indicating the transition was performed via quick action.
