# Requirements Document

## Introduction

This document defines requirements for the Admin Portal feature set of the civic grievance redressal platform. The platform already has a Django REST backend (`grievances` app) and a React frontend with a shared `AdminDashboard.js` and a basic `Analytics.js`. The features below elevate the admin experience with a centralized smart monitoring dashboard, real-time analytics and geographic heatmaps, AI routing control, SLA and escalation tracking, department performance insights, complaint trend prediction, role-based access management, and exportable reports.

These features are admin-only (role = `admin`) unless otherwise noted, and build on top of the existing `/api/grievances/dashboard_stats/` endpoint, the `ai_router.py` keyword-scoring module, and the existing role/department model.

---

## Glossary

- **Admin_Portal**: The React frontend views and associated backend APIs accessible exclusively to users with role = `admin`.
- **Admin**: A user with role = `admin` who has cross-department visibility and full system control.
- **Officer**: A user with role = `officer` scoped to a single department.
- **Citizen**: A registered end-user who files grievances.
- **KPI_Card**: A summary metric tile on the monitoring dashboard showing a single key performance indicator (e.g., total open grievances, SLA breach count).
- **SLA**: Service Level Agreement — the maximum number of calendar days allowed to resolve a grievance in a given category before it is considered breached.
- **SLA_Config**: A per-category SLA definition stored in the backend (e.g., electricity = 3 days, road = 7 days).
- **SLA_Breach**: A grievance whose age (current date minus `submitted_at`) exceeds the SLA_Config for its category and whose status is not `resolved`, `closed`, or `rejected`.
- **Escalation_Queue**: The list of grievances with status = `escalated`, displayed prominently on the monitoring dashboard.
- **Heatmap**: A geographic visualization overlaid on a map showing complaint density by pincode or lat/lng coordinates.
- **AI_Router**: The existing `ai_router.py` keyword-scoring module (`CATEGORY_KEYWORDS`, `PRIORITY_KEYWORDS`, `DEPARTMENT_MAP`).
- **AI_Config**: The admin-editable representation of `CATEGORY_KEYWORDS` and `PRIORITY_KEYWORDS` stored in the database and loaded by the AI_Router at runtime.
- **Department_Performance**: Aggregated metrics per department: resolution rate, average resolution time, satisfaction score, and SLA compliance rate.
- **Satisfaction_Score**: The average `rating` from `GrievanceFeedback` records for a department's resolved grievances.
- **Trend_Prediction**: A simple moving-average forecast of complaint volume per category for the next 4 weeks, computed from weekly historical counts.
- **Report**: A downloadable file (CSV or JSON) containing filtered grievance data or department performance metrics.
- **Role_Manager**: The admin UI for promoting citizens to officers, assigning departments, deactivating accounts, and reviewing pending `OfficerApplication` records.
- **Grievance**: A civic complaint submitted by a Citizen, identified by a unique `grievance_id`.
- **GrievanceUpdate**: A record of every status change or action taken on a Grievance.
- **GrievanceFeedback**: A citizen-submitted rating (1–5) and comment after a Grievance is resolved.
- **OfficerApplication**: A pending request from a citizen to become a verified officer, containing employee ID, department, official email, and ID card.

---

## Requirements

### Requirement 1: Centralized Smart Monitoring Dashboard

**User Story:** As an admin, I want a single-screen monitoring dashboard with live KPI cards, SLA breach alerts, and an escalation queue, so that I can immediately understand the health of the entire grievance system without navigating multiple pages.

#### Acceptance Criteria

1. THE Admin_Portal SHALL display a monitoring dashboard at `/admin/dashboard` accessible only to users with role = `admin`.
2. THE Admin_Portal SHALL render KPI_Cards showing: total open grievances, grievances filed today, total SLA_Breach count, total escalated count, system-wide resolution rate (resolved / total as a percentage), and average resolution time in days.
3. WHEN the monitoring dashboard is open, THE Admin_Portal SHALL automatically refresh all KPI_Card values every 60 seconds without a full page reload.
4. THE Admin_Portal SHALL display the Escalation_Queue as a prioritized list showing grievance ID, title, category, department, escalation reason, and time since escalation, sorted by oldest escalation first.
5. WHEN the Escalation_Queue contains one or more items, THE Admin_Portal SHALL display a red badge with the count on the dashboard navigation element.
6. THE Admin_Portal SHALL display a SLA breach alert panel listing up to 10 of the most overdue SLA_Breach grievances, showing grievance ID, category, days overdue, and assigned officer (if any).
7. WHEN an admin clicks a grievance in the Escalation_Queue or SLA breach panel, THE Admin_Portal SHALL navigate to the grievance detail page.
8. THE Backend SHALL expose a `/api/admin/monitoring_stats/` endpoint (admin-only) returning: open count, today count, SLA breach count, escalated count, resolution rate, average resolution days, top 10 SLA breaches, and the full escalation queue.

