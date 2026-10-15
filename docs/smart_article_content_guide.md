# LearnHouse Smart Article Content & Course Creation Guide

This guide explains how to generate and upload course lessons for LearnHouse's **Smart Article** activity, featuring interactive quizzes, video embeds, code exercises, and instant execution powered by Piston.

---

## 1. Quick Summary: Which Option to Use?

| Feature | Option B: Direct JSON (Recommended) 🚀 | Option A: Plain Text PDF |
| :--- | :--- | :--- |
| **How to create** | Ask ChatGPT to output the lesson using the JSON prompt below. | Ask ChatGPT to write a plain text lesson and export to PDF. |
| **File to upload** | Upload as a `.json` file OR as a `.pdf` containing the JSON. | Upload as a `.pdf` document. |
| **Quizzes** | ✅ **Automatic**: Multiple-choice questions render directly. | ❌ Must add manually in the editor. |
| **YouTube Videos** | ✅ **Automatic**: URLs convert into embedded responsive players. | ❌ Must add manually in the editor. |
| **Code Exercises** | ✅ **Automatic**: Code exercises render and run on Piston. | ❌ Must add manually in the editor. |
| **Images** | ✅ **Automatic**: Image URLs render with captions. | ❌ Must add manually in the editor. |
| **Processing Speed** | ⚡ **Instant**: Bypasses secondary AI, zero token cost. | ⏳ Takes 5-15s (extracted and chunked by AI). |

---

## 2. Option B (Recommended): ChatGPT Direct JSON Prompt

Copy and paste this prompt directly into ChatGPT when creating lessons for frontend development (or any topic). ChatGPT will output the exact JSON structure ready for upload:

```markdown
You are an expert curriculum developer creating lessons for the African AI Network Academy (LearnHouse platform).

Please write a comprehensive, beginner-friendly lesson on:
TOPIC: "[Insert Topic Here, e.g. JavaScript Fetch API and Async/Await]"
AUDIENCE: "[Insert Audience, e.g. Frontend Web Developers]"

OUTPUT FORMAT REQUIREMENTS:
- Output ONLY a valid JSON array of step objects (no conversational preamble, no markdown code fence wrappers, just the raw JSON array).
- Each step MUST adhere to the LearnHouse Smart Article step schema.
- Follow this required learning sequence:
  1. "introduction": Engaging overview of the topic.
  2. "learning_objectives": 3 to 4 actionable learning objectives.
  3. "concept": Core teaching broken into 2 to 4 subsections with clear code examples.
  4. "EMBED": YouTube video walkthrough URL (use a real relevant video or standard placeholder).
  5. "analogy": A memorable everyday metaphor with an "example".
  6. "real_world_examples": 2 to 3 real-world production use cases.
  7. "CODE_EXERCISE": A coding exercise with instructions, language ("javascript"), and starter code.
  8. "QUIZ": An interactive quiz with 2 to 3 questions, multiple-choice options, and correctOptionIndex.
  9. "summary": 3 to 5 key recap takeaway bullet points.

JSON SCHEMA REFERENCE FOR EACH BLOCK TYPE:
- introduction:
  {"type": "introduction", "label": "Start Here", "title": "...", "content": "..."}

- learning_objectives:
  {"type": "learning_objectives", "label": "Learning Objectives", "title": "What You Will Master", "objectives": ["..."]}

- concept:
  {"type": "concept", "label": "Understand", "title": "...", "subsections": [{"heading": "...", "content": "..."}]}

- EMBED:
  {"type": "EMBED", "title": "Video Walkthrough", "url": "https://www.youtube.com/watch?v=..."}

- IMAGE (Optional):
  {"type": "IMAGE", "title": "Architecture Diagram", "url": "https://example.com/image.png", "caption": "..."}

- analogy:
  {"type": "analogy", "label": "Think About It", "title": "...", "content": "...", "example": "..."}

- real_world_examples:
  {"type": "real_world_examples", "label": "Real-World Examples", "title": "...", "examples": [{"name": "...", "description": "..."}]}

- CODE_EXERCISE:
  {"type": "CODE_EXERCISE", "title": "Hands-On Practice", "language": "javascript", "startingCode": "// write your code here\n", "content": "Exercise instructions and expected output..."}

- QUIZ:
  {"type": "QUIZ", "title": "Check Your Knowledge", "questions": [{"content": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctOptionIndex": 0}]}

- summary:
  {"type": "summary", "label": "Quick Recap", "title": "Summary & Key Takeaways", "items": ["..."]}
```

### How to upload Option B:
1. Copy the JSON output from ChatGPT.
2. Save it as a `.json` file (e.g. `javascript_fetch.json`) OR paste it inside a document and save as `.pdf`.
3. In LearnHouse, click **Add Activity** → **Smart Article**.
4. Upload the file. The system will detect the JSON, bypass the secondary AI, and render the complete lesson with working quizzes and videos!

---

## 3. Option A (Fallback): Plain Text PDF Outline

If you only want quick reading notes without pre-built quizzes:

