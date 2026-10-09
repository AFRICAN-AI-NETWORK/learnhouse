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

export default function AIEngineeringPage() {
  const org = useOrg() as any
  const { currency, convertAmount } = useCurrency()
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

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
      icon: <Brain size={24} className="text-blue-500" />,
      label: 'Software Engineers transitioning to AI',
      description:
        'Leverage your existing engineering skills to build scalable, production-grade AI systems.',
    },
    {
      icon: <Target size={24} className="text-blue-500" />,
      label: 'Data Scientists upgrading to GenAI',
      description:
        'Move beyond traditional ML and master modern LLMs, RAG, and agentic workflows.',
    },
    {
      icon: <Briefcase size={24} className="text-blue-500" />,
      label: 'Backend Developers building AI features',
      description:
        'Integrate LLMs securely and robustly into existing enterprise backends and infrastructure.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-blue-500 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              AI Track
            </span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
              6 Months • Virtual
            </span>
          </div>

          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            AI Engineering
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
              Career Path
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              A comprehensive 6-month journey into advanced AI engineering.
              Learn to build, evaluate, and deploy intelligent systems, RAG
              pipelines, and multi-agent workflows.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors"
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
          <div className="bg-zinc-50 border border-blue-500/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />

            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> AINA Pro Subscription
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                Unlock AI Engineering + 6 Premium Courses
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
              <div className="flex items-center gap-2 mt-4 text-xs text-blue-600/70 font-bold uppercase tracking-widest">
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
              Who Should <span className="text-blue-500">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-blue-500/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-4">
                  01
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Build
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Engineer robust prompts, build Retrieval-Augmented Generation
                  (RAG) systems, and orchestrate complex multi-agent
                  architectures.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-4">
                  02
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Evaluate
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Implement evals-driven development to systematically measure,
                  improve, and guardrail AI outputs before they reach users.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-blue-950/30 border border-blue-500/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-4">
                03
              </span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">
                Deploy
              </h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Deploy secure, scalable AI infrastructure using Docker, cloud
                services, and semantic caching for production-grade reliability.
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
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-blue-500 transition-colors">
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
                          <span className="text-blue-500 font-black mt-1">
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
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br /> <span className="text-blue-500">Commit?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-blue-500 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-blue-600 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]"
          >
            Join the Waitlist <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