---

### Requirement 2: Real-Time Analytics and Heatmaps

**User Story:** As an admin, I want enhanced analytics charts and a geographic heatmap of complaint density, so that I can identify problem hotspots and track trends visually.

#### Acceptance Criteria

1. THE Admin_Portal SHALL enhance the existing `Analytics.js` page to include a geographic heatmap panel showing complaint density by pincode or lat/lng coordinates using a Leaflet.js map with a heatmap overlay.
2. THE Backend SHALL expose a `/api/admin/heatmap_data/` endpoint (admin-only) returning a list of objects with `latitude`, `longitude`, `pincode`, and `count` for all grievances that have coordinates or a pincode, optionally filtered by `category`, `status`, and `date_from`/`date_to` query parameters.
3. WHEN the heatmap panel is displayed, THE Admin_Portal SHALL render each data point as a circle marker whose radius and colour intensity scale with the complaint count at that location.
4. THE Admin_Portal SHALL display a time-series line chart showing total grievances filed per week for the last 12 weeks, broken down by category.
5. THE Admin_Portal SHALL display a stacked bar chart showing grievances by status per department, so admins can compare department workloads at a glance.
6. WHEN an admin selects a date range using a date-range picker, THE Admin_Portal SHALL re-fetch and re-render all analytics charts and the heatmap for the selected period.
7. THE Backend `/api/admin/heatmap_data/` endpoint SHALL aggregate multiple grievances at the same pincode into a single data point with a summed count.
8. IF a grievance has neither `latitude`/`longitude` nor `pincode`, THEN THE Backend SHALL exclude it from the heatmap dataset.

---

### Requirement 3: AI Model and Routing Control

**User Story:** As an admin, I want to view and edit the AI routing keywords and test live classification, so that I can tune the AI_Router to improve categorization accuracy without touching source code.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide an AI Control panel at `/admin/ai-control` accessible only to users with role = `admin`.
2. THE Backend SHALL expose a `/api/admin/ai_config/` endpoint (admin-only) that returns the current `CATEGORY_KEYWORDS` and `PRIORITY_KEYWORDS` as a JSON object.
3. WHEN an admin loads the AI Control panel, THE Admin_Portal SHALL fetch and display the current keyword lists for each category and each priority level in an editable UI (e.g., tag-input fields).
4. WHEN an admin adds or removes a keyword and saves, THE Backend SHALL persist the updated keyword lists to an `AIConfig` database model and return the updated config.
5. WHEN the `AIConfig` model has a saved configuration, THE AI_Router SHALL load keywords from the `AIConfig` model instead of the hardcoded `CATEGORY_KEYWORDS` and `PRIORITY_KEYWORDS` dicts.
6. THE Admin_Portal SHALL provide a live test input where an admin can enter a title and description, click "Test Classification", and see the returned `category`, `department`, `priority`, `confidence`, and `keywords_matched` without saving a grievance.
7. WHEN an admin tests a classification, THE Admin_Portal SHALL call the existing `/api/grievances/ai_classify/` endpoint and display the result inline within 1 second.
8. THE Admin_Portal SHALL display the `DEPARTMENT_MAP` (category → department routing) as a read-only reference table alongside the keyword editor.
9. IF an admin attempts to save an empty keyword list for any category, THEN THE Backend SHALL return a 400 error with message "Each category must have at least one keyword".
10. THE Backend SHALL record a `GrievanceUpdate`-style audit log entry whenever an admin modifies the AI_Config, capturing the admin's user ID, timestamp, and a summary of changes.

---

### Requirement 4: SLA and Escalation Tracking

