import React from 'react'
import { Award, Building, CheckCircle, Hash, User } from 'lucide-react'

interface CertificateExportProps {
  id?: string
  studentName?: string
  certificationName?: string
  certificationDescription?: string
  certificationType?: string
  instructor?: string
  orgName?: string
  ceo?: string
  awardedDate?: string
  qrCodeUrl?: string
}

const CertificateExport: React.FC<CertificateExportProps> = ({
  id,
  studentName,
  certificationName,
  certificationDescription,
  certificationType,
  instructor,
  orgName,
  ceo,
  awardedDate,
  qrCodeUrl,
}) => {
  const certificateTypeLabel =
    certificationType === 'completion' || !certificationType
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

  const containerStyle: React.CSSProperties = {
    width: 760,
    height: 660,
    boxSizing: 'border-box',
    padding: 20,
    background: '#eaf2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    color: '#44546a',
  }

  const innerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    boxSizing: 'border-box',
    padding: 10,
    overflow: 'hidden',
    borderRadius: 14,
    border: '1px solid #c2d4fb',
    background:
      'linear-gradient(to bottom right, rgba(255,255,255,0.985), rgba(250,252,255,0.985))',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.9)',
  }

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(218,226,239,0.26) 1px, transparent 1px), linear-gradient(90deg, rgba(218,226,239,0.26) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.35,
    pointerEvents: 'none',
  }

  const borderOuter: React.CSSProperties = {
    position: 'absolute',
    inset: 12,
    border: '1px solid #c8d7f3',
    borderRadius: 10,
    pointerEvents: 'none',
  }

  const borderInner: React.CSSProperties = {
    position: 'absolute',
    inset: 20,
    border: '1px solid #c8d7f3',
    borderRadius: 8,
    pointerEvents: 'none',
  }

  const topLeftIdStyle: React.CSSProperties = {
    position: 'absolute',
    left: 28,
    top: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
    color: '#5a6781',
    fontSize: 11,
    fontWeight: 500,
  }

  const topRightQr: React.CSSProperties = {
    position: 'absolute',
    right: 24,
    top: 22,
    width: 98,
    height: 98,
    boxSizing: 'border-box',
    border: '2px solid #5a6781',
    borderRadius: 7,
    background: '#fff',
    padding: 5,
    overflow: 'hidden',
    zIndex: 3,
  }

  const qrImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  }

  const headerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
    paddingTop: 28,
  }

  const centeredLineStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  }

  const lineStyle: React.CSSProperties = {
    width: 92,
    height: 1,
    background: 'linear-gradient(to right, transparent, #bac6d9)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: '#5f6e86',
  }

  const mainStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  }

  const mutedStyle: React.CSSProperties = {
    color: '#6f7c92',
    fontSize: 11,
    letterSpacing: 2.8,
    fontWeight: 500,
  }

  const nameStyle: React.CSSProperties = {
    fontSize: 20,
    lineHeight: 1.1,
    fontWeight: 800,
    color: '#34435f',
    marginTop: 4,
  }

  const bodyTextStyle: React.CSSProperties = {
    color: '#6e7890',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  }

  const certificationStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 800,
    color: '#34435f',
    marginTop: 6,
  }

  const descriptionStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: '#54627a',
  }

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: '4px 14px',
    borderRadius: 999,
    border: '1px solid #d4deee',
    background: '#f8fbff',
    color: '#44536d',
    fontSize: 12,
    fontWeight: 700,
    boxShadow: '0 1px 1px rgba(20, 34, 60, 0.04)',
  }

  const midEmblemStyle: React.CSSProperties = {
    width: 90,
    height: 90,
    borderRadius: '50%',
    background: '#f1f5fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    position: 'relative',
  }

  const bottomEmblemStyle: React.CSSProperties = {
    width: 124,
    height: 124,
    borderRadius: '50%',
    background: '#f3f6fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '34px auto 0',
    position: 'relative',
  }

  const footerLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: '#5f6e86',
  }

  const footerNameStyle: React.CSSProperties = {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 800,
    color: '#34435f',
  }

  const footerLineStyle: React.CSSProperties = {
    width: 88,
    height: 1,
    background: '#bac6d9',
    marginTop: 2,
  }

  const orgLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: '#5f6e86',
    textAlign: 'center',
  }

  const dateStyle: React.CSSProperties = {
    marginTop: 3,
    fontSize: 10,
    fontStyle: 'italic',
    color: '#8a94a8',
    textAlign: 'center',
  }

  return (
    <div style={containerStyle}>
      <div id="certificate-export-root" style={innerStyle}>
        <div style={gridStyle} />
        <div style={borderOuter} />
        <div style={borderInner} />

        {id && (
          <div style={topLeftIdStyle}>
            <Hash size={13} strokeWidth={2} />
            <span>ID: {id}</span>
          </div>
        )}

        {qrCodeUrl && (
          <div style={topRightQr}>
            <img src={qrCodeUrl} alt="QR" style={qrImageStyle} />
          </div>
        )}

        <div style={headerStyle}>
          <div style={centeredLineStyle}>
            <div style={lineStyle} />
            <div style={titleStyle}>CERTIFICATE</div>
            <div
              style={{
                ...lineStyle,
                background: 'linear-gradient(to left, transparent, #bac6d9)',
              }}
            />
          </div>

          <div style={mainStyle}>
            <div style={midEmblemStyle}>
              <Award size={34} strokeWidth={1.9} color="#5b6780" />
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 10,
                  width: 14,
                  height: 1,
                  background: '#9eb0ce',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 10,
                  width: 14,
                  height: 1,
                  background: '#9eb0ce',
                }}
              />
            </div>

            <div style={{ marginTop: 14, ...mutedStyle }}>
              THIS IS TO CERTIFY THAT
            </div>
            <div style={nameStyle}>{studentName || 'Student Name'}</div>
            <div style={bodyTextStyle}>
              has successfully completed the requirements for
            </div>
            <div style={certificationStyle}>
              {certificationName || 'Certification Name'}
            </div>
            <div style={descriptionStyle}>
              {certificationDescription ||
                'Certification description will appear here...'}
            </div>

            <div style={badgeStyle}>
              <CheckCircle size={13} strokeWidth={2.1} />
              <span>{certificateTypeLabel}</span>
            </div>

            <div style={bottomEmblemStyle}>
              <Building size={38} strokeWidth={2.2} color="#5b6780" />
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 18,
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '0 26px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div style={footerLabelStyle}>
              <User size={11} strokeWidth={2} />
              <span>CHIEF INSTRUCTOR</span>
            </div>
            <div style={footerNameStyle}>
              {instructor || 'LearnHouse Instructor'}
            </div>
            <div style={footerLineStyle} />
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <div style={orgLabelStyle}>{orgName || 'DEFAULT ORGANIZATION'}</div>
            <div style={dateStyle}>
              {awardedDate ? `Awarded: ${awardedDate}` : ''}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div style={footerLabelStyle}>
              <User size={11} strokeWidth={2} />
              <span>CEO</span>
            </div>
            <div style={footerNameStyle}>{ceo || 'LearnHouse CEO'}</div>
            <div style={footerLineStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificateExport
