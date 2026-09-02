'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Brain,
  Monitor,
  Package,
  Clock,
  Code,
  Cpu,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'
import ClickToPayButton from '@components/Landings/ClickToPayButton'
import PriceDisplay from '@components/Landings/PriceDisplay'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function AIEngineeringPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)
  const [isSubscription, setIsSubscription] = useState(true)

  const courseId = 'ai-engineering-uuid' // Placeholder

  const PRICE_ONE_TIME = 100 // 6 months equivalent
  const PRICE_SUBSCRIPTION = 20
  const ORIGINAL_PRICE_ONE_TIME = 150
  const ORIGINAL_PRICE_SUBSCRIPTION = 30

  const modules = [
    {
      num: 1,
      title: 'Engineering & AI Foundations (Month 1)',
      details: [
        'Programming Fundamentals: Python basics, variables, data types, control flow',
        'Python & APIs: Modules, packages, project structure, REST APIs, JSON',
        'Web Dev & Intro to AI: Database fundamentals, ML vs Deep Learning, Generative AI',
        'Data Handling & Visualization: NumPy, Pandas, Matplotlib, Seaborn, EDA',
      ],
    },
    {
      num: 2,
      title: 'LLM Engineering & Prompt Mastery (Month 2)',
      details: [
        'Prompt Engineering: Zero-shot, few-shot, Chain-of-thought, prompt templates',
        'Evals-Driven Development: RAGAS for RAG evaluation, LLM-as-judge patterns',
        'AI APIs & SDK Integration: OpenAI, Anthropic, HuggingFace APIs, Streaming',
        'Structured Outputs & Validation: Pydantic validation pipelines, Instructor, Outlines',
      ],
    },
    {
      num: 3,
      title: 'RAG & Knowledge Systems (Month 3)',
      details: [
        'Embeddings & Vector DBs: Semantic search, Pinecone, ChromaDB, pgvector',
        'RAG Foundations: Architecture, Context injection, citation systems, hallucination reduction',
        'AI Observability & Tracing: LangSmith, Arize, Helicone setup, Token-level tracing',
        'Advanced RAG: Hybrid Search, Reranking, Enterprise RAG patterns, multi-document retrieval',
      ],
    },
    {
      num: 4,
      title: 'AI Agents & Orchestration (Month 4)',
      details: [
        'AI Agents & Tool Use: LangChain, LangGraph intro, CrewAI, MCP fundamentals',
        'Browser & Workflow Agents: Browser automation, Multi-step task completion',
        'Context Engineering & Memory: Long-term memory architecture, State management',
        'Multi-Agent Systems: Orchestration patterns, AI Dev Team Simulator, AI QA',
      ],
    },
    {
      num: 5,
      title: 'Infrastructure, Deployment & Security (Month 5)',
      details: [
        'Backend & Cloud: FastAPI / Node.js backends for AI services, Redis, queues',
        'Docker, Cloud & Caching: Docker, AWS/GCP deployment, Semantic caching (GPTCache)',
        'CI/CD & Optimization: CI/CD pipelines, Monitoring, logging, scaling, Production AI SaaS',
        'AI Security & Governance: Prompt injection defense, Data privacy, Guardrails AI',
      ],
    },
    {
      num: 6,
      title: 'Career Tracks & Capstone (Month 6)',
      details: [
        'Specialization: Fullstack, Backend, Product, Automation, or Systems tracks',
        'Capstone Sprint 1: Architecture design & tech stack setup, Core feature implementation',
        'Capstone Sprint 2: Deployment & production hardening, Evals, performance tuning',
        'Demo Day & Career Readiness: Final capstone polish, peer review, Demo day presentations',
      ],
    },
  ]

  const audienceGroups = [
    {
      label: 'Software Engineers transitioning to AI',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Data Scientists upgrading to GenAI',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Backend Developers building AI features',
      color: 'bg-purple-50 text-purple-700',
    },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-blue-500/20"
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/30">
                <Brain size={14} /> AI Track
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                AI ENGINEERING
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mt-1">
                  CAREER PATH
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                A comprehensive 6-month journey into advanced AI engineering.
                Learn to build, evaluate, and deploy intelligent systems, RAG
                pipelines, and multi-agent workflows.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Monitor size={16} className="text-gray-400" /> Virtual
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Package size={16} className="text-gray-400" /> 6 Modules
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" /> 6 Months
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Cpu size={16} className="text-gray-400" /> AI/LLMs
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
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
                    Tuition
                  </p>
                  <div className="mb-4 flex items-center p-1 bg-white/10 rounded-xl">
                    <button
                      onClick={() => setIsSubscription(true)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        isSubscription
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Subscription
                    </button>
                    <button
                      onClick={() => setIsSubscription(false)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        !isSubscription
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      One-time
                    </button>
                  </div>
                  <PriceDisplay
                    basePriceUSD={
                      isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                    }
                    originalPriceUSD={
                      isSubscription
                        ? ORIGINAL_PRICE_SUBSCRIPTION
                        : ORIGINAL_PRICE_ONE_TIME
                    }
                    interval={isSubscription ? '/mo' : ''}
                  />

                  <div className="mt-8 space-y-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      COHORT STARTING SOON
                    </span>
                    <Countdown targetDate={LAUNCH_DATE} />
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="pt-2">
                  <ClickToPayButton
                    courseId={courseId}
                    courseName="AI Engineering"
                    priceAmount={
                      isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                    }
                    currency="USD"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="py-20 px-6 lg:px-12 bg-[#f9fafb] border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {[
            { word: 'Build', sub: 'LLMs, RAG, and Agents.' },
            { word: 'Evaluate', sub: 'Evals-driven development & quality.' },
            { word: 'Deploy', sub: 'Secure, scalable AI infrastructure.' },
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">
                What You&apos;ll Learn
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight uppercase">
                From beginner to{' '}
                <span className="text-blue-600">
                  production-ready AI Engineer.
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Engineer robust prompts and utilize LLM APIs with streaming and tool calling',
              'Build Retrieval-Augmented Generation (RAG) systems with Vector DBs and Semantic Search',
              'Implement evals-driven development to systematically improve AI outputs',
              'Orchestrate multi-agent systems using LangChain, LangGraph, and CrewAI',
              'Deploy AI applications with secure cloud infrastructure and caching',
              'Specialize in fullstack, backend, product, or systems AI engineering',
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
                  className="text-blue-600 flex-shrink-0 mt-0.5"
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

      {/* ── Curriculum (Expandable Modules) ── */}
      <section
        id="curriculum"
        className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">
              Curriculum
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              6 Phases. <span className="text-blue-600">Zero to Hero.</span>
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                      Phase {mod.num}
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
                          <span className="text-blue-600 mt-0.5 flex-shrink-0">
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

      {/* ── Final CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-blue-500/20 to-cyan-400/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Brain size={14} className="text-blue-400" /> Start Building
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Become an <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                AI Engineer
              </span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-[15px] hover:bg-blue-500 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3"
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