**User Story:** As an admin, I want to configure SLA deadlines per category and receive automatic breach alerts, so that no grievance falls through the cracks past its deadline.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide an SLA Configuration panel where an admin can set the SLA deadline (in calendar days) for each grievance category.
2. THE Backend SHALL expose a `/api/admin/sla_config/` endpoint (admin-only) supporting GET (retrieve current SLA_Config) and PUT (update SLA_Config) operations.
3. THE Backend SHALL store SLA_Config as an `SLAConfig` model with fields `category` (unique) and `days` (positive integer), defaulting to: electricity = 3, water = 5, road = 7, garbage = 3, streetlight = 5, sewage = 3, park = 10, noise = 7, encroachment = 14, other = 7.
4. WHEN an admin saves an SLA_Config update, THE Backend SHALL validate that `days` is a positive integer between 1 and 365 and return a 400 error with message "SLA days must be between 1 and 365" if the value is out of range.
5. THE Backend SHALL expose a `/api/admin/sla_breaches/` endpoint (admin-only) returning all grievances where the age in days exceeds the SLA_Config for their category and status is not in `resolved`, `closed`, `rejected`.
6. THE Admin_Portal SLA panel SHALL display a breach list showing grievance ID, category, days overdue (age minus SLA), assigned officer, and a direct link to the grievance.
7. WHEN a grievance becomes an SLA_Breach (age crosses the configured threshold), THE Backend SHALL send an in-app notification to all Admin users with the message "SLA breach: {grievance_id} is {days_overdue} day(s) overdue in {category}".
8. THE Admin_Portal SHALL display a per-category SLA compliance rate (percentage of grievances resolved within SLA) on the SLA panel.
9. WHEN an admin views the Escalation_Queue, THE Admin_Portal SHALL allow the admin to de-escalate a grievance by setting its status to `in_progress` with an optional note, calling the existing `update_status` endpoint.
10. THE Backend SLA breach notification SHALL be triggered at most once per grievance per day to avoid notification spam.

---

### Requirement 5: Department Performance Insights

**User Story:** As an admin, I want to see per-department performance metrics including resolution rate, average resolution time, satisfaction score, and a leaderboard, so that I can identify underperforming departments and take corrective action.

#### Acceptance Criteria

1. THE Backend SHALL expose a `/api/admin/department_performance/` endpoint (admin-only) returning, for each department: total assigned, total resolved, resolution rate (resolved / total as a percentage), average resolution time in days, Satisfaction_Score (average feedback rating or null), SLA compliance rate, and officer count.
2. THE Admin_Portal SHALL display a Department Performance page at `/admin/performance` showing a leaderboard table ranking departments by resolution rate (highest first).
3. THE Admin_Portal performance page SHALL display a bar chart comparing average resolution time across departments.
4. THE Admin_Portal performance page SHALL display each department's Satisfaction_Score as a star rating (1–5) with the total number of ratings received.
5. WHEN a department has a resolution rate below 60% with more than 5 total grievances, THE Admin_Portal SHALL highlight that department row in the leaderboard with an amber warning indicator.
6. THE Admin_Portal performance page SHALL display a per-officer breakdown within each department showing: officer name, total assigned, total resolved, resolution rate, and Satisfaction_Score.
7. THE Backend `/api/admin/department_performance/` endpoint SHALL support an optional `date_from` and `date_to` query parameter to filter grievances by submission date.
8. THE Admin_Portal performance page SHALL allow the admin to filter the view by a custom date range using a date-range picker, re-fetching data on change.

---

### Requirement 6: Complaint Trend Prediction

**User Story:** As an admin, I want to see a simple forecast of complaint volume by category for the next 4 weeks, so that I can proactively allocate department resources before demand spikes.

#### Acceptance Criteria

1. THE Backend SHALL expose a `/api/admin/trend_prediction/` endpoint (admin-only) that computes and returns a 4-week complaint volume forecast per category.
2. THE Backend trend prediction SHALL use a simple moving average over the last 8 weeks of weekly complaint counts per category to produce the 4-week forecast.
3. THE Backend SHALL also return the historical weekly counts (last 12 weeks) per category alongside the forecast, so the frontend can render both on the same chart.
4. THE Admin_Portal SHALL display the trend prediction as a line chart with two series per category: historical weekly counts (solid line) and forecasted counts (dashed line), for the top 5 categories by total volume.
5. WHEN the forecasted count for any category in any future week exceeds 150% of the 8-week moving average, THE Admin_Portal SHALL display a "Demand Spike" warning badge next to that category on the trend chart.
6. THE Admin_Portal trend chart SHALL include a category selector allowing the admin to toggle individual categories on or off.
7. THE Backend trend prediction endpoint SHALL return a `week_over_week_growth` field per category showing the percentage change between the most recent completed week and the prior week.
8. IF fewer than 4 weeks of historical data exist for a category, THEN THE Backend SHALL return the available data and mark the forecast as `low_confidence: true` for that category.

---

### Requirement 7: Role-Based Access Management

**User Story:** As an admin, I want to manage user roles — promote citizens to officers, assign departments, deactivate accounts, and review officer applications — from a single management interface, so that I have full control over who can access what.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide a Role Management page at `/admin/roles` accessible only to users with role = `admin`.
2. THE Admin_Portal Role Management page SHALL display a searchable, paginated list of all users showing: username, email, role, department (if officer), account status (active/inactive), and date joined.
3. WHEN an admin promotes a citizen to officer, THE Admin_Portal SHALL present a form requiring: department selection (from `DEPARTMENT_CHOICES`) and employee ID, then call a backend endpoint to update the user's role, department, employee ID, and `is_verified` flag.
4. THE Backend SHALL expose a `/api/admin/manage_user/` endpoint (admin-only) accepting a `user_id`, `action` (one of: `promote_to_officer`, `demote_to_citizen`, `deactivate`, `reactivate`), and optional `department` and `employee_id` fields.
5. WHEN an admin deactivates a user account, THE Backend SHALL set `is_active = False` on the User record and return a 200 response; the deactivated user SHALL receive an in-app notification.
6. WHEN an admin reactivates a user account, THE Backend SHALL set `is_active = True` on the User record and return a 200 response.
7. THE Admin_Portal Role Management page SHALL display a dedicated section for pending `OfficerApplication` records, showing applicant name, department, employee ID, official email, ID card link, and submission date.
8. WHEN an admin approves an `OfficerApplication`, THE Backend SHALL set the application status to `approved`, update the user's role to `officer`, set `is_verified = True`, assign the department and employee ID from the application, and send an in-app notification to the applicant.
9. WHEN an admin rejects an `OfficerApplication`, THE Backend SHALL set the application status to `rejected`, record the rejection reason, and send an in-app notification to the applicant with the reason.
10. IF an admin attempts to deactivate their own account, THEN THE Backend SHALL return a 400 error with message "Admins cannot deactivate their own account".
11. THE Admin_Portal SHALL display a confirmation dialog before executing any destructive role action (deactivate, demote).

---

### Requirement 8: Exportable Reports and Analytics

**User Story:** As an admin, I want to export filtered grievance data and department performance reports as CSV or JSON files, so that I can share data with stakeholders and perform offline analysis.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide an Export panel on the Analytics page allowing the admin to configure and download reports.
2. THE Backend SHALL expose a `/api/admin/export_grievances/` endpoint (admin-only) that returns grievance data as a downloadable CSV or JSON file based on an `format` query parameter (`csv` or `json`).
3. THE `/api/admin/export_grievances/` endpoint SHALL support the following filter query parameters: `status`, `category`, `department`, `priority`, `date_from`, `date_to`, and `pincode`.
4. THE exported grievance CSV SHALL include the following fields: `grievance_id`, `title`, `description`, `category`, `department`, `priority`, `status`, `citizen_username`, `assigned_officer_username`, `submitted_at`, `resolved_at`, `resolution_notes`, `ai_confidence`, `pincode`, `address`.
5. THE Backend SHALL expose a `/api/admin/export_department_report/` endpoint (admin-only) that returns a department performance summary as CSV or JSON, including: department name, total grievances, resolved count, resolution rate, average resolution time, satisfaction score, and SLA compliance rate.
6. WHEN an admin requests a CSV export, THE Backend SHALL set the `Content-Disposition` header to `attachment; filename="grievances_{date}.csv"` so the browser triggers a file download.
7. THE Admin_Portal Export panel SHALL display a date-range picker and filter dropdowns (status, category, department, priority) before the admin initiates a download.
8. WHEN an export request returns zero records, THE Backend SHALL still return a valid empty CSV or JSON file with headers/keys intact rather than an error response.
9. THE Backend SHALL limit CSV/JSON exports to a maximum of 10,000 records per request and return a 400 error with message "Export limit exceeded: maximum 10,000 records per export. Apply filters to narrow the result." if the filtered count exceeds this limit.
10. THE Admin_Portal SHALL display the record count matching the current filters before the admin clicks download, so the admin can adjust filters if the count exceeds the export limit.
