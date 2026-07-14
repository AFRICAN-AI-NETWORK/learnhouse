'use client'

import React, { useEffect, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUserCertificates } from '@services/courses/certifications'
import CertificatePreview from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { createRoot } from 'react-dom/client'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import CertificateExport from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificateExport'

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
  const org = useOrg() as any
  const [userCertificate, setUserCertificate] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const downloadCertificate = async () => {
    if (!userCertificate) return

    let captureContainer: HTMLDivElement | null = null
    let exportRoot: ReturnType<typeof createRoot> | null = null

    try {
      captureContainer = document.createElement('div')
      captureContainer.style.position = 'fixed'
      captureContainer.style.left = '-10000px'
      captureContainer.style.top = '0'
      captureContainer.style.background = '#ffffff'
      captureContainer.style.padding = '0'
      captureContainer.style.margin = '0'
      captureContainer.style.overflow = 'visible'
      captureContainer.style.width = 'fit-content'
      captureContainer.style.height = 'fit-content'
      document.body.appendChild(captureContainer)

      const certificationName =
        userCertificate?.certification?.config?.certification_name ||
        'Certificate'
      const certificationDescription =
        userCertificate?.certification?.config?.certification_description ||
        'Certification description will appear here...'
      const certificationType =
        userCertificate?.certification?.config?.certification_type ||
        'Course Completion'
      const certificateId =
        userCertificate?.certificate_user?.user_certification_uuid
      const studentName =
        `${session?.data?.user?.first_name || ''} ${session?.data?.user?.last_name || ''}`.trim() ||
        'Student Name'
      const instructorName =
        userCertificate?.certification?.config?.certificate_instructor ||
        'LearnHouse Instructor'
      const ceoName =
        userCertificate?.certification?.config?.certificate_ceo ||
        'LearnHouse CEO'
      const organizationName = org?.name || 'DEFAULT ORGANIZATION'
      const organizationLogoUrl = org?.logo_image
        ? getOrgLogoMediaDirectory(org.org_uuid, org.logo_image)
        : undefined
      const qrCodeValue = qrCodeLink || certificateId || 'LH-CERT'
      const qrCodeUrl = await QRCode.toDataURL(qrCodeValue, {
        width: 185,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
        type: 'image/png',
      })

      exportRoot = createRoot(captureContainer)
      exportRoot.render(
        <CertificateExport
          id={certificateId}
          studentName={studentName}
          certificationName={certificationName}
          certificationDescription={certificationDescription}
          certificationType={certificationType}
          certificatePattern={
            userCertificate?.certification?.config?.certificate_pattern
          }
          instructor={instructorName}
          orgName={organizationName}
          orgLogoUrl={organizationLogoUrl}
          ceo={ceoName}
          awardedDate={new Date(
            userCertificate.certificate_user.created_at
          ).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          qrCodeUrl={qrCodeUrl}
          gradePercentage={userCertificate?.certificate_user?.grade_percentage}
        />
      )

      // Wait for React to fully render the component tree.
      // A single rAF is insufficient — React batches renders and may need
      // several frames plus effect cycles (QR code, scale calc) to finish.
      const captureElement = await new Promise<HTMLElement>(
        (resolve, reject) => {
          let elapsed = 0
          const interval = 50
          const maxWait = 3000
          const check = () => {
            const el = captureContainer!.querySelector(
              '#certificate-export-root'
            ) as HTMLElement | null
            // Ensure the element exists AND has meaningful text content
            // (not just empty containers)
            if (el && el.innerText && el.innerText.trim().length > 20) {
              resolve(el)
              return
            }
            elapsed += interval
            if (elapsed >= maxWait) {
              if (el) {
                resolve(el) // Use whatever we have
              } else {
                reject(new Error('Certificate export element not found'))
              }
              return
            }
            setTimeout(check, interval)
          }
          // Start after one rAF to let React's first commit happen
          requestAnimationFrame(() => setTimeout(check, interval))
        }
      )

      await Promise.all(
        Array.from(captureElement.querySelectorAll('img')).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              })
        )
      )

      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      const captureWidth = Math.max(
        captureElement.scrollWidth,
        captureElement.offsetWidth,
        captureElement.clientWidth
      )
      const captureHeight = Math.max(
        captureElement.scrollHeight,
        captureElement.offsetHeight,
        captureElement.clientHeight
      )

      // Convert to PNG using html-to-image (native browser engine)
      const imgData = await toPng(captureElement, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: captureWidth,
        height: captureHeight,
        style: { margin: '0' },
      })

      const pdf = new jsPDF(
        captureWidth >= captureHeight ? 'landscape' : 'portrait',
        'mm',
        'a4'
      )

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const canvasWidth = captureWidth * 2
      const canvasHeight = captureHeight * 2

      const pxPerMm = 96 / 25.4
      const imgWidthMm = canvasWidth / pxPerMm
      const imgHeightMm = canvasHeight / pxPerMm

      const maxWidth = pdfWidth - 20
      const maxHeight = pdfHeight - 20

      const widthScale = maxWidth / imgWidthMm
      const heightScale = maxHeight / imgHeightMm
      const scale = Math.min(1, widthScale, heightScale)

      const finalImgWidth = imgWidthMm * scale
      const finalImgHeight = imgHeightMm * scale

      const x = (pdfWidth - finalImgWidth) / 2
      const y = (pdfHeight - finalImgHeight) / 2

      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight)

      const fileName = `${certificationName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf`
      pdf.save(fileName)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      exportRoot?.unmount()
      captureContainer?.remove()
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
              gradePercentage={
                userCertificate?.certificate_user?.grade_percentage
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
