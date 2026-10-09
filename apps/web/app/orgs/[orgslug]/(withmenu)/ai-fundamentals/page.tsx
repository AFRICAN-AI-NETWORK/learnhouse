'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lock,
  Target,
  Zap,
  Briefcase,
  Brain,
} from 'lucide-react'
import { useCurrency } from '@components/Contexts/CurrencyContext'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import ClickToPayButton from '@components/Landings/ClickToPayButton'

export default function AIFundamentalsPage() {
  const org = useOrg() as any
  const { currency, convertAmount } = useCurrency()
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  const modules = [
    {
      num: 1,
      title: 'Python for Data Science',
      details: [
        'Syntax, data structures, functions, OOP basics, file I/O',
        'Working with Python',
        'Data manipulation with NumPy',
        'Data manipulation with Pandas',
      ],
    },
    {
      num: 2,
      title: 'Mathematics & Statistics Essentials',
      details: [
        'Linear algebra, calculus basics',
        'Probability, distributions, hypothesis testing',
        'Working with SciPy',
        'Mathematics with NumPy',
      ],
    },
    {
      num: 3,
      title: 'Data Wrangling & EDA',
      details: [
        'Cleaning, merging, reshaping, missing values',
        'Exploratory data analysis',
        'Data visualisation with Matplotlib',
        'Data visualisation with Seaborn',
      ],
    },
    {
      num: 4,
      title: 'Supervised Learning',
      details: [
        'Regression, classification',
        'Bias-variance tradeoff, cross-validation, metrics',
        'Building models with scikit-learn',
        'Statistical modeling with statsmodels',
      ],
    },
    {
      num: 5,
      title: 'Unsupervised Learning',
      details: [
        'Clustering, dimensionality reduction',
        'PCA, t-SNE, anomaly detection',
        'Clustering with scikit-learn',
        'Dimensionality reduction with UMAP',
      ],
    },
    {
      num: 6,
      title: 'Feature Engineering & Selection',
      details: [
        'Encoding, scaling, pipelines',
        'Feature importance, regularization',
        'Feature selection with scikit-learn',
        'Data manipulation with Pandas',
      ],
    },
    {
      num: 7,
      title: 'Model Evaluation & Tuning',
      details: [
        'Confusion matrix, ROC-AUC',
        'Hyperparameter search, ensemble methods',
        'Evaluation with scikit-learn',
        'Hyperparameter tuning with Optuna',
      ],
    },
    {
      num: 8,
      title: 'Become a 10X Data Scientist Using Generative AI',
      details: [
        'Leverage Generative AI tools to improve productivity and efficiency in data science workflows',
        'Write effective prompts for data analysis, coding, and problem-solving',
        'Use AI responsibly while avoiding common mistakes and limitations',
        'Integrate AI into data collection, analysis, visualization, and communication processes',
      ],
    },
  ]

  const audienceGroups = [
    {
      icon: <Brain size={24} className="text-emerald-500" />,
      label: 'AAN Open graduates ready to go technical',
      description:
        "You've mastered the basics and are ready to understand how AI models actually work under the hood.",
    },
    {
      icon: <Target size={24} className="text-emerald-500" />,
      label: 'Aspiring ML engineers',
      description:
        'Build the foundational math, statistics, and programming skills required for advanced machine learning.',
    },
    {
      icon: <Briefcase size={24} className="text-emerald-500" />,
      label: 'Data science career changers',
      description:
        'Transition into data science with a robust, structured curriculum focused on applied skills and real-world tools.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-emerald-500 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              Program 3
            </span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
              Structured Pace • Python-Based
            </span>
          </div>

          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            Applied
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">
              Data Science
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              Go beneath the no-code layer to understand how AI models actually
              work, and how to build, train, and deploy your own. The technical
              foundation for a career in AI.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-emerald-600 transition-colors"
              >
                View Syllabus <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrated Pricing Pitch ── */}
      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-50 border border-emerald-500/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />

            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> AINA Pro Subscription
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                Unlock Applied Data Science + 6 Premium Courses
              </h3>
              <p className="text-zinc-600 font-medium max-w-xl text-lg">
                Get full access to the entire AINA curriculum, mentorship, and
                guaranteed internship placement for one flat monthly rate.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                  }).format(convertAmount(10))}
                </span>
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                  / month
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-6">
                Cancel anytime.
              </p>
              <div className="w-full lg:w-64">
                <ClickToPayButton
                  courseId="aina-pro-subscription"
                  courseName="AINA Pro Subscription"
                  priceAmount={10}
                  currency="USD"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-emerald-600/70 font-bold uppercase tracking-widest">
                <Lock size={12} /> Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Should Enroll ── */}
      <section className="py-24 px-6 lg:px-12 bg-white border-t border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
              Who Should <span className="text-emerald-500">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  {group.icon}
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  {group.label}
                </h3>
                <p className="text-zinc-500 leading-relaxed font-medium">
                  {group.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Asymmetric Pillars ── */}
      <section className="py-24 px-6 lg:px-12 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
              What You'll
              <br /> Learn
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-emerald-500/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest block mb-4">
                  01
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Understand
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Grasp the underlying mathematics, statistics, and theory that
                  powers modern artificial intelligence models.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest block mb-4">
                  02
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Build
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Construct machine learning models from scratch using Python,
                  pandas, scikit-learn, and deep learning frameworks.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-emerald-950/30 border border-emerald-500/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest block mb-4">
                03
              </span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">
                Deploy
              </h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Deploy production-ready AI with fairness testing, bias
                detection, and responsible deployment practices for real-world
                impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brutalist Curriculum ── */}
      <section id="curriculum" className="py-32 px-6 lg:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Syllabus
            </h2>
          </div>

          <div className="border-t-2 border-black">
            {modules.map((mod) => (
              <div key={mod.num} className="border-b-2 border-black group">
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === mod.num ? null : mod.num
                    )
                  }
                  className="w-full flex items-center justify-between py-8 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-8 md:gap-16">
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-emerald-500 transition-colors">
                      0{mod.num}
                    </span>
                    <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
                      {mod.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={32}
                    className={`text-black transition-transform duration-500 ${expandedModule === mod.num ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedModule === mod.num && (
                  <div className="pl-16 md:pl-32 pb-12">
                    <ul className="space-y-4">
                      {mod.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <span className="text-emerald-500 font-black mt-1">
                            →
                          </span>
                          <span className="text-lg font-medium text-zinc-600 leading-relaxed">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stark CTA ── */}
      <section className="py-40 px-6 lg:px-12 bg-zinc-100 border-t border-zinc-200 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br /> <span className="text-emerald-500">Commit?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-emerald-500 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-emerald-600 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
          >
            Join the Waitlist <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
