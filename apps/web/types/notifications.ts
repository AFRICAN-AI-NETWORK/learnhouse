// Mirrors apps/api/src/db/notifications.py — keep these in sync by hand.

export type NotificationType =
  | 'assignment_reviewed'
  | 'retake_requested'
  | 'chapter_added'
  | 'activity_added'
  | 'app_update'

export interface Notification {
  id: number
  notification_uuid: string
  notification_type: NotificationType
  target_type: string
  target_id: number | null
  target_uuid: string | null
  title: string
  message: string
  metadata_json: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

/**
 * Payload pushed over the chat WebSocket by notification_service._push_in_app.
 * Deliberately lighter than `Notification` — no `id`/`is_read`, since it's a
 * best-effort real-time nudge, not the source of truth for list/read state.
 * (See GlobalChatContext's `activity_notification` listener.)
 */
export interface ActivityNotificationEvent {
  notification_uuid: string
  notification_type: NotificationType
  target_type: string
  target_id: number | null
  target_uuid: string | null
  title: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
}
