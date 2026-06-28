import React, { useEffect, useState, useRef } from 'react'
import { Award, CheckCircle, QrCode, Building, User, Hash } from 'lucide-react'
import QRCode from 'qrcode'
import { useOrg } from '@components/Contexts/OrgContext'
import { getOrgLogoMediaDirectory } from '@services/media/media'

interface CertificatePreviewProps {
  certificationName: string
  certificationDescription: string
  certificationType: string
  certificatePattern: string
  certificateInstructor?: string
  certificateId?: string
  awardedDate?: string
  qrCodeLink?: string
  qrCodeUrl?: string
  studentName?: string
  certificateCeo?: string
  orgName?: string
  orgLogoUrl?: string
  gradePercentage?: number | string | null
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  certificationName,
  certificationDescription,
  certificationType,
  certificatePattern,
  certificateInstructor,
  certificateId,
  awardedDate,
  qrCodeLink,
  qrCodeUrl: providedQrCodeUrl,
  studentName,
  certificateCeo,
  orgName,
  orgLogoUrl,
  gradePercentage,
}) => {
  const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState<string>('')
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const CERT_NATURAL_WIDTH = 672
  const org = useOrg() as any

  // Generate QR code
  useEffect(() => {
    if (providedQrCodeUrl) {
      return
    }

    const generateQRCode = async () => {
      try {
        const certificateData =
          qrCodeLink || (certificateId ? `${certificateId}` : 'LH-CERT')
        const qrUrl = await QRCode.toDataURL(certificateData, {
          width: 185,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
          type: 'image/png',
        })
        setGeneratedQrCodeUrl(qrUrl)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error generating QR code:', error)
      }
    }

    generateQRCode()
  }, [certificateId, providedQrCodeUrl, qrCodeLink])

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const available = containerRef.current.offsetWidth
        setScale(
          available < CERT_NATURAL_WIDTH ? available / CERT_NATURAL_WIDTH : 1
        )
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // Function to get theme colors for each pattern
  const getPatternTheme = (pattern: string) => {
    switch (pattern) {
      case 'royal':
        return {
          primary: 'text-amber-700',
          secondary: 'text-amber-600',
          icon: 'text-amber-600',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          hex: {
            primary: '#b45309',
            secondary: '#d97706',
            icon: '#d97706',
            bg: '#fffbeb',
            border: '#fde68a',
            gradient: ['#fffbeb', '#fef3c7'],
          },
        }
      case 'tech':
        return {
          primary: 'text-cyan-700',
          secondary: 'text-cyan-600',
          icon: 'text-cyan-600',
          badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          hex: {
            primary: '#0e7490',
            secondary: '#0891b2',
            icon: '#0891b2',
            bg: '#ecfeff',
            border: '#a5f3fc',
            gradient: ['#ecfeff', '#cffafe'],
          },
        }
      case 'nature':
        return {
          primary: 'text-green-700',
          secondary: 'text-green-600',
          icon: 'text-green-600',
          badge: 'bg-green-50 text-green-700 border-green-200',
          hex: {
            primary: '#15803d',
            secondary: '#16a34a',
            icon: '#16a34a',
            bg: '#f0fdf4',
            border: '#bbf7d0',
            gradient: ['#f0fdf4', '#dcfce7'],
          },
        }
      case 'geometric':
        return {
          primary: 'text-purple-700',
          secondary: 'text-purple-600',
          icon: 'text-purple-600',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          hex: {
            primary: '#7e22ce',
            secondary: '#9333ea',
            icon: '#9333ea',
            bg: '#faf5ff',
            border: '#e9d5ff',
            gradient: ['#faf5ff', '#f3e8ff'],
          },
        }
      case 'vintage':
        return {
          primary: 'text-orange-700',
          secondary: 'text-orange-600',
          icon: 'text-orange-600',
          badge: 'bg-orange-50 text-orange-700 border-orange-200',
          hex: {
            primary: '#c2410c',
            secondary: '#ea580c',
            icon: '#ea580c',
            bg: '#fff7ed',
            border: '#fed7aa',
            gradient: ['#fff7ed', '#ffedd5'],
          },
        }
      case 'waves':
        return {
          primary: 'text-blue-700',
          secondary: 'text-blue-600',
          icon: 'text-blue-600',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          hex: {
            primary: '#1d4ed8',
            secondary: '#2563eb',
            icon: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
            gradient: ['#eff6ff', '#dbeafe'],
          },
        }
      case 'minimal':
        return {
          primary: 'text-gray-700',
          secondary: 'text-gray-600',
          icon: 'text-gray-600',
          badge: 'bg-gray-50 text-gray-700 border-gray-200',
          hex: {
            primary: '#374151',
            secondary: '#4b5563',
            icon: '#4b5563',
            bg: '#f9fafb',
            border: '#e5e7eb',
            gradient: ['#f9fafb', '#f3f4f6'],
          },
        }
      case 'professional':
        return {
          primary: 'text-slate-700',
          secondary: 'text-slate-600',
          icon: 'text-slate-600',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          hex: {
            primary: '#334155',
            secondary: '#475569',
            icon: '#475569',
            bg: '#f8fafc',
            border: '#e2e8f0',
            gradient: ['#f8fafc', '#f1f5f9'],
          },
        }
      case 'academic':
        return {
          primary: 'text-indigo-700',
          secondary: 'text-indigo-600',
          icon: 'text-indigo-600',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          hex: {
            primary: '#4338ca',
            secondary: '#4f46e5',
            icon: '#4f46e5',
            bg: '#eef2ff',
            border: '#c7d2fe',
            gradient: ['#eef2ff', '#e0e7ff'],
          },
        }
      case 'modern':
        return {
          primary: 'text-blue-700',
          secondary: 'text-blue-600',
          icon: 'text-blue-600',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          hex: {
            primary: '#1d4ed8',
            secondary: '#2563eb',
            icon: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
            gradient: ['#eff6ff', '#dbeafe'],
          },
        }
      default:
        return {
          primary: 'text-gray-700',
          secondary: 'text-gray-600',
          icon: 'text-gray-600',
          badge: 'bg-gray-50 text-gray-700 border-gray-200',
          hex: {
            primary: '#374151',
            secondary: '#4b5563',
            icon: '#4b5563',
            bg: '#f9fafb',
            border: '#e5e7eb',
            gradient: ['#f9fafb', '#f3f4f6'],
          },
        }
    }
  }

  // Function to render different certificate patterns
  const renderCertificatePattern = (pattern: string) => {
    switch (pattern) {
      case 'royal':
        return (
          <>
            {/* Royal ornate border with crown elements */}
            <div className="absolute inset-3 border-4 border-amber-200 rounded-lg opacity-60"></div>
            <div className="absolute inset-4 border-2 border-amber-300 rounded-md opacity-40"></div>

            {/* Crown-like decorations in corners */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
              <div
                className="w-8 h-4 opacity-50"
                style={{
                  backgroundColor: theme.hex?.border,
                  clipPath:
                    'polygon(0% 100%, 20% 0%, 40% 100%, 60% 0%, 80% 100%, 100% 0%, 100% 100%)',
                }}
              ></div>
            </div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 rotate-180">
              <div
                className="w-8 h-4 opacity-50"
                style={{
                  backgroundColor: theme.hex?.border,
                  clipPath:
                    'polygon(0% 100%, 20% 0%, 40% 100%, 60% 0%, 80% 100%, 100% 0%, 100% 100%)',
                }}
              ></div>
            </div>

            {/* Royal background pattern */}
            <div className="absolute inset-0 opacity-3">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 25% 25%, #f59e0b 2px, transparent 2px), radial-gradient(circle at 75% 75%, #f59e0b 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              ></div>
            </div>
          </>
        )

      case 'tech':
        return (
          <>
            {/* Tech circuit board borders */}
            <div className="absolute inset-3 border-2 border-cyan-200 opacity-50"></div>

            {/* Circuit-like corner elements */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-300 opacity-60"></div>
            <div className="absolute top-3 left-5 w-2 h-2 bg-cyan-300 opacity-60"></div>
            <div className="absolute top-5 left-3 w-2 h-2 bg-cyan-300 opacity-60"></div>

            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-300 opacity-60"></div>
            <div className="absolute top-3 right-5 w-2 h-2 bg-cyan-300 opacity-60"></div>
            <div className="absolute top-5 right-3 w-2 h-2 bg-cyan-300 opacity-60"></div>

            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-300 opacity-60"></div>
            <div className="absolute bottom-3 left-5 w-2 h-2 bg-cyan-300 opacity-60"></div>
            <div className="absolute bottom-5 left-3 w-2 h-2 bg-cyan-300 opacity-60"></div>

            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-300 opacity-60"></div>
            <div className="absolute bottom-3 right-5 w-2 h-2 bg-cyan-300 opacity-60"></div>
            <div className="absolute bottom-5 right-3 w-2 h-2 bg-cyan-300 opacity-60"></div>

            {/* Tech grid background */}
            <div className="absolute inset-0 opacity-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${theme.hex?.secondary} 1px, transparent 1px), linear-gradient(0deg, ${theme.hex?.secondary} 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                }}
              ></div>
            </div>
          </>
        )

      case 'nature':
        return (
          <>
            {/* Nature organic border */}
            <div className="absolute inset-3 border-2 border-green-200 rounded-2xl opacity-50"></div>

            {/* Leaf-like decorations */}
            <div className="absolute top-2 left-2 w-4 h-6 bg-green-200 opacity-50 rounded-full transform rotate-45"></div>
            <div className="absolute top-2 left-4 w-3 h-4 bg-green-300 opacity-40 rounded-full transform rotate-12"></div>

            <div className="absolute top-2 right-2 w-4 h-6 bg-green-200 opacity-50 rounded-full transform -rotate-45"></div>
            <div className="absolute top-2 right-4 w-3 h-4 bg-green-300 opacity-40 rounded-full transform -rotate-12"></div>

            <div className="absolute bottom-2 left-2 w-4 h-6 bg-green-200 opacity-50 rounded-full transform -rotate-45"></div>
            <div className="absolute bottom-2 left-4 w-3 h-4 bg-green-300 opacity-40 rounded-full transform -rotate-12"></div>

            <div className="absolute bottom-2 right-2 w-4 h-6 bg-green-200 opacity-50 rounded-full transform rotate-45"></div>
            <div className="absolute bottom-2 right-4 w-3 h-4 bg-green-300 opacity-40 rounded-full transform rotate-12"></div>

            {/* Organic background pattern */}
            <div className="absolute inset-0 opacity-3">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(ellipse at 30% 30%, #10b981 1px, transparent 1px), radial-gradient(ellipse at 70% 70%, #10b981 0.5px, transparent 0.5px)`,
                  backgroundSize: '12px 8px',
                }}
              ></div>
            </div>
          </>
        )

      case 'geometric':
        return (
          <>
            {/* Geometric angular borders */}
            <div
              className="absolute inset-2 border-2 border-purple-200 opacity-50"
              style={{
                clipPath:
                  'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
            ></div>

            {/* Geometric corner elements */}
            <div className="absolute top-1 left-1 w-6 h-6 border-2 border-purple-300 opacity-60 transform rotate-45"></div>
            <div className="absolute top-1 right-1 w-6 h-6 border-2 border-purple-300 opacity-60 transform rotate-45"></div>
            <div className="absolute bottom-1 left-1 w-6 h-6 border-2 border-purple-300 opacity-60 transform rotate-45"></div>
            <div className="absolute bottom-1 right-1 w-6 h-6 border-2 border-purple-300 opacity-60 transform rotate-45"></div>

            {/* Abstract geometric shapes */}
            <div className="absolute top-1/4 left-1 w-2 h-8 bg-purple-200 opacity-30 transform rotate-12"></div>
            <div className="absolute top-1/4 right-1 w-2 h-8 bg-purple-200 opacity-30 transform -rotate-12"></div>
            <div className="absolute bottom-1/4 left-1 w-2 h-8 bg-purple-200 opacity-30 transform -rotate-12"></div>
            <div className="absolute bottom-1/4 right-1 w-2 h-8 bg-purple-200 opacity-30 transform rotate-12"></div>

            {/* Geometric background */}
            <div className="absolute inset-0 opacity-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(45deg, #8b5cf6 25%, transparent 25%), linear-gradient(-45deg, #8b5cf6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #8b5cf6 75%), linear-gradient(-45deg, transparent 75%, #8b5cf6 75%)`,
                  backgroundSize: '6px 6px',
                }}
              ></div>
            </div>
          </>
        )

      case 'vintage':
        return (
          <>
            {/* Art deco style borders */}
            <div className="absolute inset-2 border-2 border-orange-200 opacity-50"></div>
            <div className="absolute inset-3 border border-orange-300 opacity-40"></div>

            {/* Art deco corner decorations */}
            <div
              className="absolute top-2 left-2 w-8 h-8 border-2 border-orange-300 opacity-50"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 100%)',
              }}
            ></div>
            <div
              className="absolute top-2 right-2 w-8 h-8 border-2 border-orange-300 opacity-50"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 100%, 0 50%)',
              }}
            ></div>
            <div
              className="absolute bottom-2 left-2 w-8 h-8 border-2 border-orange-300 opacity-50"
              style={{
                clipPath: 'polygon(0 0, 50% 0, 100% 50%, 100% 100%, 0 100%)',
              }}
            ></div>
            <div
              className="absolute bottom-2 right-2 w-8 h-8 border-2 border-orange-300 opacity-50"
              style={{
                clipPath: 'polygon(0 50%, 50% 0, 100% 0, 100% 100%, 0 100%)',
              }}
            ></div>

            {/* Art deco sunburst pattern */}
            <div className="absolute inset-0 opacity-3">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, ${theme.hex?.secondary} 0deg, ${theme.hex?.secondary} 2deg, transparent 2deg, transparent 8deg)`,
                  backgroundSize: '100% 100%',
                }}
              ></div>
            </div>
          </>
        )

      case 'waves':
        return (
          <>
            {/* Flowing wave borders */}
            <div className="absolute inset-2 border-2 border-blue-200 rounded-3xl opacity-50"></div>

            {/* Wave decorations */}
            <div
              className="absolute top-2 left-0 right-0 h-4 opacity-30"
              style={{
                background: `radial-gradient(ellipse at center, #3b82f6 30%, transparent 30%)`,
                backgroundSize: '20px 8px',
              }}
            ></div>
            <div
              className="absolute bottom-2 left-0 right-0 h-4 opacity-30"
              style={{
                background: `radial-gradient(ellipse at center, #3b82f6 30%, transparent 30%)`,
                backgroundSize: '20px 8px',
              }}
            ></div>

            {/* Side wave patterns */}
            <div
              className="absolute left-2 top-0 bottom-0 w-4 opacity-30"
              style={{
                background: `radial-gradient(ellipse at center, #3b82f6 30%, transparent 30%)`,
                backgroundSize: '8px 20px',
              }}
            ></div>
            <div
              className="absolute right-2 top-0 bottom-0 w-4 opacity-30"
              style={{
                background: `radial-gradient(ellipse at center, #3b82f6 30%, transparent 30%)`,
                backgroundSize: '8px 20px',
              }}
            ></div>

            {/* Wave background */}
            <div className="absolute inset-0 opacity-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, ${theme.hex?.secondary} 0px, ${theme.hex?.secondary} 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, ${theme.hex?.secondary} 0px, ${theme.hex?.secondary} 1px, transparent 1px, transparent 8px)`,
                  backgroundSize: '12px 12px',
                }}
              ></div>
            </div>
          </>
        )

      case 'minimal':
        return (
          <>
            {/* Minimal clean border */}
            <div className="absolute inset-6 border border-gray-300 opacity-60"></div>

            {/* Subtle corner accents */}
            <div className="absolute top-5 left-5 w-3 h-3 border-l border-t border-gray-400 opacity-40"></div>
            <div className="absolute top-5 right-5 w-3 h-3 border-r border-t border-gray-400 opacity-40"></div>
            <div className="absolute bottom-5 left-5 w-3 h-3 border-l border-b border-gray-400 opacity-40"></div>
            <div className="absolute bottom-5 right-5 w-3 h-3 border-r border-b border-gray-400 opacity-40"></div>
          </>
        )

      case 'professional':
        return (
          <>
            {/* Professional double border */}
            <div className="absolute inset-2 border-2 border-slate-300 opacity-50"></div>
            <div className="absolute inset-3 border border-slate-400 opacity-40"></div>

            {/* Professional corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-slate-400 opacity-60"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-slate-400 opacity-60"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-slate-400 opacity-60"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-slate-400 opacity-60"></div>

            {/* Subtle professional background */}
            <div className="absolute inset-0 opacity-2">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, #64748b 1px, transparent 1px), linear-gradient(0deg, #64748b 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }}
              ></div>
            </div>
          </>
        )

      case 'academic':
        return (
          <>
            {/* Academic traditional border */}
            <div className="absolute inset-2 border-3 border-indigo-300 opacity-50"></div>
            <div className="absolute inset-3 border border-indigo-400 opacity-40"></div>

            {/* Academic shield-like corners */}
            <div className="absolute top-2 left-2 w-8 h-8 border-2 border-indigo-400 opacity-50 rounded-tl-lg"></div>
            <div className="absolute top-2 right-2 w-8 h-8 border-2 border-indigo-400 opacity-50 rounded-tr-lg"></div>
            <div className="absolute bottom-2 left-2 w-8 h-8 border-2 border-indigo-400 opacity-50 rounded-bl-lg"></div>
            <div className="absolute bottom-2 right-2 w-8 h-8 border-2 border-indigo-400 opacity-50 rounded-br-lg"></div>

            {/* Academic laurel-like decorations */}
            <div className="absolute top-1/2 left-1 transform -translate-y-1/2">
              <div className="w-1 h-6 bg-indigo-300 opacity-40 rounded-full"></div>
            </div>
            <div className="absolute top-1/2 right-1 transform -translate-y-1/2">
              <div className="w-1 h-6 bg-indigo-300 opacity-40 rounded-full"></div>
            </div>

            {/* Academic background pattern */}
            <div className="absolute inset-0 opacity-3">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, #6366f1 1px, transparent 1px)`,
                  backgroundSize: '15px 15px',
                }}
              ></div>
            </div>
          </>
        )

      case 'modern':
        return (
          <>
            {/* Modern clean asymmetric border */}
            <div
              className="absolute inset-2 border-2 border-gray-300 opacity-50"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}
            ></div>

            {/* Modern accent lines */}
            <div className="absolute top-2 left-2 w-8 h-0.5 bg-blue-400 opacity-60"></div>
            <div className="absolute top-2 left-2 w-0.5 h-8 bg-blue-400 opacity-60"></div>

            <div className="absolute bottom-2 right-2 w-8 h-0.5 bg-blue-400 opacity-60"></div>
            <div className="absolute bottom-2 right-2 w-0.5 h-8 bg-blue-400 opacity-60"></div>

            {/* Modern dot accents */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 opacity-50 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-blue-400 opacity-50 rounded-full"></div>

            {/* Modern subtle background */}
            <div className="absolute inset-0 opacity-2">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(135deg, #3b82f6 0%, transparent 1%), linear-gradient(225deg, #3b82f6 0%, transparent 1%)`,
                  backgroundSize: '12px 12px',
                }}
              ></div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  const theme = getPatternTheme(certificatePattern)
  const displayOrgLogoUrl =
    orgLogoUrl ||
    (org?.logo_image
      ? getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)
      : '')
  const displayOrgName = orgName || org?.name || 'LearnHouse'
  const qrCodeUrl = providedQrCodeUrl || generatedQrCodeUrl
  const formattedGrade = (() => {
    if (
      gradePercentage === null ||
      gradePercentage === undefined ||
      gradePercentage === ''
    ) {
      return null
    }

    const numericGrade = Number(gradePercentage)
    if (!Number.isFinite(numericGrade)) {
      return String(gradePercentage)
    }

    return `${numericGrade.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}%`
  })()
  const certificationTypeLabel =
    certificationType === 'completion'
      ? 'Course Completion'
      : certificationType === 'achievement'
        ? 'Achievement Based'
        : certificationType === 'assessment'
          ? 'Assessment Based'
          : certificationType === 'participation'
            ? 'Participation'
            : certificationType === 'mastery'
              ? 'Skill Mastery'
              : certificationType === 'professional'
                ? 'Professional Development'
                : certificationType === 'continuing'
                  ? 'Continuing Education'
                  : certificationType === 'workshop'
                    ? 'Workshop Attendance'
                    : certificationType === 'specialization'
                      ? 'Specialization'
                      : 'Course Completion'

  return (
    <div ref={containerRef} className="w-full overflow-visible">
      <div
        style={{
          width: `${CERT_NATURAL_WIDTH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginBottom: `-${CERT_NATURAL_WIDTH * 0.6 * (1 - scale)}px`,
        }}
      >
        <div
          className="border border-blue-200 rounded-xl p-2 sm:p-4 w-full"
          style={{
            background: `linear-gradient(to bottom right, #eff6ff, #eef2ff)`,
          }}
        >
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 relative overflow-hidden w-full flex flex-col">
            {/* Dynamic Certificate Pattern */}
            {renderCertificatePattern(certificatePattern)}

            {/* Certificate ID - Top Left */}
            <div className="absolute top-2 left-2 sm:top-6 sm:left-6 z-20">
              <div className="flex items-center space-x-1">
                <Hash className={`w-3 h-3 sm:w-4 sm:h-4 ${theme.icon}`} />
                <span
                  className={`text-xs sm:text-sm ${theme.secondary} font-medium`}
                >
                  ID: {certificateId || 'LH-2024-001'}
                </span>
              </div>
            </div>

            {/* QR Code Box - Top Right */}
            <div className="absolute top-2 right-2 sm:top-6 sm:right-6 z-20">
              <div
                className={`w-12 h-12 sm:w-24 sm:h-24 border-2 ${theme.secondary.replace('text-', 'border-')} rounded-md bg-white/90 backdrop-blur-sm p-1`}
              >
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Certificate QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <QrCode
                      className={`w-8 h-8 sm:w-12 sm:h-12 ${theme.icon}`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3 px-2 sm:px-6 py-3 sm:py-6">
              {/* Header with decorative line */}
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div
                  className={`w-6 sm:w-8 h-px opacity-60`}
                  style={{
                    background: `linear-gradient(to right, transparent, ${theme.hex?.secondary})`,
                  }}
                ></div>
                <div
                  className={`text-xs sm:text-sm font-medium uppercase tracking-wider`}
                  style={{ color: theme.hex?.secondary }}
                >
                  Certificate
                </div>
                <div
                  className={`w-6 sm:w-8 h-px opacity-60`}
                  style={{
                    background: `linear-gradient(to left, transparent, ${theme.hex?.secondary})`,
                  }}
                ></div>
              </div>

              {/* Award Icon with decorative elements */}
              <div className="flex justify-center relative">
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center relative`}
                  style={{
                    background: `linear-gradient(to bottom right, ${theme.hex?.bg}, ${theme.hex?.border})`,
                  }}
                >
                  <Award
                    className={`w-6 h-6 sm:w-8 sm:h-8`}
                    style={{ color: theme.hex?.icon }}
                  />
                  {/* Decorative rays */}
                  <div className="absolute inset-0 rounded-full">
                    <div
                      className={`absolute top-0 left-1/2 w-px h-2 sm:h-3 transform -translate-x-1/2 -translate-y-1 opacity-60`}
                      style={{ backgroundColor: theme.hex?.secondary }}
                    ></div>
                    <div
                      className={`absolute bottom-0 left-1/2 w-px h-2 sm:h-3 transform -translate-x-1/2 translate-y-1 opacity-60`}
                      style={{ backgroundColor: theme.hex?.secondary }}
                    ></div>
                    <div
                      className={`absolute left-0 top-1/2 w-2 sm:w-3 h-px transform -translate-y-1/2 -translate-x-1 opacity-60`}
                      style={{ backgroundColor: theme.hex?.secondary }}
                    ></div>
                    <div
                      className={`absolute right-0 top-1/2 w-2 sm:w-3 h-px transform -translate-y-1/2 translate-x-1 opacity-60`}
                      style={{ backgroundColor: theme.hex?.secondary }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Certificate Content */}
              <div className="flex flex-col justify-center items-center flex-1 max-w-full">
                <div
                  className={`text-[10px] sm:text-xs ${theme.secondary} uppercase tracking-[0.2em] mb-1 font-semibold opacity-80`}
                >
                  This is to certify that
                </div>
                <h3
                  className={`font-bold text-lg sm:text-2xl ${theme.primary} mb-2 text-center tracking-tight leading-tight`}
                >
                  {studentName || 'Student Name'}
                </h3>
                <div
                  className={`text-[10px] sm:text-xs ${theme.secondary} mb-3 italic opacity-80`}
                >
                  has successfully completed the requirements for
                </div>

                <h4
                  className={`font-bold text-sm sm:text-base ${theme.primary} mb-2 text-center`}
                >
                  {certificationName || 'Certification Name'}
                </h4>
                <p
                  className={`text-xs sm:text-sm ${theme.secondary} text-center leading-relaxed max-w-xs sm:max-w-sm`}
                >
                  {certificationDescription ||
                    'Certification description will appear here...'}
                </p>

                {formattedGrade && (
                  <div
                    className="mt-1 flex flex-col items-center gap-0.5"
                    style={{ color: theme.hex?.primary }}
                  >
                    <span
                      className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: theme.hex?.secondary }}
                    >
                      Final Grade
                    </span>
                    <span className="text-sm sm:text-base font-extrabold leading-tight">
                      {formattedGrade}
                    </span>
                  </div>
                )}
              </div>

              {/* Decorative divider */}
              <div className="flex items-center justify-center space-x-1 py-1">
                <div
                  className={`w-2 h-px ${theme.secondary.replace('text-', 'bg-')} opacity-50`}
                ></div>
                <div
                  className={`w-1 h-1 ${theme.primary.replace('text-', 'bg-')} rounded-full opacity-60`}
                ></div>
                <div
                  className={`w-2 h-px ${theme.secondary.replace('text-', 'bg-')} opacity-50`}
                ></div>
              </div>

              {/* Certification Type Badge */}
              <div
                className={`text-xs sm:text-sm px-3 py-1 rounded-full border`}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  backgroundColor: theme.hex?.bg,
                  color: theme.hex?.primary,
                  borderColor: theme.hex?.border,
                  lineHeight: 1,
                  minHeight: 24,
                  paddingLeft: 27,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    width: 12,
                    height: 12,
                    lineHeight: 0,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <CheckCircle
                    size={12}
                    style={{
                      display: 'block',
                      width: 12,
                      height: 12,
                      verticalAlign: 'top',
                    }}
                  />
                </span>
                <span
                  className="font-medium"
                  style={{
                    display: 'block',
                    lineHeight: '12px',
                    paddingTop: 0,
                  }}
                >
                  {certificationTypeLabel}
                </span>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="relative z-10 mt-auto p-2 sm:p-6 pt-4 sm:pt-8">
              <div className="flex items-end justify-between w-full">
                {/* Left: Chief Instructor */}
                <div className="flex flex-col items-start space-y-1 flex-1">
                  <div className="flex items-center space-x-1">
                    <User
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3`}
                      style={{ color: theme.hex?.icon }}
                    />
                    <span
                      className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider`}
                      style={{ color: theme.hex?.secondary }}
                    >
                      Chief Instructor
                    </span>
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-extrabold`}
                    style={{ color: theme.hex?.primary }}
                  >
                    {certificateInstructor || 'Dr. Jane Smith'}
                  </div>
                  <div
                    className={`h-px w-12 sm:w-16 opacity-50`}
                    style={{ backgroundColor: theme.hex?.secondary }}
                  ></div>
                </div>

                {/* Center: Logo */}
                <div className="flex flex-col items-center space-y-1 flex-1">
                  <div
                    className={`w-12 h-12 sm:w-32 sm:h-32 flex items-center justify-center`}
                  >
                    {displayOrgLogoUrl ? (
                      <img
                        src={displayOrgLogoUrl}
                        alt="Organization Logo"
                        style={{
                          display: 'block',
                          width: 'auto',
                          height: 'auto',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center`}
                        style={{ backgroundColor: theme.hex?.bg }}
                      >
                        <Building
                          className={`w-8 h-8 sm:w-12 sm:h-12`}
                          style={{ color: theme.hex?.icon }}
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs font-bold uppercase`}
                    style={{ color: theme.hex?.secondary }}
                  >
                    {displayOrgName}
                  </div>
                </div>

                {/* Right: CEO */}
                <div className="flex flex-col items-end space-y-1 flex-1">
                  <div className="flex items-center space-x-1">
                    <User
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3`}
                      style={{ color: theme.hex?.icon }}
                    />
                    <span
                      className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider`}
                      style={{ color: theme.hex?.secondary }}
                    >
                      CEO
                    </span>
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-extrabold`}
                    style={{ color: theme.hex?.primary }}
                  >
                    {certificateCeo || 'CEO Name'}
                  </div>
                  <div
                    className={`h-px w-12 sm:w-16 opacity-50`}
                    style={{ backgroundColor: theme.hex?.secondary }}
                  ></div>
                </div>
              </div>

              {/* Absolute bottom: Awarded Date */}
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 opacity-60">
                <span
                  className={`text-[8px] sm:text-[10px] font-medium italic`}
                  style={{ color: theme.hex?.secondary }}
                >
                  Awarded: {awardedDate || 'Dec 15, 2024'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificatePreview
