'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Brain,
  Database,
  BarChart3,
  Code2,
  FlaskConical,
  Briefcase,
  Users,
  Laptop,
  Monitor,
  Package,
  Clock,
  Code,
  TerminalSquare,
  TableProperties,
  Hash,
  Settings,
  Flame,
  LineChart,
  BookOpen,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function AIFundamentalsPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  const modules = [
    {
      num: 1,
      title: 'Foundations of Machine Learning',
      details: [
        'Supervised vs unsupervised learning: when to use which and why',
        'Regression, classification, and the mathematical intuition behind how models learn from data',
        'The complete AI/ML pipeline: from problem definition to model deployment',
        'Understanding model types: decision trees, random forests, SVMs, and neural network basics',
      ],
    },
    {
      num: 2,
      title: 'The Complete AI Pipeline in Depth',
      details: [
        'Data collection and preprocessing for real-world datasets',
        'Feature engineering: the skill that separates good from great ML practitioners',
        'Model training, hyperparameter tuning, and optimisation techniques',
        'Evaluation metrics (accuracy, precision, recall, F1) and knowing which one matters when',
      ],
    },
    {
      num: 3,
      title: 'Working with Real Data',
      details: [
        'Hands-on data cleaning and exploratory data analysis (EDA)',
        'Working with African datasets and African-context problems (agriculture, health, finance)',
        'Building models that matter locally, not just academically',
        'Handling missing data, class imbalance, and noisy real-world inputs',
      ],
    },
    {
      num: 4,
      title: 'Modern AI/ML Tooling',
      details: [
        'Python for machine learning: NumPy, pandas, and matplotlib',
        'scikit-learn: the workhorse of practical ML',
        'Introduction to deep learning frameworks (TensorFlow/PyTorch)',
        'How to use cloud and free-tier compute resources effectively as an African learner with limited hardware',
      ],
    },
    {
      num: 5,
      title: 'Model Evaluation, Bias & Responsible Deployment',
      details: [
        'Building on the ethics foundation from AAN Open with technical rigour',
        'Fairness testing: identifying and measuring bias in your models',
        'Model monitoring and responsible deployment practices',
        'Designing AI systems that are transparent, explainable, and accountable',
      ],
    },
    {
      num: 6,
      title: 'Career-Readiness for Technical AI Roles',
      details: [
        'Portfolio-building guidance for data science and ML engineering roles',
        'The kinds of projects that get African ML practitioners hired or funded',
        'Pathways into data science, ML engineering, and AI research roles',
        'CV writing, technical interview preparation, and industry networking',
      ],
    },
  ]

  const audienceGroups = [
    {
      label: 'AAN Open graduates ready to go technical',
      color: 'bg-emerald-50 text-emerald-700',
    },
    { label: 'Aspiring ML engineers', color: 'bg-blue-50 text-blue-700' },
    {
      label: 'Data science career changers',
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Developers adding AI skills',
      color: 'bg-purple-50 text-purple-700',
    },
    { label: 'University students', color: 'bg-rose-50 text-rose-700' },
    {
      label: 'Technical professionals seeking AI depth',
      color: 'bg-cyan-50 text-cyan-700',
    },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-[#0057ff]/20"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-28 px-6 lg:px-12 bg-[#0a0f1e] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest border border-emerald-500/30">
                <Brain size={14} /> Program 3
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                AI Fundamentals
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-1">
                  Machine Learning Engineering
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                Go beneath the no-code layer to understand how AI models
                actually work, and how to build, train, and deploy your own. The
                technical foundation for a career in AI.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Monitor size={16} className="text-gray-400" /> Virtual
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Package size={16} className="text-gray-400" /> 6 Modules
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" /> Structured Pace
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Code size={16} className="text-gray-400" /> Python-Based
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
                >
                  View Curriculum <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Right: Price Card */}
            <div className="w-full lg:w-[320px] flex-shrink-0">
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-[24px] p-8 space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    COURSE FEE
                  </p>
                  <p className="text-5xl font-black text-white">
                    $40
                    <span className="text-xl font-bold text-gray-400">/mo</span>
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      COMING LIVE IN 1 WEEK
                    </span>
                    <Countdown targetDate={LAUNCH_DATE} />
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    PREREQUISITES
                  </p>
                  <p className="text-lg font-bold text-white">AAN Open</p>
                  <p className="text-sm text-gray-400">
                    Recommended: AI Automation
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    LEVEL
                  </p>
                  <p className="text-lg font-bold text-white">
                    Intermediate → Advanced
                  </p>
                  <p className="text-sm text-gray-400">
                    Technical, Python-based
                  </p>
                </div>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-[15px] transition-all"
                >
                  CLICK TO PAY →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="py-20 px-6 lg:px-12 bg-[#f9fafb] border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {[
            { word: 'Understand', sub: 'How AI really works.' },
            { word: 'Build', sub: 'Models from scratch.' },
            { word: 'Deploy', sub: 'Production-ready AI.' },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex-1 p-8 bg-white border border-gray-100 rounded-2xl shadow-sm"
            >
              <h3 className="text-3xl font-black text-[#0a0f1e] mb-2">
                {p.word}
              </h3>
              <p className="text-gray-500 text-[15px]">{p.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── What You'll Learn ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 mb-16 items-end">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
                What You&apos;ll Learn
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight uppercase">
                From confident AI user to{' '}
                <span className="text-[#0057ff]">
                  credible ML practitioner.
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Master supervised and unsupervised learning, regression, classification, and neural network fundamentals',
              'Build the complete AI/ML pipeline: data collection, preprocessing, feature engineering, training, and deployment',
              'Work with real African datasets from agriculture, health, and finance sectors',
              'Use Python, pandas, scikit-learn, and deep learning frameworks (TensorFlow/PyTorch)',
              'Apply fairness testing, bias detection, and responsible deployment practices',
              'Build a portfolio that gets African ML practitioners hired or funded',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-5 rounded-xl bg-[#f9fafb] border border-gray-100"
              >
                <CheckCircle2
                  className="text-emerald-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <span className="text-[15px] text-gray-700 leading-relaxed">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools You'll Master ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            Tools You&apos;ll Master
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-12 uppercase">
            Industry-standard <span className="text-[#0057ff]">ML stack.</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: 'Python',
                icon: <TerminalSquare size={24} className="text-emerald-500" />,
              },
              {
                name: 'pandas',
                icon: (
                  <TableProperties size={24} className="text-emerald-500" />
                ),
              },
              {
                name: 'NumPy',
                icon: <Hash size={24} className="text-emerald-500" />,
              },
              {
                name: 'scikit-learn',
                icon: <Settings size={24} className="text-emerald-500" />,
              },
              {
                name: 'TensorFlow',
                icon: <Brain size={24} className="text-emerald-500" />,
              },
              {
                name: 'PyTorch',
                icon: <Flame size={24} className="text-emerald-500" />,
              },
              {
                name: 'matplotlib',
                icon: <LineChart size={24} className="text-emerald-500" />,
              },
              {
                name: 'Jupyter',
                icon: <BookOpen size={24} className="text-emerald-500" />,
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-emerald-200 transition-all"
              >
                {tool.icon}
                <span className="font-bold text-[14px] text-[#0a0f1e]">
                  {tool.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum (Expandable Modules) ── */}
      <section id="curriculum" className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Course Content
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              6 modules.{' '}
              <span className="text-[#0057ff]">Deep technical rigour.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {modules.map((mod) => (
              <motion.div
                key={mod.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === mod.num ? null : mod.num
                    )
                  }
                  className="w-full flex items-center gap-5 p-6 md:p-8 text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                      Module {mod.num}
                    </p>
                    <h3 className="text-lg font-bold text-[#0a0f1e]">
                      {mod.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                      expandedModule === mod.num ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedModule === mod.num && (
                  <div className="px-6 md:px-8 pb-8 border-t border-gray-100">
                    <ul className="space-y-3 mt-6">
                      {mod.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-emerald-600 mt-0.5 flex-shrink-0">
                            →
                          </span>
                          <span className="text-[15px] text-gray-700">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Should Enrol ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Who Should Enrol
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight mb-4 uppercase">
              Ready to go <span className="text-[#0057ff]">technical.</span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-md">
              For learners who have built confidence through AAN Open and are
              ready to understand how AI models actually work.
            </p>
          </div>
          <div className="flex-1 flex flex-wrap gap-3">
            {audienceGroups.map((group, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className={`px-5 py-3 rounded-full text-sm font-bold ${group.color}`}
              >
                {group.label}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why $40/month ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            Value Breakdown
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-8 uppercase">
            Why $40/month is a{' '}
            <span className="text-[#0057ff]">genuine investment.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <Database size={22} />,
                title: 'Global-standard technical rigour',
                desc: 'Quality ML education that takes you from confident AI user to credible technical practitioner, equivalent to courses costing hundreds to thousands elsewhere.',
              },
              {
                icon: <FlaskConical size={22} />,
                title: 'African context, African data',
                desc: 'Contextualised for African learners with African data, African infrastructure constraints, and African career pathways in mind.',
              },
              {
                icon: <BarChart3 size={22} />,
                title: 'Complete stack for less than a textbook',
                desc: 'The entire AAN pathway, from total beginner to employable AI/ML practitioner, costs less per month than a single textbook in most global programmes.',
              },
              {
                icon: <Briefcase size={22} />,
                title: 'Career-ready outcomes',
                desc: 'Portfolio-building guidance, the kinds of projects that get you hired, and clear pathways into data science, ML engineering, and AI research roles.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#f9fafb] p-8 rounded-2xl border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0a0f1e] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 text-[15px] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bonus: Internship & Community ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              Internship Programme
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Structured placement pathways connecting top graduates with
              partner organisations for genuine, hands-on ML engineering
              experience on real projects.
            </p>
          </div>
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Laptop size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              Laptop Giveaway Initiative
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Students exceeding 80% engagement and performance become eligible
              for a free laptop. Excellence is rewarded with the hardware needed
              to go fully professional in AI.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pathway Preview ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            The Full Pathway
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-12 uppercase">
            Your position in the{' '}
            <span className="text-[#0057ff]">AAN journey</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stage: 'Stage 1',
                name: 'AAN Open',
                sub: 'Generative AI Foundation',
                price: 'FREE',
                priceColor: 'text-emerald-500',
                active: false,
              },
              {
                stage: 'Stage 2',
                name: 'AI Automation',
                sub: '12-week hands-on programme',
                price: '$37/month',
                priceColor: 'text-[#0057ff]',
                active: false,
              },
              {
                stage: 'Stage 3',
                name: 'AI Fundamentals',
                sub: 'Machine Learning Engineering',
                price: '$40/month',
                priceColor: 'text-emerald-500',
                active: true,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className={`p-8 rounded-2xl border ${
                  item.active
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 bg-[#f9fafb]'
                }`}
              >
                <p className="text-xs font-bold text-[#0057ff] uppercase tracking-wider mb-2">
                  {item.stage}
                </p>
                <h3 className="text-xl font-black text-[#0a0f1e] mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{item.sub}</p>
                <p className={`text-2xl font-black ${item.priceColor}`}>
                  {item.price}
                </p>
                {item.active && (
                  <span className="inline-block mt-3 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                    ← You are here
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-emerald-500/20 to-cyan-400/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Sparkles size={14} className="text-emerald-400" /> Go Technical
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Build the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Future of AI
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              6 modules. Python-powered. From confident AI user to credible,
              employable AI/ML practitioner at $40/month.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-emerald-500 text-white rounded-xl font-bold text-[15px] hover:bg-emerald-600 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3"
              >
                Join the Waitlist <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
