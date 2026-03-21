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
    title: 'AAN Policy And Guidelines Hub',
    url: '/data/aan-policy-and-guidelines-hub.pdf',
    category: 'core',
    icon: BookOpen,
    desc: 'Welcome to the AAN Ecosystem Education Program Policy Hub. At AAN, we are committed to fostering a transparent, inclusive, and technologically advanced learning environment that empowers the next generation of AI leaders in Africa.This Policy Hub serves as your centralized resource for the key policies, procedures, and community guidelines that govern your journey with us—from initial enrollment through to ecosystem integration and professional certification.',
  },
  {
    title: 'AAN Registration And Selection Policy',
    url: '/data/aan-registration-and-selection-policy.pdf',
    category: 'enrollment',
    icon: Users,
    desc: 'The African AI Network (AAN) aims to accelerate the development of artificial intelligence talent across the African continent. This Registration and Selection Policy (the "Policy") establishes the framework for how AAN identifies, assesses, and admits learners into its ecosystem. By submitting an application to AAN, the applicant acknowledges they have read, understood, and agreed to be bound by the terms contained herein.',
  },
  {
    title: 'AAN Learner Code Of Conduct & Honor Code',
    url: '/data/aan-learner-code-of-conduct-honor-code.pdf',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'The African AI Network (AAN) is committed to developing the next generation of ethical technology leaders. This Code of Conduct ("the Code") is not merely a set of rules but a commitment to the values of integrity, excellence, and mutual respect. By joining this program, every learner agrees to uphold these standards in all interactions—virtual, physical, and professional.',
  },
  {
    title: 'Terms And Conditions (EHUB)',
    url: '/data/terms-and-conditions-ehub.pdf',
    category: 'legal',
    icon: FileText,
    desc: 'This appendix represents a legally binding agreement between users and African AI Network(“AAN”), By registering for or using AAN’s services, users agree to abide by the terms and conditions outlined in this User Agreement.The policy applies to all users of AAN’s services, including:Registered users (referred to as “Clients”)Unregistered users (referred to as “Visitors”)It covers individuals engaging with AAN Africa, The AAN Fellowship, AAN Ventures, and any related digital or physical brands associated with AAN.',
  },
  {
    title: 'AAN Online Community Guidelines',
    url: '/data/aan-online-community-guidelines.pdf',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'This policy is reviewed periodically, and any updates will be published on the AAN website, effective upon posting. For significant changes, we may notify you directly via the eHub or email.',
  },
  {
    title: 'Assessment Policy And Procedure',
    url: '/data/assessment-policy-and-procedure.pdf',
    category: 'academic',
    icon: GraduationCap,
    desc: 'Our Assessment Policy provides the framework for fair, transparent, and consistent assessment and moderation across all AAN learning programmes. It sets out the principles, processes, and responsibilities that guide how learners are assessed, ensuring alignment with quality standards and regulatory requirements. ',
  },
  {
    title: 'Course Delivery Policy And Procedure',
    url: '/data/course-delivery-policy-and-procedure.pdf',
    category: 'academic',
    icon: GraduationCap,
    desc: 'Our Course Delivery Policy outlines AAN’s commitment to providing a high-quality, learner-centered education experience across all programmes. It ensures that courses are designed and delivered with consistency, inclusivity, and accountability, while offering learners access to diverse resources, academic and administrative support, and flexible pathways to success. ',
  },
  {
    title: 'Certification Policy And Procedure',
    url: '/data/certification-policy-and-procedure.pdf',
    category: 'academic',
    icon: GraduationCap,
    desc: 'Our Certification Policy ensures that learners are awarded certificates in a fair, transparent, and secure manner upon successful completion of their programmes. It outlines the criteria for certification, the process for issuing and distributing certificates, and the safeguards in place to protect their integrity and authenticity.',
  },
  {
    title: 'Appeals And Conduct Committee Guidelines',
    url: '/data/appeals-and-conduct-committee-guidelines.pdf',
    category: 'conduct',
    icon: ShieldCheck,
    desc: 'Our Appeals and Conduct Committee Guidelines outline the principles, structures, and procedures for handling academic appeals and conduct-related matters. These guidelines ensure learners are treated fairly, with respect and dignity, while upholding institutional integrity and community values.',
  },
  {
    title: 'Cancellation And Refund Policy',
    url: '/data/cancellation-and-refund-policy.pdf',
    category: 'financial',
    icon: DollarSign,
    desc: 'Our Cancellation and Refund Policy sets out clear guidelines for managing subscription cancellations, withdrawals, deferrals, and refunds.',
  },
  {
    title: 'AAN Referral Reward Program Terms Of Use',
    url: '/data/aan-referral-reward-program-terms-of-use.pdf',
    category: 'financial',
    icon: DollarSign,
    desc: 'African AI Network (AAN) Referral Rewards is our way of recognising your commitment to growing our community, becoming career-ready, and engaging with the AI ecosystem.',
  },
  {
    title: 'AAN Legacy Points Guide',
    url: '/data/aan-legacy-points-guide.pdf',
    category: 'financial',
    icon: DollarSign,
    desc: 'Legacy Points are our way of recognising your effort and achievements throughout your African AI Network (AAN) journey—from completing programmes on time to building your career profile, engaging in the AAN Community, and joining events. ',
  },
  {
    title: 'AAN Learner Privacy Policy',
    url: '/data/aan-learner-privacy-policy.pdf',
    category: 'privacy',
    icon: Lock,
    desc: 'At the African AI Network (AAN), we are committed to safeguarding your personal information. Our Learner Privacy Policy explains how we collect, use, share, and protect your data when you engage with our website, programmes, or services.',
  },
  {
    title: 'AAN Contractor Privacy Policy',
    url: '/data/aan-contractor-privacy-policy.pdf',
    category: 'privacy',
    icon: Lock,
    desc: 'African AI Network (AAN) is committed to protecting your personal data. This policy explains how we collect, use, store, and share personal information related to our contractors, partners, potential partners, and their representatives.',
  },
]

const mainDoc = {
  title: 'Privacy Policy Document',
  url: 'https://docs.google.com/document/d/1wfy3zDhkLS5_QZ-oX3MNrSoJnZCVLZRaFqWce8-yR4U/edit?usp=drivesdk',
}

export { mainDoc, categories, docs }
