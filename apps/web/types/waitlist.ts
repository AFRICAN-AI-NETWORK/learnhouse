// Waitlist feature types and enums

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  WAITLIST = 'WAITLIST',
  WAITLIST_ACTIVATED = 'WAITLIST_ACTIVATED',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum WaitlistStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SCHEDULED = 'SCHEDULED',
}

export interface WaitlistConfig {
  id: number
  waitlist_uuid: string
  org_id: number
  name: string
  description?: string
  interest_category: string
  launch_datetime: string // ISO 8601
  status: WaitlistStatus
  total_registrations: number
  emails_sent_count: number
  batch_size: number
  batch_delay_seconds: number
  creation_date: string
  update_date: string
  activation_date?: string
}

export interface WaitlistConfigCreate {
  org_id: number
  name: string
  interest_category: string
  launch_datetime: string
  description?: string
  batch_size?: number
  batch_delay_seconds?: number
}

export interface WaitlistCourseItem {
  course_id: number
  course_uuid: string
  name: string
  description: string
  thumbnail_image?: string
  is_free: boolean
  price?: number
  currency?: string
}

export interface WaitlistCoursePreference {
  id: number
  user_id: number
  course_id: number
  waitlist_config_id: number
  course_name: string // denormalized for display
}

export interface WaitlistRegistrationPayload {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  bio: string
  org_slug: string
  org_id: number
  selected_course_ids: number[]
  is_waitlist: boolean
  waitlist_interest: string
}
