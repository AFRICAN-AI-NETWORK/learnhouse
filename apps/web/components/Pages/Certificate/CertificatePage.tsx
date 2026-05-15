'use client'

import React, { useEffect, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUserCertificates } from '@services/courses/certifications'
import CertificatePreview from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface CertificatePageProps {
  orgslug: string
  courseid: string
  qrCodeLink: string
}

const CertificatePage: React.FC<CertificatePageProps> = ({
  orgslug,
  courseid,
  qrCodeLink,
}) => {
  const session = useLHSession() as any
  const [userCertificate, setUserCertificate] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user certificate
  useEffect(() => {
    const fetchCertificate = async () => {
      if (!session?.data?.tokens?.access_token) {
        setError('Authentication required to view certificate')
        setIsLoading(false)
        return
      }

      try {
        const cleanCourseId = courseid.replace('course_', '')
        const result = await getUserCertificates(
          `course_${cleanCourseId}`,
          session.data.tokens.access_token
        )

        if (result.success && result.data && result.data.length > 0) {
          setUserCertificate(result.data[0])
        } else {
          setError('No certificate found for this course')
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching certificate:', error)
        setError('Failed to load certificate. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCertificate()
  }, [courseid, session?.data?.tokens?.access_token])

  // Generate PDF using canvas
  const downloadCertificate = async () => {
    if (!userCertificate) return

    try {
      // Get the existing certificate element
      const certificateElement = document.getElementById('certificate-content')
      if (!certificateElement) {
        throw new Error('Certificate element not found')
      }

      // Add a small delay to ensure everything is rendered (like QR code)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Convert to canvas using the live element
      const canvas = await html2canvas(certificateElement, {
        scale: 2, // 2 is enough for high quality without crashing browsers
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Fixed width for consistent layout during capture
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF('landscape', 'mm', 'a4')

      // Calculate dimensions to fit the certificate on A4 while maintaining aspect ratio
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const aspectRatio = canvasWidth / canvasHeight

      // Maximize the certificate on the page with 10mm margins
      let imgWidth = pdfWidth - 20
      let imgHeight = imgWidth / aspectRatio

      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20
        imgWidth = imgHeight * aspectRatio
      }

      // Center the image
      const x = (pdfWidth - imgWidth) / 2
      const y = (pdfHeight - imgHeight) / 2

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)

      // Save the PDF
      const fileName = `${userCertificate.certification.config.certification_name.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf`
      pdf.save(fileName)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Certificate Not Available
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href={getUriWithOrg(orgslug, '') + `/course/${courseid}`}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Course</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!userCertificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              No Certificate Found
            </h2>
            <p className="text-yellow-600 mb-4">
              No certificate is available for this course. Please contact your
              instructor for more information.
            </p>
            <Link
              href={getUriWithOrg(orgslug, '') + `/course/${courseid}`}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Course</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={getUriWithOrg(orgslug, '') + `/course/${courseid}`}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Course</span>
          </Link>

          <div className="flex items-center space-x-4">
            <button
              onClick={downloadCertificate}
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition duration-200"
            >
              <Download className="w-5 h-5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Certificate Display */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="max-w-2xl mx-auto" id="certificate-content">
            <CertificatePreview
              certificationName={
                userCertificate.certification.config.certification_name
              }
              certificationDescription={
                userCertificate.certification.config.certification_description
              }
              certificationType={
                userCertificate.certification.config.certification_type
              }
              certificatePattern={
                userCertificate.certification.config.certificate_pattern
              }
              certificateInstructor={
                userCertificate.certification.config.certificate_instructor
              }
              certificateCeo={
                userCertificate.certification.config.certificate_ceo
              }
              certificateId={
                userCertificate.certificate_user.user_certification_uuid
              }
              awardedDate={new Date(
                userCertificate.certificate_user.created_at
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              qrCodeLink={qrCodeLink}
              studentName={
                `${session?.data?.user?.first_name || ''} ${session?.data?.user?.last_name || ''}`.trim() ||
                'Student Name'
              }
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">
            Click "Download PDF" to generate and download a high-quality
            certificate PDF.
          </p>
          <p className="text-sm">
            The PDF includes a scannable QR code for certificate verification.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CertificatePage
