import os
import uuid
from datetime import UTC, datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlmodel import Session, select

from src.db.courses.activities import Activity, ActivitySubTypeEnum, ActivityTypeEnum
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course, ThumbnailType
from src.db.organizations import Organization

# Load environment variables
load_dotenv()
db_url = os.environ.get("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(db_url)

curriculums = [
    {
        "name": "AI Engineering",
        "description": "A comprehensive 6-month journey into advanced AI engineering.",
        "about": "Learn to build, evaluate, and deploy intelligent systems, RAG pipelines, and multi-agent workflows.",
        "thumbnail_image": "/landing/program_ai_engineering.png",
        "chapters": [
            {
                "name": "Engineering & AI Foundations (Month 1)",
                "activities": [
                    "Programming Fundamentals: Python basics, variables, data types, control flow",
                    "Python & APIs: Modules, packages, project structure, REST APIs, JSON",
                    "Web Dev & Intro to AI: Database fundamentals, ML vs Deep Learning, Generative AI",
                    "Data Handling & Visualization: NumPy, Pandas, Matplotlib, Seaborn, EDA",
                ]
            },
            {
                "name": "LLM Engineering & Prompt Mastery (Month 2)",
                "activities": [
                    "Prompt Engineering: Zero-shot, few-shot, Chain-of-thought, prompt templates",
                    "Evals-Driven Development: RAGAS for RAG evaluation, LLM-as-judge patterns",
                    "AI APIs & SDK Integration: OpenAI, Anthropic, HuggingFace APIs, Streaming",
                    "Structured Outputs & Validation: Pydantic validation pipelines, Instructor, Outlines",
                ]
            },
            {
                "name": "RAG & Knowledge Systems (Month 3)",
                "activities": [
                    "Embeddings & Vector DBs: Semantic search, Pinecone, ChromaDB, pgvector",
                    "RAG Foundations: Architecture, Context injection, citation systems",
                    "AI Observability & Tracing: LangSmith, Arize, Helicone setup, Token-level tracing",
                    "Advanced RAG: Hybrid Search, Reranking, Enterprise RAG patterns, multi-document retrieval",
                ]
            },
            {
                "name": "AI Agents & Orchestration (Month 4)",
                "activities": [
                    "AI Agents & Tool Use: LangChain, LangGraph intro, CrewAI, MCP fundamentals",
                    "Browser & Workflow Agents: Browser automation, Multi-step task completion",
                    "Context Engineering & Memory: Long-term memory architecture, State management",
                    "Multi-Agent Systems: Orchestration patterns, AI Dev Team Simulator, AI QA",
                ]
            },
            {
                "name": "Infrastructure, Deployment & Security (Month 5)",
                "activities": [
                    "Backend & Cloud: FastAPI / Node.js backends for AI services, Redis, queues",
                    "Docker, Cloud & Caching: Docker, AWS/GCP deployment, Semantic caching (GPTCache)",
                    "CI/CD & Optimization: CI/CD pipelines, Monitoring, logging, scaling, Production AI SaaS",
                    "AI Security & Governance: Prompt injection defense, Data privacy, Guardrails AI",
                ]
            },
            {
                "name": "Career Tracks & Capstone (Month 6)",
                "activities": [
                    "Specialization: Fullstack, Backend, Product, Automation, or Systems tracks",
                    "Capstone Sprint 1: Architecture design & tech stack setup, Core feature implementation",
                    "Capstone Sprint 2: Deployment & production hardening, Evals, performance tuning",
                    "Demo Day & Career Readiness: Final capstone polish, peer review, Demo day presentations",
                ]
            }
        ]
    },
    {
        "name": "Frontend Development",
        "description": "A structured 3-month program from complete beginner to job-ready frontend developer.",
        "about": "Master HTML, CSS, JavaScript, React, and Tailwind CSS.",
        "thumbnail_image": "/landing/program_frontend.png",
        "chapters": [
            {
                "name": "Foundations (Month 1)",
                "activities": [
                    "Web & Environment Setup: How the web works, VS Code, HTML5 basics",
                    "CSS Deep Dive & Flexbox: Typography, Custom Properties, Layouts",
                    "CSS Grid & Responsive Design: Media queries, Mobile-first philosophy, Animations",
                    "Portfolio Capstone: Wireframing, Styling, Semantic HTML, GitHub Pages Deploy"
                ]
            },
            {
                "name": "Core Dev Skills (Month 2)",
                "activities": [
                    "JavaScript Foundations: Variables, Data types, Functions, Control flow",
                    "The DOM & Events: Selection, Manipulation, Event Listeners, Forms, Local Storage",
                    "Async JavaScript & APIs: Promises, Fetch API, REST Principles, dynamic rendering",
                    "Git, GitHub & Pro Workflow: Branching, Pull Requests, ES Modules, clean commits"
                ]
            },
            {
                "name": "React & Deploy (Month 3)",
                "activities": [
                    "React Fundamentals: Component model, JSX, Props, Vite setup",
                    "React Hooks & API Integration: useState, useEffect, useContext, Custom hooks",
                    "React Router & Tailwind CSS: Multi-page apps, Utility-first CSS, Forms/Validation",
                    "Capstone Project & Career Readiness: Build, polish, deploy, and interview prep"
                ]
            }
        ]
    },
    {
        "name": "Backend Development (Node.js)",
        "description": "Master scalable server-side development in this 3-month track.",
        "about": "Build robust RESTful APIs, manage databases with Prisma and PostgreSQL, and deploy production-ready Node.js applications.",
        "thumbnail_image": "/landing/program_backend_node.png",
        "chapters": [
            {
                "name": "Backend Foundations (Month 1)",
                "activities": [
                    "Intro to Web Dev & JS Basics: Frontend vs Backend, Client-Server Architecture, HTTP/HTTPS",
                    "Advanced JavaScript: Scope, Closures, Hoisting, Promises, Async/Await",
                    "Node.js Fundamentals: Event Loop, Single Thread Model, fs, path, os, http modules",
                    "Git/GitHub & REST APIs: Branches, Pull Requests, HTTP Methods, Status Codes, Postman"
                ]
            },
            {
                "name": "Backend with Express (Month 2)",
                "activities": [
                    "Express Fundamentals & MVC: Routing, Middleware, Request/Response cycle",
                    "Databases & Schema Design: SQL vs NoSQL, ER Diagrams",
                    "PostgreSQL + Prisma ORM: Tables, relationships, migrations, models",
                    "Authentication, JWT & RBAC: Auth vs Authorization, Password Hashing, JWT"
                ]
            },
            {
                "name": "Advanced Backend (Month 3)",
                "activities": [
                    "File Uploads & Email Systems: Image handling, Cloud Storage, Email Verification",
                    "Pagination, Search & Redis Caching: Pagination, Filtering, Rate Limiting",
                    "Security & Testing: Helmet, CORS, Data Validation, SQLi, XSS, Jest, Supertest",
                    "Deployment, CI/CD & Capstone: Docker, Env Vars, Logging, CI/CD with GitHub Actions"
                ]
            }
        ]
    },
    {
        "name": "Backend Development (Laravel)",
        "description": "Become a highly sought-after PHP developer in 3 months.",
        "about": "Learn Laravel, relational database design, authentication, APIs, and production deployment.",
        "thumbnail_image": "/landing/program_backend_laravel.png",
        "chapters": [
            {
                "name": "Foundations (Month 1)",
                "activities": [
                    "PHP 8 & OOP: Classes, objects, inheritance, interfaces, match/named args",
                    "Modern PHP & Git workflow: Composer, VS Code, Git branching",
                    "Laravel Project Setup & MVC Architecture: Routing, Controllers, Blade templating",
                    "Eloquent ORM: Migrations, schema, models, seeders, factories, relationships",
                    "Forms, validation & file handling: CSRF, Form Requests, Storage disks"
                ]
            },
            {
                "name": "Core Laravel (Month 2)",
                "activities": [
                    "Authentication: Laravel Breeze, session auth, Gates, policies & RBAC",
                    "JWT & OAuth 2.0: tymon/jwt-auth, Socialite (Google/GitHub login)",
                    "RESTful APIs: API routes, stateless controllers, API resources & Sanctum",
                    "Queues, Jobs & Events: Database/Redis queues, listeners, broadcasting",
                    "Testing in Laravel: PHPUnit, feature tests, mocking, Pest PHP & TDD intro"
                ]
            },
            {
                "name": "Production Ready (Month 3)",
                "activities": [
                    "Advanced Eloquent: Query scopes, accessors/mutators, full-text search",
                    "Architecture: Service & repository pattern, Dependency Injection",
                    "Performance & Security: Caching strategies (Redis), DB optimization (Telescope), XSS/SQLi defense",
                    "Deployment & DevOps: Server setup (Forge/Nginx), CI/CD with GitHub Actions, Docker basics",
                    "Capstone & Career Prep: Build sprint, code review, live demo, portfolio building"
                ]
            }
        ]
    }
]

def generate_date():
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

def seed():
    with Session(engine) as session:
        # Get the first org
        org = session.exec(select(Organization)).first()
        if not org:
            print("No organization found. Please initialize the database first.")
            return

        for course_data in curriculums:
            # Check if course already exists
            existing_course = session.exec(
                select(Course).where(Course.name == course_data["name"])
            ).first()
            if existing_course:
                print(f"Course '{course_data['name']}' already exists. Skipping.")
                continue

            print(f"Creating course: {course_data['name']}")
            course = Course(
                name=course_data["name"],
                description=course_data["description"],
                about=course_data["about"],
                public=True,
                open_to_contributors=False,
                org_id=org.id,
                course_uuid=uuid.uuid4().hex[:22],
                creation_date=generate_date(),
                update_date=generate_date(),
                thumbnail_type=ThumbnailType.IMAGE,
                thumbnail_image=course_data["thumbnail_image"]
            )
            session.add(course)
            session.commit()
            session.refresh(course)

            for chapter_data in course_data["chapters"]:
                print(f"  Creating chapter: {chapter_data['name']}")
                chapter = Chapter(
                    name=chapter_data["name"],
                    org_id=org.id,
                    course_id=course.id,
                    chapter_uuid=uuid.uuid4().hex[:22],
                    creation_date=generate_date(),
                    update_date=generate_date(),
                    published=True
                )
                session.add(chapter)
                session.commit()
                session.refresh(chapter)

                # Wait, chapter_activities table? Learnhouse uses chapter_activities table for linking if many-to-many?
                # Let's check Activity model. It has course_id.

                for idx, act_name in enumerate(chapter_data["activities"]):
                    activity = Activity(
                        name=act_name,
                        activity_type=ActivityTypeEnum.TYPE_CUSTOM,
                        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_CUSTOM,
                        content={"data": ""},
                        details={"content": ""},
                        published=True,
                        org_id=org.id,
                        course_id=course.id,
                        activity_uuid=uuid.uuid4().hex[:22],
                        creation_date=generate_date(),
                        update_date=generate_date()
                    )
                    session.add(activity)
                    session.commit()
                    session.refresh(activity)

                    # Now we need to link the activity to the chapter via ChapterActivity table
                    chapter_activity = ChapterActivity(
                        order=idx,
                        chapter_id=chapter.id,
                        activity_id=activity.id,
                        course_id=course.id,
                        org_id=org.id,
                        creation_date=generate_date(),
                        update_date=generate_date()
                    )
                    session.add(chapter_activity)
                    session.commit()

        print("Seeding complete.")

if __name__ == "__main__":
    seed()
