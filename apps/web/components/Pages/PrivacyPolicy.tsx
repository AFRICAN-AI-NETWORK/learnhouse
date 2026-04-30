'use client'
import React, { useState } from 'react'
import { docs } from '@/data/privacy-policy'
import LandingNavbar from '../Landings/LandingNavbar'
import { useOrg } from '@components/Contexts/OrgContext'
import { useParams } from 'next/navigation'

const PrivacyPolicy: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const org = useOrg() as any
  const params = useParams() as { orgslug?: string }

  const selectedDoc = docs[selectedIdx]
  const orgslug = params?.orgslug || 'aan'

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx)
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <LandingNavbar org={org} orgslug={orgslug} variant="policy" />

      <div className="max-w-5xl mx-auto pt-[80px] md:pt-[100px] pb-8 px-4 md:px-2">
        {/* MOBILE TOP BAR */}
        <div className="md:hidden mb-6">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-between border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-3 text-sm bg-white dark:bg-zinc-900"
          >
            <span>{selectedDoc.title}</span>
            <span>☰</span>
          </button>
        </div>

        {/* MOBILE DRAWER */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-72 bg-white dark:bg-zinc-900 h-full p-6 overflow-y-auto shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Documents</h2>

              <nav className="flex flex-col">
                {docs.map((doc, idx) => (
                  <button
                    key={doc.title}
                    onClick={() => handleSelect(idx)}
                    className={`text-left py-3 text-sm border-b border-transparent ${
                      selectedIdx === idx
                        ? 'text-sky-500 font-medium'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {doc.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 min-h-[400px] mt-4">
          {/* Sidebar (desktop only) */}
          <aside className="hidden md:block md:w-64 flex-shrink-0 mt-12">
            <nav className="flex flex-col">
              {docs.map((doc, idx) => (
                <button
                  key={doc.title}
                  onClick={() => handleSelect(idx)}
                  className={`text-left py-3 text-sm border-b border-transparent ${
                    selectedIdx === idx
                      ? 'text-sky-500 font-medium'
                      : 'text-zinc-800 dark:text-zinc-200 hover:text-sky-500'
                  }`}
                >
                  {doc.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 w-full">
            {selectedDoc ? (
              <div className="max-w-full md:max-w-2xl">
                <h1 className="text-2xl md:text-3xl font-bold text-[#2e5175] dark:text-white mb-5">
                  {selectedDoc.title}
                </h1>

                <p className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed mb-6">
                  {selectedDoc.desc}
                </p>

                <p className="flex items-center gap-2 text-base">
                  <span>👉</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Read the full
                  </span>
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 hover:underline"
                  >
                    {selectedDoc.title}
                  </a>
                </p>
              </div>
            ) : (
              <div className="text-zinc-500 dark:text-zinc-400 py-12">
                <p>Document not found.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}

export default PrivacyPolicy
