# Requirements Document

## Introduction

The Instant Notification System enhances the CivicRedress platform's existing in-app notification infrastructure with real-time delivery (WebSocket via Django Channels or SSE fallback), multi-channel dispatch (email and SMS, both feature-flagged), a full-page Notification Center, per-user notification preferences, and a paginated notification history. The system covers seven civic grievance lifecycle events and targets citizens, followers, officers, and admins as recipients.

---

## Glossary

- **Notification_System**: The end-to-end subsystem responsible for creating, delivering, and displaying notifications across all channels.
- **Notification**: A record containing a recipient user, title, message, notification type, read status, optional grievance reference, and timestamp.
- **Notification_Center**: The full-page React UI at `/notifications` that displays the user's complete notification history with filtering and bulk operations.
- **Notification_Preferences**: Per-user settings controlling opt-in/opt-out for email and SMS delivery per notification event type.
- **WebSocket_Consumer**: The Django Channels ASGI consumer that maintains a persistent WebSocket connection per authenticated user and pushes real-time notification payloads.
- **Channel_Layer**: The Django Channels in-memory or Redis-backed message broker used to route notifications from Django views to the correct WebSocket_Consumer.
- **SSE_Endpoint**: A Server-Sent Events HTTP endpoint used as a fallback when WebSocket is unavailable.
- **Email_Backend**: Django's configured email backend used to send HTML-formatted notification emails.
- **SMS_Provider**: A pluggable interface backed by an environment-variable-selected provider (Twilio or MSG91) for sending SMS alerts.
- **SLA**: Service Level Agreement — the maximum allowed time for a grievance to remain unresolved before a delay notification is triggered.
- **Citizen**: A registered platform user with role `citizen` who filed or follows a grievance.
- **Officer**: A verified platform user with role `officer` or `admin` assigned to a department.
- **Follower**: Any authenticated user who has followed a grievance via `GrievanceFollow`.
- **Grievance_Timeline**: A chronological view of all `GrievanceUpdate` records for a single grievance, displayed within the Notification_Center or grievance detail page.
- **Unread_Badge**: The numeric indicator on the navbar bell icon showing the count of unread notifications.
- **Push_Notification**: A browser-level Web Push API notification delivered outside the browser tab.

---

## Requirements

### Requirement 1: Grievance Submission Notification

**User Story:** As a citizen, I want to receive a notification when I submit a grievance, so that I have confirmation the system received it and know which department it was routed to.

#### Acceptance Criteria

1. WHEN a grievance is successfully created via the `GrievanceViewSet.create` endpoint, THE Notification_System SHALL create an in-app Notification of type `filed` for the submitting Citizen with the grievance ID and routed department in the message.
2. WHEN a grievance is successfully created, THE Notification_System SHALL create an in-app Notification of type `filed` for each verified Officer whose department matches the grievance's routed department, up to a maximum of five Officers.
3. IF the grievance creation fails validation, THEN THE Notification_System SHALL not create any Notification records.

---

### Requirement 2: Status Change Notifications

**User Story:** As a citizen or follower, I want to receive a notification for every status change on a grievance I care about, so that I stay informed without having to manually check.

#### Acceptance Criteria

1. WHEN a grievance status is updated to `investigating`, THE Notification_System SHALL send a Notification of type `in_progress` to the Citizen and to all Followers of that grievance.
2. WHEN a grievance status is updated to `resolved`, THE Notification_System SHALL send a Notification of type `resolved` to the Citizen and to all Followers of that grievance.
3. WHEN a grievance status is updated to `rejected`, THE Notification_System SHALL send a Notification of type `rejected` to the Citizen and to all Followers, including the rejection reason in the message body.
4. WHEN a grievance status is updated to `closed`, THE Notification_System SHALL send a Notification of type `resolved` to the Citizen and to all Followers.
5. WHEN a grievance status is updated to `escalated`, THE Notification_System SHALL send a Notification of type `escalated` to the Citizen and to all Followers.
6. WHEN a grievance status is updated to `assigned`, THE Notification_System SHALL send a Notification of type `assigned` to the Citizen.
7. IF a status update is attempted by a user whose role is not `officer` or `admin`, THEN THE Notification_System SHALL not create any Notification records for that attempt.

---

### Requirement 3: Document Request Notification

**User Story:** As a citizen, I want to receive a notification when an officer requests additional documents via a comment, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN an Officer or Admin posts an official comment on a grievance, THE Notification_System SHALL send a Notification of type `comment` to the Citizen who filed the grievance.
2. THE Notification_System SHALL include the grievance ID in the Notification's `grievance_id` field so the Citizen can navigate directly to the grievance.
3. IF the comment author is the same user as the Citizen who filed the grievance, THEN THE Notification_System SHALL not create a Notification for that comment.

---

### Requirement 4: SLA Breach (Delay) Notification