1. Use this prompt in ChatGPT:
   ```markdown
   Write a lesson on [Topic]. Include:
   1. Overview & Hook
   2. Learning Objectives (bulleted)
   3. Core Concepts & Subsections (with subheadings and code snippets)
   4. Real-world Analogy (with an Example sentence)
   5. Real-World Applications (Name and Description)
   6. Summary (key bullet points)
   Keep it in plain text formatted for PDF export.
   ```
2. Save the output as a `.pdf` file.
3. Upload to LearnHouse. The AI will convert the text into standard reading cards.
4. You can open the **Smart Article Editor** afterward to add quizzes or video embeds manually.

---

## 4. Code Execution & Supported Piston Languages

LearnHouse includes an integrated Piston code execution engine (`http://localhost:2000`) for running code directly in the browser:

### Enabled Languages:
* **JavaScript / Node.js / Express:** Fully supported (`javascript`, `node`, `js`, `express`). Runs Node.js v20.11.1 in Piston, with local Node.js fallback.
* **TypeScript:** Supported (`typescript`, `ts`).
* **Python:** Supported (`python`, `py`, `python3`).
* **Other backend languages:** C, C++, Java, Go, Rust, Ruby, PHP, and Bash.

### Code Editor in Smart Article:
In any `CODE_EXERCISE` block, students can type code directly and click **Run Code**. The code is executed securely via Piston and stdout/stderr results are displayed instantly in the terminal output window.

---

## 5. Frontend Interactive Exercises & Automated Grading (`FRONTEND_EXERCISE`)

For frontend courses (**HTML, CSS, Vanilla JavaScript, React 19 / JSX, and Tailwind CSS**), use the **`FRONTEND_EXERCISE`** block instead of `CODE_EXERCISE`. 

### Why Use `FRONTEND_EXERCISE`?
* **Live In-Browser Visual Preview:** Students see their actual rendered UI, responsive layout, and styles side-by-side with the code.
* **Instant Tailwind CSS:** Tailwind utility classes work out-of-the-box (e.g. `bg-blue-600`, `rounded-2xl`, `shadow-xl`, `flex`, `grid`).
* **Multi-File Projects:** Supports multiple files (e.g., `App.js`, `styles.css`, `index.html`, `components/Button.jsx`).
* **Automated In-Browser Grading:** Automatically runs test assertions against the student's code and rendered DOM (checking tags, Tailwind classes, and button clicks/interactivity), calculating a grade percentage in real time!
* **100% Free & Zero Server Load:** Runs entirely in the student's browser via Sandpack web workers—no Docker or backend servers required.

### JSON Schema for `FRONTEND_EXERCISE`:

#### Example 1: React with Tailwind CSS & Automated Interactivity Test
```json
{
  "type": "FRONTEND_EXERCISE",
  "title": "Interactive Product Card with Tailwind",
  "template": "react",
  "instructions": "### Assignment Goals\n1. Use Tailwind classes to create a card with `rounded-2xl`, `shadow-xl`, and `p-6`.\n2. Implement a count state that increments when the 'Add to Cart' button is clicked.",
  "activeFile": "/App.js",
  "files": {
    "/App.js": "import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div id=\"product-card\" className=\"max-w-sm bg-white p-6 rounded-2xl shadow-xl space-y-4\">\n      <h2 className=\"text-xl font-bold text-gray-900\">Wireless Headphones</h2>\n      <p className=\"text-gray-500\">Studio-grade noise cancellation.</p>\n      <button \n        id=\"add-btn\"\n        onClick={() => setCount(count + 1)}\n        className=\"px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition\">\n        Add to Cart ({count})\n      </button>\n    </div>\n  );\n}"
  },
  "passingScore": 100,
  "tests": [
    {
      "id": "test_heading",
      "description": "Renders product title 'Wireless Headphones'",
      "type": "dom_text",
      "selector": "h2",
      "expected": "Wireless Headphones"
    },
    {
      "id": "test_tailwind_classes",
      "description": "Card uses required Tailwind classes (rounded-2xl, shadow-xl)",
      "type": "class_contains",
      "selector": "#product-card",
      "requiredClasses": ["rounded-2xl", "shadow-xl", "p-6"]
    },
    {
      "id": "test_interactivity",
      "description": "Clicking 'Add to Cart' increments count to 1",
      "type": "interaction",
      "action": "click",
      "targetSelector": "#add-btn",
      "assertSelector": "#add-btn",
      "expectedText": "Add to Cart (1)"
    }
  ]
}
```

#### Example 2: Static HTML & Tailwind CSS
```json
{
  "type": "FRONTEND_EXERCISE",
  "title": "Responsive Hero Banner",
  "template": "static",
  "instructions": "Create a responsive hero banner with a heading and a call-to-action button styled with Tailwind CSS.",
  "activeFile": "/index.html",
  "files": {
    "/index.html": "<div class=\"p-12 text-center bg-slate-900 text-white rounded-3xl\">\n  <h1 class=\"text-4xl font-extrabold\">Build the Future</h1>\n  <p class=\"mt-4 text-slate-400\">Learn practical AI and software engineering skills.</p>\n  <button class=\"mt-6 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-bold\">Get Started</button>\n</div>"
  },
  "tests": [
    {
      "description": "Hero section has dark background",
      "type": "class_contains",
      "selector": "div",
      "requiredClasses": ["bg-slate-900", "text-white"]
    }
  ]
}
```

