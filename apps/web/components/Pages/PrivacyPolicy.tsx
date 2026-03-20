'use client'
import React, { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { mainDoc, categories, docs } from '@/data/privacy-policy'

const PrivacyPolicy: React.FC = () => {
  const [active, setActive] = useState<string>('all')
  const filteredDocs =
    active === 'all' ? docs : docs.filter((d) => d.category === active)

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Header Section */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex items-center justify-center">
          <ShieldCheck size={40} className="text-blue-600 mr-2" />
          <span className="text-2xl font-black text-blue-600">
            AFRICAN AI NETWORK
          </span>
        </div>
        <h1 className="text-4xl font-bold mb-2">
          Privacy and Policy Documentation Hub
        </h1>
        <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
          All official AAN policies, guidelines, and legal documents in one
          place. Browse, filter, and access any document instantly.
        </h2>
        <a
          href={mainDoc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          View Main Privacy Policy
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActive(cat.key)}
            className={`px-4 py-2 rounded-full font-bold text-sm border transition-colors ${active === cat.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Section Heading */}
      <h2 className="text-2xl font-bold mb-6 text-center">
        All Policy Documents
      </h2>

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDocs.map((doc, idx) => {
          const Icon = doc.icon
          return (
            <a
              key={idx}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow hover:shadow-lg transition group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon
                  size={28}
                  className="text-blue-600 group-hover:text-blue-800"
                />
                <span className="text-lg font-bold">{doc.title}</span>
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                {doc.desc}
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 mt-2">
                {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default PrivacyPolicy
