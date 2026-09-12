# Requirements Document

## Introduction

This document defines the requirements for enhancing the Citizen Portal of an existing civic grievance redressal platform (Django REST + React). The platform already has a working foundation — grievance submission, in-app notifications, follow/unfollow, basic feedback, and image upload. The goal is to elevate these features to hackathon-quality: more robust, polished, and complete, while adding the missing pieces that make the portal genuinely useful to citizens and administrators.

The eight feature areas are:
1. AI Auto-Categorization of Complaints
2. Real-Time Complaint Tracking
3. Instant Notifications (SMS / Email / In-App)
4. Save / Follow Complaint
5. Image & Location-Based Complaint Upload
6. Live Status Timeline
7. Smart Duplicate Complaint Detection
8. Feedback & Rating System

---

## Glossary

- **Portal**: The Citizen Portal web application (React frontend + Django REST backend).
- **Citizen**: A registered end-user who files or follows grievances.
- **Officer**: A verified government employee assigned to handle grievances in a specific department.
- **Admin**: A super-user who manages officers, departments, and escalations.
- **Grievance**: A civic complaint submitted by a Citizen, identified by a unique `grievance_id`.
- **AI_Router**: The keyword-scoring module (`ai_router.py`) that classifies a Grievance into a category, department, and priority.
- **Duplicate_Detector**: The backend service that compares a new Grievance against existing open ones to identify likely duplicates.
- **Notification_Service**: The backend service responsible for dispatching in-app, email, and SMS notifications.
- **Timeline**: The ordered sequence of `GrievanceUpdate` records that represent the lifecycle of a Grievance.
- **Status**: One of `filed`, `assigned`, `investigating`, `in_progress`, `resolved`, `closed`, `rejected`, `escalated`.
- **Confidence_Score**: A float in [0, 1] produced by the AI_Router indicating how certain the classification is.
- **Follow**: A `GrievanceFollow` record linking a User to a Grievance so the user receives status updates.
- **Feedback**: A `GrievanceFeedback` record submitted by the Citizen after a Grievance is resolved or closed.
- **Map_Picker**: An interactive map widget (Leaflet.js) embedded in the complaint submission form.
- **SMS_Provider**: A third-party SMS gateway (e.g., Twilio or MSG91) configured via environment variables.
- **Email_Provider**: Django's email backend (SMTP or SendGrid) configured via environment variables.

---

## Requirements

### Requirement 1: AI Auto-Categorization of Complaints

**User Story:** As a Citizen, I want the system to automatically suggest the correct category, department, and priority for my complaint as I type, so that I do not have to manually figure out which department handles my issue.

#### Acceptance Criteria

1. WHEN a Citizen enters a title or description in the complaint form, THE Portal SHALL call the `/api/grievances/ai_classify/` endpoint and display the AI suggestion within 1 second of the user stopping input (debounced at 600 ms).
2. THE AI_Router SHALL return a `category`, `department`, `priority`, and `confidence` value for every classification request, including requests where no keywords match (defaulting to `other` with confidence ≤ 0.35).
3. WHEN the AI_Router returns a Confidence_Score ≥ 0.60, THE Portal SHALL automatically pre-fill the category and priority fields with the AI suggestion and display a dismissible banner showing the confidence percentage.
4. WHEN the AI_Router returns a Confidence_Score < 0.60, THE Portal SHALL display the suggestion as a non-binding recommendation that the Citizen can accept or ignore.
5. THE Portal SHALL display the matched keywords alongside the AI suggestion so the Citizen understands why the classification was made.
6. WHEN a Citizen submits a Grievance, THE Portal SHALL record the AI-suggested values (`ai_category`, `ai_department`, `ai_priority`, `ai_confidence`) separately from the final user-confirmed values, preserving both for audit purposes.
7. WHEN an Officer or Admin views a Grievance, THE Portal SHALL display the AI classification alongside the final classification, including the Confidence_Score and matched keywords.
8. THE AI_Router SHALL support at least 9 categories: `electricity`, `water`, `road`, `garbage`, `streetlight`, `sewage`, `park`, `noise`, `encroachment`, and a fallback `other`.

---

### Requirement 2: Real-Time Complaint Tracking

**User Story:** As a Citizen, I want to see the current status of my complaint and how it is progressing through the resolution pipeline, so that I always know what is happening without having to call anyone.

#### Acceptance Criteria

1. THE Portal SHALL provide a dedicated tracking page accessible via `/track/{grievance_id}` that displays the full details of a Grievance.
2. WHEN a Citizen visits the tracking page, THE Portal SHALL display a visual progress bar showing the percentage completion from `filed` to `resolved`.
3. THE Portal SHALL render a step indicator showing all five standard statuses (`filed`, `assigned`, `investigating`, `in_progress`, `resolved`) with the current step highlighted.
4. WHEN a Grievance has status `rejected` or `escalated`, THE Portal SHALL display a distinct visual treatment (red for rejected, orange for escalated) and show the reason.
5. THE Portal SHALL display the `expected_resolution` date when set, and highlight it in amber if the current date has passed the expected date without resolution.
6. WHEN a Citizen is on the tracking page, THE Portal SHALL automatically refresh the Grievance data every 30 seconds without requiring a manual page reload.
7. THE Portal SHALL display the assigned Officer's name (without personal contact details) once a Grievance reaches `assigned` status.
8. WHEN a Grievance is resolved, THE Portal SHALL display the `resolved_at` timestamp and the `resolution_notes` prominently.

