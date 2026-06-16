import React from 'react'
import ContactSection from '@components/Landings/LandingContact'
import GlobalFooter from '@components/Landings/GlobalFooter'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white pt-24">
      {/* We add pt-24 to account for the navbar and give some breathing room */}
      <div className="max-w-7xl mx-auto mb-24">
        <ContactSection />
      </div>
      <GlobalFooter />
    </div>
  )
}
