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
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-3 sm:px-4 pb-28 sm:pb-0 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <ReactConfetti
            width={width}
            height={height}
            numberOfPieces={200}
            recycle={false}
            colors={['#6366f1', '#10b981', '#3b82f6']}
          />
        </div>

        <div className="bg-card rounded-lg sm:rounded-2xl p-4 sm:p-8 nice-shadow max-w-4xl w-full space-y-4 sm:space-y-6 relative z-10">
          <div className="flex flex-col items-center space-y-4 sm:space-y-6">
            {thumbnailImage && (
              <img
                className="w-[150px] h-[86px] sm:w-[200px] sm:h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}

            <div className="bg-emerald-100 p-3 sm:p-4 rounded-full">
              <Trophy className="w-10 h-10 sm:w-16 sm:h-16 text-emerald-600" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-card-foreground">
            {t('courses.congratulations')}
          </h1>

          <p className="text-sm sm:text-xl text-muted-foreground">
            {t('courses.successfully_completed')}
            <span className="font-semibold text-card-foreground">
              {' '}
              {courseName}
            </span>
          </p>

          <p className="text-sm sm:text-base text-muted-foreground/80">
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
              <h2 className="text-lg sm:text-2xl font-semibold text-card-foreground">
                {t('certificate.your_certificate')}
              </h2>
              <div
                className="mx-auto w-full max-w-2xl"
                id="certificate-preview"
              >
                <div id="certificate-content" className="mx-auto w-full">
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
              <div className="grid gap-2 sm:flex sm:justify-center sm:space-x-4">
                <button
                  onClick={downloadCertificate}
                  className="inline-flex items-center justify-center space-x-2 bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-md sm:rounded-full hover:bg-green-700 transition duration-200 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{t('certificate.download_certificate')}</span>
                </button>
                <Link
                  href={getUriWithOrg(
                    orgslug,
                    `/certificates/${userCertificate.certificate_user.user_certification_uuid}/verify`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-md sm:rounded-full hover:bg-blue-700 transition duration-200 text-sm sm:text-base"
                >
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
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

          <div className="pt-2 sm:pt-6">
            <Link
              href={getUriWithOrg(
                orgslug,
                `/course/${courseUuid.replace('course_', '')}`
              )}
              className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 bg-gray-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-md sm:rounded-full hover:bg-gray-700 transition duration-200 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('courses.back_to_course')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  } else {
    // Show progress and encouragement for incomplete course
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-3 sm:px-4 pb-28 sm:pb-0">
        <div className="bg-card rounded-lg sm:rounded-2xl p-4 sm:p-8 nice-shadow max-w-2xl w-full space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center space-y-4 sm:space-y-6">
            {thumbnailImage && (
              <img
                className="w-[150px] h-[86px] sm:w-[200px] sm:h-[114px] rounded-lg shadow-md object-cover"
                src={`${getCourseThumbnailMediaDirectory(
                  org?.org_uuid,
                  courseUuid,
                  thumbnailImage
                )}`}
                alt={courseName}
              />
            )}

            <div className="bg-blue-100 p-3 sm:p-4 rounded-full">
              <Target className="w-10 h-10 sm:w-16 sm:h-16 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-card-foreground">
            {t('courses.keep_going')}
          </h1>

          <p className="text-sm sm:text-xl text-muted-foreground">
            {t('courses.making_great_progress')}
            <span className="font-semibold text-card-foreground">
              {' '}
              {courseName}
            </span>
          </p>

          {progressInfo && (
            <div className="bg-muted rounded-lg p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <span className="text-base sm:text-lg font-semibold text-foreground">
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

          <p className="text-sm sm:text-base text-muted-foreground/80">
            {t('courses.keep_going_description')}
          </p>

          <div className="pt-2 sm:pt-6">
            <Link
              href={getUriWithOrg(
                orgslug,
                `/course/${courseUuid.replace('course_', '')}`
              )}
              className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-md sm:rounded-full hover:bg-blue-700 transition duration-200 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('courses.continue_learning')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

export default CourseEndView
