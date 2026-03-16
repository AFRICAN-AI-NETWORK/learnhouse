'use client'

import React from 'react'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useOrg } from '@components/Contexts/OrgContext'

export default function PrivacyPolicyPage() {
  const org = useOrg() as any
  const orgName = org?.name || 'African AI Network'

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-4 md:px-0">
      <GeneralWrapperStyled>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-12 group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <header className="mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {orgName} Privacy Policy
            </h1>
            <p className="text-zinc-500">
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </header>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                1. Information We Collect
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We collect information you provide directly to us when you
                create an account, participate in any interactive features of
                our services, fill out a form, or communicate with us. This may
                include your name, email address, and any other information you
                choose to provide.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                2. How We Use Your Information
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We use the information we collect to provide, maintain, and
                improve our services, to process transactions, and to send you
                confirmations and notifications. We may also use the information
                to respond to your comments and questions and provide customer
                service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                3. Data Security
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We take reasonable measures to help protect information about
                you from loss, theft, misuse and unauthorized access,
                disclosure, alteration and destruction. However, no data
                transmission over the internet or wireless network can be
                guaranteed to be 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                4. Sharing of Information
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We do not share your personal information with third parties
                except as described in this Privacy Policy. We may share
                information with vendors, consultants, and other service
                providers who need access to such information to carry out work
                on our behalf.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                5. Your Choices
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You may update, correct or delete your account information at
                any time by logging into your online account. If you wish to
                delete your account, please contact us, but note that we may
                retain certain information as required by law or for legitimate
                business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                6. Changes to This Policy
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We may change this Privacy Policy from time to time. If we make
                changes, we will notify you by revising the date at the top of
                the policy and, in some cases, we may provide you with
                additional notice.
              </p>
            </section>

            <section className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                Contact Us
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                If you have any questions about this Privacy Policy, please
                contact us at:
                <br />
                <a
                  href="mailto:support@africanainetwork.com"
                  className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline"
                >
                  support@africanainetwork.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </GeneralWrapperStyled>
    </div>
  )
}