---

### Requirement 3: Instant Notifications (SMS / Email / In-App)

**User Story:** As a Citizen, I want to receive instant notifications via my preferred channel (in-app, email, or SMS) whenever my complaint status changes, so that I am always informed without having to check the portal manually.

#### Acceptance Criteria

1. THE Notification_Service SHALL send an in-app notification to the Citizen whenever a Grievance they own or follow changes status.
2. WHEN a Grievance status changes to `assigned`, `investigating`, `in_progress`, `resolved`, `rejected`, `escalated`, or `closed`, THE Notification_Service SHALL dispatch notifications to the Citizen and all Followers of that Grievance.
3. WHERE email notifications are enabled (i.e., `EMAIL_NOTIFICATIONS_ENABLED=True` in settings), THE Notification_Service SHALL send a formatted HTML email to the Citizen's registered email address on every status change.
4. WHERE SMS notifications are enabled (i.e., `SMS_NOTIFICATIONS_ENABLED=True` in settings) and the Citizen has a verified `phone_number`, THE Notification_Service SHALL send an SMS to the Citizen's phone number on status changes to `resolved`, `rejected`, or `escalated`.
5. THE Notification_Service SHALL send a notification to the relevant department Officers when a new Grievance is filed and routed to their department.
6. WHEN an Officer posts an official comment on a Grievance, THE Notification_Service SHALL send an in-app notification to the Citizen who owns the Grievance.
7. THE Portal SHALL display unread notification count as a badge on the Navbar, updating every 15 seconds via polling.
8. WHEN a Citizen clicks a notification, THE Portal SHALL mark it as read and navigate to the relevant Grievance tracking page.
9. IF the SMS_Provider or Email_Provider returns an error, THEN THE Notification_Service SHALL log the error and continue without raising an exception that would interrupt the primary status-update flow.
10. THE Notification_Service SHALL NOT send duplicate notifications for the same status-change event to the same user.

---

### Requirement 4: Save / Follow Complaint

**User Story:** As a Citizen, I want to follow any public complaint (not just my own) so that I receive updates on issues that affect my neighbourhood, and I want to manage my followed complaints from a dedicated page.

#### Acceptance Criteria

1. THE Portal SHALL display a Follow / Unfollow toggle button on every Grievance tracking page, visible to all authenticated Citizens.
2. WHEN a Citizen clicks Follow, THE Portal SHALL create a `GrievanceFollow` record and immediately update the button state to "Following" without a page reload.
3. WHEN a Citizen clicks Unfollow, THE Portal SHALL delete the `GrievanceFollow` record and immediately update the button state to "Follow" without a page reload.
4. THE Portal SHALL display the total follower count next to the Follow button, updating optimistically on toggle.
5. THE Portal SHALL provide a "Saved / Followed Complaints" page at `/followed` listing all Grievances the Citizen follows, sorted by most recently updated.
6. WHEN a Citizen submits a new Grievance, THE Portal SHALL automatically create a Follow record for that Citizen on their own Grievance.
7. THE Portal SHALL allow a Citizen to unfollow a Grievance directly from the `/followed` page without navigating to the tracking page.
8. WHEN a Grievance the Citizen follows is updated, THE Notification_Service SHALL send the Citizen an in-app notification (per Requirement 3).

---

### Requirement 5: Image & Location-Based Complaint Upload

**User Story:** As a Citizen, I want to attach photos and pinpoint the exact location of the issue on a map when filing a complaint, so that Officers can quickly understand and locate the problem.

#### Acceptance Criteria

1. THE Portal SHALL allow a Citizen to upload up to 5 media files (images, videos, or PDFs) per Grievance, each up to 50 MB.
2. WHEN a Citizen uploads an image, THE Portal SHALL display a thumbnail preview before submission.
3. THE Portal SHALL provide an interactive Map_Picker (Leaflet.js) on the complaint submission form that allows the Citizen to drop a pin at the issue location.
4. WHEN a Citizen drops a pin on the Map_Picker, THE Portal SHALL capture the `latitude` and `longitude` coordinates and reverse-geocode them to auto-fill the address field using the Nominatim API.
5. WHEN a Citizen clicks "Use My Location", THE Portal SHALL request the browser's Geolocation API, place the pin at the detected coordinates, and reverse-geocode the address.
6. IF the browser denies geolocation permission, THEN THE Portal SHALL display a clear message and allow the Citizen to place the pin manually.
7. THE Portal SHALL store `latitude` and `longitude` on the Grievance model (already present) when coordinates are provided.
8. WHEN a Grievance has coordinates, THE Portal SHALL display a static map thumbnail on the tracking page showing the pin location.
9. THE Portal SHALL accept drag-and-drop file uploads in addition to click-to-browse.
10. IF a file exceeds 50 MB or is not an accepted type (image, video, PDF), THEN THE Portal SHALL display an inline error and reject the file without clearing other selected files.

