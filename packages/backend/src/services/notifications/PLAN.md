# Notifications Module Upgrade Plan

## Goals
- Provide a unified notifications system supporting in-app bell, email delivery, and webhooks.
- Replace legacy business/external notification services with modular components.
- Support new event types (connections, certificates, subscriptions, account/security).
- Respect user preferences (per-channel, per-category, digests) and provide analytics.

## Phase 1 – Foundations
1. **Event Catalog**
   - Create `notifications/types/notificationEventType.ts` enumerating core events (connection.requested, certificate.minted, subscription.renewal, subscription.cancellation, account.securityAlert, etc.).
   - Define `NotificationCategory`, `NotificationPriority`, and extend `NotificationEvent` with metadata.
2. **Recipient Resolution**
   - Add helper service to resolve contact info (email, webhook) from `businessId`/`manufacturerId`.
   - Cache results where appropriate (reuse existing cache service).
3. **Template Registry Migration**
   - Port HTML/text templates from legacy services into `templates/` submodules grouped by domain.
   - Include in-app copy for each event (short bell message + optional CTA URL).
4. **Channel Enhancements**
   - Update `email.channel` to integrate with actual provider (SendGrid/SES) configurable via env.
   - Add webhook payload schemas and error handling (retry/backoff via queue).

## Phase 2 – Feature Parity with Legacy Services
1. **Inbox + Analytics Parity**
   - Ensure `InboxService` exposes everything legacy controller expects (list, unread, read, delete, stats).
   - Add REST-facing DTO mappers if required.
2. **Outbound Notification Workflows**
   - Move plan/subscription/account email helpers into outbound service, switching to template registry.
   - Introduce `TriggersService` mappings from event types to template + channels + notification creation.
3. **Preferences & Categories**
   - Expand preference documents to include per-category overrides and digest cadence.
   - Provide APIs for updating preferences and computing effective settings.
4. **Digest Scheduling**
   - Flesh out `DigestDataService` to queue pending digest entries.
   - Implement `DigestSchedulerService` integration with job queue (BullMQ) for daily/weekly sends.

## Phase 3 – Integration & Controllers
1. **Controller Migration**
   - Update `notification.controller.ts` to consume new services.
   - Remove direct usage of legacy business/external services.
2. **Event Producers**
   - Emit `NotificationEvent` from existing services (connections, certificates, subscriptions, auth) via `eventHandlerService`.
   - Add helper wrappers for synchronous vs queued execution depending on event criticality.
3. **Dependency Injection**
   - Register notifications module with container service for easy access.
   - Provide typed helper `getNotificationsServices()` and update consumers.
4. **Removal of Legacy Services**
   - Once controllers & producers are migrated, delete `business/notification.service.ts` and redundant email helpers in `external/notifications.service.ts`.

## Phase 4 – Dashboard & Analytics Enhancements
1. **Real-time Bell Support**
   - Add API for unread count + latest notifications (with optional `since` parameter).
   - Integrate websocket or SSE hooks for instant updates (optional stretch).
2. **Notification Feed UX**
   - Provide CTA URLs and icons per category for frontend rendering.
   - Support pagination, filters (type/category/unread) in API responses.
3. **Analytics & Reporting**
   - Track channel delivery metrics (success/failure counts) and expose via analytics service.
   - Optionally log audit entries for compliance-sensitive notifications.

## Phase 5 – Testing & Observability
1. **Unit Tests**
   - Tests for template renderers, inbox operations, preferences resolution, and delivery logic (mock transport).
2. **Integration Tests**
   - End-to-end tests using in-memory Mongo, verifying event -> notification -> channel dispatch.
3. **Monitoring**
   - Add structured logging around deliveries and digests.
   - Configure alerting if queue backlog grows or channel failures spike.

## Deliverables & Milestones
- **Milestone A:** Foundations complete, templates migrated, new events defined.
- **Milestone B:** Controllers switched to new module, legacy services removed.
- **Milestone C:** Dashboard bell + analytics endpoints live.
- **Milestone D:** Test suite & monitoring covering notifications pipeline.
