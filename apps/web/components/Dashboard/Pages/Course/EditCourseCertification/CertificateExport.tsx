import React from 'react'
import CertificatePreview from './CertificatePreview'

interface CertificateExportProps {
  id?: string
  studentName?: string
  certificationName?: string
  certificationDescription?: string
  certificationType?: string
  certificatePattern?: string
  instructor?: string
  orgName?: string
  orgLogoUrl?: string
  ceo?: string
  awardedDate?: string
  qrCodeUrl?: string
  gradePercentage?: number | string | null
}

const CertificateExport: React.FC<CertificateExportProps> = ({
  id,
  studentName,
  certificationName,
  certificationDescription,
  certificationType,
  certificatePattern,
  instructor,
  orgName,
  orgLogoUrl,
  ceo,
  awardedDate,
  qrCodeUrl,
  gradePercentage,
}) => {
  return (
    <div
      id="certificate-export-root"
      style={{
        width: 672,
        background: '#ffffff',
      }}
    >
      <CertificatePreview
        certificationName={certificationName || 'Certification Name'}
        certificationDescription={
          certificationDescription ||
          'Certification description will appear here...'
        }
        certificationType={certificationType || 'completion'}
        certificatePattern={certificatePattern || 'professional'}
        certificateInstructor={instructor}
        certificateCeo={ceo}
        certificateId={id}
        awardedDate={awardedDate}
        qrCodeUrl={qrCodeUrl}
        studentName={studentName}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        gradePercentage={gradePercentage}
      />
    </div>
  )
}

export default CertificateExport