**User Story:** As a citizen, follower, and admin, I want to receive a notification when a grievance has exceeded its SLA deadline, so that delayed cases receive attention.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a management command `check_sla_breaches` that queries all grievances whose `expected_resolution` timestamp has passed and whose status is not `resolved`, `closed`, or `rejected`.
2. WHEN the `check_sla_breaches` command identifies a breached grievance, THE Notification_System SHALL send a Notification of type `escalated` to the Citizen, all Followers, and all Admin users.
3. THE Notification_System SHALL include the number of days overdue in the SLA breach Notification message.
4. WHEN the `check_sla_breaches` command runs, THE Notification_System SHALL record a `GrievanceUpdate` entry with `new_status` set to `escalated` and a message indicating SLA breach, to prevent duplicate breach notifications for the same grievance within the same day.
5. IF a grievance has already received an SLA breach Notification on the current calendar day, THEN THE Notification_System SHALL not send a duplicate breach Notification for that grievance.

---

### Requirement 5: Real-Time Delivery via WebSocket

**User Story:** As a user, I want notifications to appear instantly in my browser without waiting for a polling interval, so that I see updates the moment they happen.

#### Acceptance Criteria

1. THE Notification_System SHALL provide a Django Channels WebSocket endpoint at `ws/notifications/` that accepts authenticated connections using JWT token query-parameter authentication.
2. WHEN a Notification record is created for a user, THE Notification_System SHALL push the serialized Notification payload to that user's active WebSocket connection within 1 second of record creation.
3. WHEN a WebSocket message is received by the React frontend, THE Notification_System SHALL prepend the new Notification to the existing notifications list and increment the Unread_Badge count without requiring a page refresh.
4. WHILE a user has an active WebSocket connection, THE Notification_System SHALL maintain the connection with a heartbeat ping every 30 seconds to prevent idle disconnection.
5. IF the WebSocket connection is lost, THEN THE Notification_System SHALL attempt to reconnect with exponential backoff starting at 1 second, up to a maximum of 30 seconds between attempts.
6. WHERE the browser or network does not support WebSocket, THE Notification_System SHALL fall back to the existing 15-second polling mechanism.

---

### Requirement 6: Email Notifications

**User Story:** As a citizen, I want to receive email alerts for important grievance events, so that I stay informed even when I am not actively using the platform.

#### Acceptance Criteria

1. WHERE the `ENABLE_EMAIL_NOTIFICATIONS` feature flag is set to `True` in Django settings, THE Notification_System SHALL send an HTML-formatted email to the recipient user's registered email address for each Notification created.
2. WHEN an email notification is sent, THE Email_Backend SHALL use a reusable HTML template that includes the platform name, notification title, message body, grievance ID (if applicable), a direct link to the grievance, and an unsubscribe/preferences link.
3. IF the recipient user's `NotificationPreferences` record has `email_enabled` set to `False` for the relevant notification type, THEN THE Notification_System SHALL not send an email for that Notification.
4. IF the email delivery fails, THEN THE Notification_System SHALL log the failure with the recipient user ID and notification ID, and SHALL NOT raise an unhandled exception that interrupts the in-app notification creation.
5. THE Email_Backend SHALL send emails asynchronously using Celery to avoid blocking the HTTP request-response cycle.

---

### Requirement 7: SMS Notifications

**User Story:** As a citizen, I want to receive SMS alerts for critical grievance events, so that I am notified even without internet access.

#### Acceptance Criteria

1. WHERE the `ENABLE_SMS_NOTIFICATIONS` feature flag is set to `True` in Django settings, THE Notification_System SHALL send an SMS to the recipient user's registered `phone_number` for Notifications of type `filed`, `resolved`, `rejected`, and `escalated`.
2. THE SMS_Provider SHALL be selected by the `SMS_PROVIDER` environment variable, accepting values `twilio` or `msg91`, and SHALL implement a common `send_sms(phone_number, message)` interface.
3. IF the recipient user has no `phone_number` on record, THEN THE Notification_System SHALL skip SMS delivery for that user without raising an error.
4. IF the recipient user's `NotificationPreferences` record has `sms_enabled` set to `False` for the relevant notification type, THEN THE Notification_System SHALL not send an SMS for that Notification.
5. IF the SMS delivery fails, THEN THE Notification_System SHALL log the failure with the recipient user ID and notification ID, and SHALL NOT raise an unhandled exception that interrupts the in-app notification creation.
6. THE SMS_Provider SHALL send messages asynchronously using Celery to avoid blocking the HTTP request-response cycle.

---

### Requirement 8: Notification Preferences

**User Story:** As a citizen, I want to control which channels (email, SMS) I receive notifications on per event type, so that I only get alerts through the channels I prefer.

#### Acceptance Criteria

1. THE Notification_System SHALL maintain a `NotificationPreferences` model with a one-to-one relationship to the User model, storing boolean opt-in fields for email and SMS per notification type: `filed`, `assigned`, `in_progress`, `resolved`, `rejected`, `escalated`, `comment`, `info`.
2. WHEN a new User is created, THE Notification_System SHALL automatically create a `NotificationPreferences` record for that user with all email fields defaulting to `True` and all SMS fields defaulting to `False`.
3. THE Notification_System SHALL expose a REST endpoint `GET /api/notifications/preferences/` that returns the authenticated user's current `NotificationPreferences`.
4. THE Notification_System SHALL expose a REST endpoint `PATCH /api/notifications/preferences/` that allows the authenticated user to update any subset of their `NotificationPreferences` fields.
5. WHEN a `PATCH` request is received with invalid field names or non-boolean values, THE Notification_System SHALL return HTTP 400 with a descriptive error message.

---

### Requirement 9: Notification Center Page

**User Story:** As a user, I want a dedicated full-page notification center, so that I can review my complete notification history, filter by type, and manage read status in bulk.

#### Acceptance Criteria

1. THE Notification_System SHALL provide a React page at the `/notifications` route that displays the authenticated user's full notification history in reverse chronological order.
2. THE Notification_Center SHALL display filter tabs for: All, Unread, Filed, Assigned, In Progress, Resolved, Rejected, Escalated, Comment, and Info.
3. WHEN a filter tab is selected, THE Notification_Center SHALL display only Notifications matching the selected type or read status without a full page reload.
4. THE Notification_Center SHALL support paginated loading, fetching 20 Notifications per page, with a "Load more" control to append the next page.
5. THE Notification_Center SHALL display each Notification as a card containing: a type badge with color coding, the notification title, the message body, a relative timestamp (e.g. "2 hours ago"), and a link to the associated grievance when `grievance_id` is present.
6. THE Notification_Center SHALL provide a "Mark all as read" button that marks all currently visible unread Notifications as read in a single API call.
7. WHEN a single Notification card is clicked, THE Notification_Center SHALL mark that Notification as read and navigate to the associated grievance if `grievance_id` is present.
8. WHEN a new Notification is pushed via WebSocket, THE Notification_Center SHALL display a slide-in toast notification in the bottom-right corner of the screen for 4 seconds.
9. THE Notification_Center SHALL be fully responsive, adapting the card layout for mobile viewports below 640px width.

---

### Requirement 10: Paginated Notification API

**User Story:** As a frontend developer, I want a paginated notifications API, so that the Notification Center can load large histories efficiently.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a REST endpoint `GET /api/notifications/` that returns a paginated list of the authenticated user's Notifications, ordered by `created_at` descending, with a default page size of 20.
2. THE Notification_System SHALL accept `page` and `type` query parameters on `GET /api/notifications/` to support pagination and type-based filtering.
3. THE Notification_System SHALL accept an `unread` query parameter (`true`/`false`) on `GET /api/notifications/` to filter by read status.
4. WHEN the `type` query parameter is provided with an invalid notification type value, THE Notification_System SHALL return HTTP 400 with a descriptive error message.
5. THE Notification_System SHALL expose a REST endpoint `POST /api/notifications/{id}/mark_read/` that marks a single Notification as read and returns HTTP 200.
6. THE Notification_System SHALL expose a REST endpoint `POST /api/notifications/mark_all_read/` that marks all unread Notifications for the authenticated user as read and returns HTTP 200.

---

### Requirement 11: Grievance Timeline View

**User Story:** As a citizen, I want to see a clean chronological timeline of all updates on my grievance, so that I can understand the full history at a glance.

#### Acceptance Criteria

1. THE Notification_System SHALL provide a `GrievanceTimeline` React component that renders all `GrievanceUpdate` records for a grievance in ascending chronological order.
2. WHEN a `GrievanceUpdate` record has both `old_status` and `new_status` populated, THE GrievanceTimeline SHALL display a status transition indicator showing the old status, an arrow, and the new status.
3. THE GrievanceTimeline SHALL display the `performed_by` username, the `message`, and the formatted `timestamp` for each update entry.
4. THE GrievanceTimeline SHALL visually distinguish officer/admin updates from citizen updates using different icon or color treatments.
5. THE GrievanceTimeline SHALL be embeddable in both the grievance detail page and the Notification_Center page.

---

### Requirement 12: Browser Push Notifications (Optional)

**User Story:** As a citizen, I want to receive browser push notifications even when the platform tab is not active, so that I never miss a critical update.

#### Acceptance Criteria

1. WHERE the browser supports the Web Push API and the user has granted notification permission, THE Notification_System SHALL register a service worker and subscribe the user to push notifications using the VAPID protocol.
2. WHEN a Notification of type `filed`, `resolved`, `rejected`, or `escalated` is created for a subscribed user, THE Notification_System SHALL dispatch a Web Push message to that user's registered push subscription endpoint.
3. IF the user denies browser notification permission, THEN THE Notification_System SHALL not prompt again in the same session and SHALL continue delivering in-app and other channel notifications normally.
4. THE Notification_System SHALL expose a REST endpoint `POST /api/notifications/push_subscribe/` that stores the user's push subscription object (endpoint, keys) in a `PushSubscription` model.
5. THE Notification_System SHALL expose a REST endpoint `DELETE /api/notifications/push_subscribe/` that removes the user's stored push subscription.
