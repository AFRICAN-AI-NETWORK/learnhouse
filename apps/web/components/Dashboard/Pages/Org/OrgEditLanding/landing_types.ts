export interface LandingBackground {
  type: 'solid' | 'gradient' | 'image'
  color?: string
  colors?: Array<string>
  direction?: string
  image?: string
}

export interface LandingTestimonialContent {
  text: string
  author: string
}

export interface LandingImage {
  url: string
  alt: string
}

export interface LandingHeading {
  text: string
  color: string
  size: string
}

export interface LandingButton {
  text: string
  link: string
  color: string
  background: string
}

export interface LandingLogos {
  type: 'logos'
  title: string
  logos: LandingImage[]
}

export interface LandingUsers {
  user_uuid: string
  name: string
  description: string
  image_url: string
  username?: string
}

export interface LandingPeople {
  type: 'people'
  title: string
  people: LandingUsers[]
}

export interface LandingTextAndImageSection {
  type: 'text-and-image'
  title: string
  text: string
  flow: 'left' | 'right'
  image: LandingImage
  buttons: LandingButton[]
}

export interface LandingCourse {
  course_uuid: string
}

export interface LandingFeaturedCourses {
  type: 'featured-courses'
  courses: LandingCourse[]
  title: string
}

export interface LandingHeroSection {
  type: 'hero'
  title: string
  background: LandingBackground
  heading: LandingHeading
  subheading: LandingHeading
  buttons: LandingButton[]
  illustration?: {
    image: LandingImage
    position: 'left' | 'right'
    verticalAlign: 'top' | 'center' | 'bottom'
    size: 'small' | 'medium' | 'large'
  }
  contentAlign?: 'left' | 'center' | 'right'
}

export interface LandingTestimonial {
  text: string
  author: string
  role: string
  image_url?: string
}

export interface LandingTestimonials {
  type: 'testimonials'
  title: string
  testimonials: LandingTestimonial[]
}

export interface LandingMetric {
  label: string
  value: string
  suffix?: string
}

export interface LandingImpactMetrics {
  type: 'impact-metrics'
  title: string
  metrics: LandingMetric[]
}

export interface LandingCTA {
  type: 'cta'
  title: string
  description: string
  button: LandingButton
}

export type LandingSection =
  | LandingTextAndImageSection
  | LandingHeroSection
  | LandingLogos
  | LandingPeople
  | LandingFeaturedCourses
  | LandingTestimonials
  | LandingImpactMetrics
  | LandingCTA

export interface LandingObject {
  sections: LandingSection[]
  enabled?: boolean
}
