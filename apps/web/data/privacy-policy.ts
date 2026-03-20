import {
  BookOpen,
  Users,
  FileText,
  DollarSign,
  GraduationCap,
  Lock,
  ShieldCheck,
} from 'lucide-react'

const categories = [
  { key: 'all', label: 'All' },
  { key: 'core', label: 'Core' },
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'conduct', label: 'Conduct' },
  { key: 'legal', label: 'Legal' },
  { key: 'academic', label: 'Academic' },
  { key: 'financial', label: 'Financial' },
  { key: 'privacy', label: 'Privacy' },
]

const docs = [
  {
    title: 'AAN POLICY AND GUIDELINES HUB',
    url: 'https://docs.google.com/document/d/15v4DjLAca-NQ0THvuLzM1DG5aREJoxkKMqWFtf5hMDo/edit?usp=drivesdk',
    category: 'core',
    icon: BookOpen,
    desc: 'Central hub for all AAN policies and guidelines.',
  },
  {
    title: 'AAN REGISTRATION AND SELECTION POLICY',
    url: 'https://docs.google.com/document/d/1nzdLo-ufFKheMaa2imFexPacHHDNzq3VN8LV_fEvGhA/edit?usp=drivesdk',
    category: 'enrollment',
    icon: Users,
    desc: 'How learners are registered and selected.',
  },
  {
    title: 'AAN LEARNER CODE OF CONDUCT & HONOR CODE',
    url: 'https://docs.google.com/document/d/1-_uMWuwsWjViRQCNlPRmgflB_u0AgQS5gQz6zKHEBQs/edit?usp=drivesdk',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'Expected behavior and honor code for learners.',
  },
  {
    title: 'TERMS AND CONDITIONS (EHUB)',
    url: 'https://docs.google.com/document/d/1msan-Fdu3DnuGxSrYzkxbGzK2lXAeW6CFKJY-yFkX_w/edit?usp=drivesdk',
    category: 'legal',
    icon: FileText,
    desc: 'Legal terms and conditions for EHUB users.',
  },
  {
    title: 'AAN ONLINE COMMUNITY GUIDELINES',
    url: 'https://docs.google.com/document/d/1kFJFWpMF8sKyte6HxKHju2f7baV_H8eo4KCfilNPNHk/edit?usp=drivesdk',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'Rules for participating in the AAN online community.',
  },
  {
    title: 'ASSESSMENT POLICY AND PROCEDURE',
    url: 'https://docs.google.com/document/d/1twZ1DGDjM-dElglcgYyOFuYeU-WupDh3_GNDzAQ562o/edit?usp=drivesdk',
    category: 'academic',
    icon: GraduationCap,
    desc: 'Assessment standards and procedures.',
  },
  {
    title: 'COURSE DELIVERY POLICY AND PROCEDURE',
    url: 'https://docs.google.com/document/d/1vZ2JWzYd5vkqt4EOUHb39YMzhPMK6GjrCTa7bsG2ULk/edit?usp=drivesdk',
    category: 'academic',
    icon: GraduationCap,
    desc: 'How courses are delivered and managed.',
  },
  {
    title: 'CERTIFICATION POLICY AND PROCEDURE',
    url: 'https://docs.google.com/document/d/1kprX9KVgnanJ6rA2iHNE8TNuNM0o2wRWoxiiXPCZZUo/edit?usp=drivesdk',
    category: 'academic',
    icon: GraduationCap,
    desc: 'Certification requirements and process.',
  },
  {
    title: 'APPEALS AND CONDUCT COMMITTEE GUIDELINES',
    url: 'https://docs.google.com/document/d/1nHhvuMTEvRi4_qGFz2Bua3sfNajIS2NiWNNRTQUONjk/edit?usp=drivesdk',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'Guidelines for appeals and conduct committee.',
  },
  {
    title: 'CANCELLATION AND REFUND POLICY',
    url: 'https://docs.google.com/document/d/1gO2W0u5w0mZG-XaBe4nyz4FhA7et-BLM2i1-_6fZIGk/edit?usp=drivesdk',
    category: 'financial',
    icon: DollarSign,
    desc: 'How cancellations and refunds are handled.',
  },
  {
    title: 'AAN REFERRAL REWARD PROGRAM TERMS OF USE',
    url: 'https://docs.google.com/document/d/1KZG8o3feOcLpgDIXKbB3xzZNkMMXI3gbk1mINYvNipI/edit?usp=drivesdk',
    category: 'financial',
    icon: DollarSign,
    desc: 'Terms for referral rewards.',
  },
  {
    title: 'AAN LEGACY POINTS GUIDE',
    url: 'https://docs.google.com/document/d/1zkmxPEaxfPsx_8AoqzfYQ3z8UNe7hLFtiOSbR5_XuN8/edit?usp=drivesdk',
    category: 'financial',
    icon: DollarSign,
    desc: 'Guide to legacy points and rewards.',
  },
  {
    title: 'AAN LEARNER PRIVACY POLICY',
    url: 'https://docs.google.com/document/d/1kiY1qkRBjM7T9QJK7R6kbpUSZq25Rrw1Cz7uDHeAl2U/edit?usp=drivesdk',
    category: 'privacy',
    icon: Lock,
    desc: 'How we handle learner data and privacy.',
  },
  {
    title: 'AAN CONTRACTOR PRIVACY POLICY',
    url: 'https://docs.google.com/document/d/1c-MlBN6HoEw0BqNCUFHZ4VWNYYW4yLgpXUuvr-7LlsQ/edit?usp=drivesdk',
    category: 'privacy',
    icon: Lock,
    desc: 'Privacy policy for contractors.',
  },
]

const mainDoc = {
  title: 'Privacy Policy Document',
  url: 'https://docs.google.com/document/d/1wfy3zDhkLS5_QZ-oX3MNrSoJnZCVLZRaFqWce8-yR4U/edit?usp=drivesdk',
}

export { mainDoc, categories, docs }
