import React, { useMemo, useEffect, useState } from 'react'
import ReactConfetti from 'react-confetti'
import {
  Trophy,
  ArrowLeft,
  BookOpen,
  Target,
  Download,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { useWindowSize } from 'usehooks-ts'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUserCertificates } from '@services/courses/certifications'
import CertificatePreview from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview'
import CertificateExport from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificateExport'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { createRoot } from 'react-dom/client'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

interface CourseEndViewProps {
  courseName: string
  orgslug: string
  courseUuid: string
  thumbnailImage: string
  course: any
  trailData: any
}

const CourseEndView: React.FC<CourseEndViewProps> = ({
  courseName,
  orgslug,
  courseUuid,
  thumbnailImage,
  course,
  trailData,
}) => {
  const { t, i18n } = useTranslation()
  const { width, height } = useWindowSize()
  const org = useOrg() as any
  const session = useLHSession() as any
  const [userCertificate, setUserCertificate] = useState<any>(null)
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  const qrCodeLink = userCertificate?.certificate_user?.user_certification_uuid
    ? getUriWithOrg(
        orgslug,
        `/certificates/${userCertificate.certificate_user.user_certification_uuid}/verify`
      )
    : ''

  // Check if course is actually completed
  const isCourseCompleted = useMemo(() => {
    if (!trailData || !course) return false

    // Flatten all activities
    const allActivities = course.chapters.flatMap((chapter: any) =>
      chapter.activities.map((activity: any) => ({
        ...activity,
        chapterId: chapter.id,
      }))
    )

    // Check if all activities are completed
    const isActivityDone = (activity: any) => {
      const cleanCourseUuid = course.course_uuid?.replace('course_', '')
      const run = trailData?.runs?.find((run: any) => {
        const cleanRunCourseUuid = run.course?.course_uuid?.replace(
          'course_',
          ''
        )
        return cleanRunCourseUuid === cleanCourseUuid
      })

      if (run) {
        return run.steps.find(
          (step: any) =>
            step.activity_id === activity.id && step.complete === true
        )
      }
      return false
    }

    const totalActivities = allActivities.length
    const completedActivities = allActivities.filter((activity: any) =>
      isActivityDone(activity)
    ).length
    return totalActivities > 0 && completedActivities === totalActivities
  }, [trailData, course])

  // Fetch user certificate when course is completed
  useEffect(() => {
    const fetchUserCertificate = async () => {
      if (!isCourseCompleted) return

      if (!session?.data?.tokens?.access_token) {
        setCertificateError(t('auth.authenticate_to_contribute')) // Reusing an auth error key
        return
      }

      setIsLoadingCertificate(true)
      setCertificateError(null)
      try {
        const cleanCourseUuid = courseUuid.replace('course_', '')
        const result = await getUserCertificates(
          `course_${cleanCourseUuid}`,
          session.data.tokens.access_token
        )

        if (result.success && result.data && result.data.length > 0) {
          setUserCertificate(result.data[0])
        } else {
          setCertificateError(t('certificate.no_certificate'))
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching user certificate:', error)
        setCertificateError(t('certificate.failed_load_certificates'))
      } finally {
        setIsLoadingCertificate(false)
      }
    }

    fetchUserCertificate()
  }, [isCourseCompleted, courseUuid, session?.data?.tokens?.access_token, t])

  // Generate PDF using canvas
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
        courseName ||
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
          instructor={instructorName}
          orgName={organizationName}
          ceo={ceoName}
          awardedDate={new Date(
            userCertificate.certificate_user.created_at
          ).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          qrCodeUrl={qrCodeUrl}
        />
      )

      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

      const captureElement = captureContainer.querySelector(
        '#certificate-export-root'
      ) as HTMLElement | null
      if (!captureElement)
        throw new Error('Certificate export element not found')

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

      // Convert to canvas using the live element
      const canvas = await html2canvas(captureElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        width: captureWidth,
        height: captureHeight,
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF(
        canvas.width >= canvas.height ? 'landscape' : 'portrait',
        'mm',
        'a4'
      )

      // Calculate dimensions to fit the certificate on A4 while maintaining aspect ratio
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const aspectRatio = canvasWidth / canvasHeight

      // Convert canvas px -> mm (assume 96 DPI) and scale to fit A4 with 10mm margins
      const pxPerMm = 96 / 25.4
      let imgWidthMm = canvasWidth / pxPerMm
      let imgHeightMm = canvasHeight / pxPerMm

      const maxWidth = pdfWidth - 20
      const maxHeight = pdfHeight - 20

      const widthScale = maxWidth / imgWidthMm
      const heightScale = maxHeight / imgHeightMm
      const scale = Math.min(1, widthScale, heightScale)

      const finalImgWidth = imgWidthMm * scale
      const finalImgHeight = imgHeightMm * scale

      // Center the image
      const x = (pdfWidth - finalImgWidth) / 2
      const y = (pdfHeight - finalImgHeight) / 2

      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight)

      // Save the PDF
      const fileName = `${certificationName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf`
      pdf.save(fileName)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating PDF:', error)
      toast.error(
        t(
          'certificate.failed_generate_pdf',
          'Failed to generate PDF. Please try again.'
        )
      )
    } finally {
      exportRoot?.unmount()
      captureContainer?.remove()
    }
  }

  // Calculate progress for incomplete courses
  const progressInfo = useMemo(() => {
    if (!trailData || !course || isCourseCompleted) return null

    const allActivities = course.chapters.flatMap((chapter: any) =>
      chapter.activities.map((activity: any) => ({
        ...activity,
        chapterId: chapter.id,
      }))
    )

    const isActivityDone = (activity: any) => {
      const cleanCourseUuid = course.course_uuid?.replace('course_', '')
      const run = trailData?.runs?.find((run: any) => {
        const cleanRunCourseUuid = run.course?.course_uuid?.replace(
          'course_',
          ''
        )
        return cleanRunCourseUuid === cleanCourseUuid
      })

      if (run) {
        return run.steps.find(
          (step: any) =>
            step.activity_id === activity.id && step.complete === true
        )
      }
      return false
    }

    const totalActivities = allActivities.length
    const completedActivities = allActivities.filter((activity: any) =>
      isActivityDone(activity)
    ).length
    const progressPercentage = Math.round(
      (completedActivities / totalActivities) * 100
    )

    return {
      completed: completedActivities,
      total: totalActivities,
      percentage: progressPercentage,
    }
  }, [trailData, course, isCourseCompleted])

  if (isCourseCompleted) {
    // Show congratulations for completed course
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <ReactConfetti
            width={width}
            height={height}
            numberOfPieces={200}
            recycle={false}
            colors={['#6366f1', '#10b981', '#3b82f6']}
          />
        </div>

        <div className="bg-card rounded-2xl p-8 nice-shadow max-w-4xl w-full space-y-6 relative z-10">
          <div className="flex flex-col items-center space-y-6">
            {thumbnailImage && (
              <img
                className="w-[200px] h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}

            <div className="bg-emerald-100 p-4 rounded-full">
              <Trophy className="w-16 h-16 text-emerald-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-card-foreground">
            {t('courses.congratulations')}
          </h1>

          <p className="text-xl text-muted-foreground">
            {t('courses.successfully_completed')}
            <span className="font-semibold text-card-foreground">
              {' '}
              {courseName}
            </span>
          </p>

          <p className="text-muted-foreground/80">
            {t('certificate.dedication_message')}
          </p>

          {isLoadingCertificate ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {t('certificate.loading_certificate')}
              </span>
            </div>
          ) : certificateError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">{certificateError}</p>
            </div>
          ) : userCertificate ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-card-foreground">
                {t('certificate.your_certificate')}
              </h2>
              <div className="max-w-2xl mx-auto" id="certificate-preview">
                <div id="certificate-content">
                  <CertificatePreview
                    certificationName={
                      userCertificate.certification.config.certification_name
                    }
                    certificationDescription={
                      userCertificate.certification.config
                        .certification_description
                    }
                    certificationType={
                      userCertificate.certification.config.certification_type
                    }
                    certificatePattern={
                      userCertificate.certification.config.certificate_pattern
                    }
                    certificateInstructor={
                      userCertificate.certification.config
                        .certificate_instructor
                    }
                    certificateCeo={
                      userCertificate.certification.config.certificate_ceo
                    }
                    certificateId={
                      userCertificate.certificate_user.user_certification_uuid
                    }
                    awardedDate={new Date(
                      userCertificate.certificate_user.created_at
                    ).toLocaleDateString(
                      i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                    qrCodeLink={qrCodeLink}
                    studentName={
                      `${session?.data?.user?.first_name || ''} ${session?.data?.user?.last_name || ''}`.trim() ||
                      'Student Name'
                    }
                  />
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={downloadCertificate}
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>{t('certificate.download_certificate')}</span>
                </button>
                <Link
                  href={getUriWithOrg(
                    orgslug,
                    `/certificates/${userCertificate.certificate_user.user_certification_uuid}/verify`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition duration-200"
                >
                  <Shield className="w-5 h-5" />
                  <span>{t('certificate.verify_certificate')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-6">
              <p className="text-muted-foreground">
                {t('certificate.no_certificate_available')}
              </p>
            </div>
          )}

          <div className="pt-6">
            <Link
              href={getUriWithOrg(
                orgslug,
                `/course/${courseUuid.replace('course_', '')}`
              )}
              className="inline-flex items-center space-x-2 bg-gray-800 text-white px-6 py-3 rounded-full hover:bg-gray-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('courses.back_to_course')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  } else {
    // Show progress and encouragement for incomplete course
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="bg-card rounded-2xl p-8 nice-shadow max-w-2xl w-full space-y-6">
          <div className="flex flex-col items-center space-y-6">
            {thumbnailImage && (
              <img
                className="w-[200px] h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}

            <div className="bg-blue-100 p-4 rounded-full">
              <Target className="w-16 h-16 text-blue-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-card-foreground">
            {t('courses.keep_going')}
          </h1>

          <p className="text-xl text-muted-foreground">
            {t('courses.making_great_progress')}
            <span className="font-semibold text-card-foreground">
              {' '}
              {courseName}
            </span>
          </p>

          {progressInfo && (
            <div className="bg-muted rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg font-semibold text-foreground">
                  {t('courses.course_progress')}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {t('courses.progress')}
                  </span>
                  <span className="font-semibold text-card-foreground">
                    {progressInfo.percentage}%
                  </span>
                </div>

                <div className="w-full bg-background rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressInfo.percentage}%` }}
                  ></div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {t('courses.completed_of', {
                    completed: progressInfo.completed,
                    total: progressInfo.total,
                  })}
                </div>
              </div>
            </div>
          )}

          <p className="text-muted-foreground/80">
            {t('courses.keep_going_description')}
          </p>

          <div className="pt-6">
            <Link
              href={getUriWithOrg(
                orgslug,
                `/course/${courseUuid.replace('course_', '')}`
              )}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('courses.continue_learning')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

export default CourseEndView