---

### Requirement 6: Live Status Timeline

**User Story:** As a Citizen or Officer, I want to see a detailed, chronological timeline of every action taken on a complaint, so that there is full transparency and accountability throughout the resolution process.

#### Acceptance Criteria

1. THE Portal SHALL display a vertical timeline on the Grievance tracking page showing all `GrievanceUpdate` records in chronological order (oldest first).
2. EACH timeline entry SHALL display: the actor's name and role (Citizen / Officer / Admin), the old and new status (when applicable), the message, and the timestamp formatted as both absolute date-time and relative time (e.g., "2 hours ago").
3. WHEN a timeline entry is authored by an Officer or Admin, THE Portal SHALL visually distinguish it with an official badge and a different colour scheme from Citizen entries.
4. WHEN a Grievance status changes, THE Portal SHALL automatically create a `GrievanceUpdate` record with the actor, old status, new status, and a descriptive message.
5. THE Portal SHALL create a `GrievanceUpdate` record at Grievance creation time with the message including the AI routing result and confidence score.
6. WHEN a Grievance is assigned to an Officer, THE Portal SHALL create a `GrievanceUpdate` record naming the assigned Officer.
7. THE Portal SHALL display the timeline in a visually connected vertical layout with a line connecting consecutive entries.
8. WHEN there are more than 10 timeline entries, THE Portal SHALL show the 5 most recent by default and provide a "Show all" toggle to expand the full timeline.

---

### Requirement 7: Smart Duplicate Complaint Detection

**User Story:** As a Citizen, I want to be warned if a similar complaint has already been filed recently, so that I avoid creating duplicates and can instead follow the existing complaint.

#### Acceptance Criteria

1. WHEN a Citizen completes the title and description fields in the complaint form, THE Duplicate_Detector SHALL check for similar open Grievances and return results within 2 seconds.
2. THE Duplicate_Detector SHALL compare the new complaint against open Grievances (status not in `resolved`, `closed`, `rejected`) filed within the last 30 days.
3. THE Duplicate_Detector SHALL use a combination of: (a) same AI-classified category, and (b) title/description text similarity score ≥ 0.40 (using token overlap / Jaccard similarity) to identify potential duplicates.
4. WHEN potential duplicates are found, THE Portal SHALL display a non-blocking warning panel showing up to 3 similar Grievances with their ID, title, status, and a "Follow Instead" button.
5. WHEN a Citizen clicks "Follow Instead" on a duplicate suggestion, THE Portal SHALL follow that Grievance and navigate the Citizen to its tracking page.
6. WHEN potential duplicates are found, THE Portal SHALL allow the Citizen to dismiss the warning and proceed with filing a new Grievance.
7. THE Duplicate_Detector SHALL expose a `/api/grievances/check_duplicates/` endpoint accepting `title`, `description`, and `category` and returning a list of candidate Grievances with a similarity score.
8. IF no duplicates are found, THEN THE Portal SHALL proceed with the submission flow without displaying any warning.
9. THE Duplicate_Detector SHALL record the `duplicate_of` reference on a Grievance when the Citizen explicitly acknowledges a duplicate warning and still proceeds, for administrative reporting.

---

### Requirement 8: Feedback & Rating System

**User Story:** As a Citizen, I want to rate the resolution of my complaint and leave comments after it is resolved, so that the government can measure service quality and improve response times.

#### Acceptance Criteria

1. WHEN a Grievance reaches `resolved` or `closed` status and the Citizen has not yet submitted feedback, THE Portal SHALL display a prominent feedback prompt on the tracking page.
2. THE Portal SHALL allow the Citizen to submit a star rating from 1 to 5 and an optional text comment.
3. THE Portal SHALL include a binary "Satisfied with resolution" checkbox in the feedback form.
4. WHEN a Citizen submits feedback, THE Portal SHALL persist the `GrievanceFeedback` record and immediately hide the feedback prompt, replacing it with a read-only display of the submitted feedback.
5. THE Portal SHALL prevent a Citizen from submitting feedback more than once per Grievance (enforced at both API and UI level).
6. THE Portal SHALL prevent feedback submission for Grievances that are not yet `resolved` or `closed` (enforced at both API and UI level).
7. THE Admin Dashboard SHALL display aggregate feedback statistics: average rating per department, percentage of satisfied resolutions, and total feedback count.
8. WHEN an Officer views a Grievance they handled, THE Portal SHALL display the Citizen's feedback (if submitted) so the Officer can learn from it.
9. THE Portal SHALL send the Citizen an in-app notification prompting them to rate their experience when a Grievance is resolved.
10. THE Portal SHALL display the submitted feedback publicly on the Grievance tracking page (visible to all authenticated users) to promote transparency.
