# 🧠 NeuroDeck AI — Flam Frontend Internship Assignment Walkthrough

> **Candidate Reference & Submission Document**  
> **Project Choice:** Study Assistant (3D Flashcards + Interactive Knowledge Quiz + Targeted Weak-Spot Review)  
> **Submission Link:** [Google Forms Submission](https://forms.gle/3V2sjQDgXUD8RbHb6)

---

## 📽️ Browser Interactive Demo

The browser subagent verified all core user flows, including 3D card flipping, rating mastery, answering quiz questions, reviewing weak spots, toggling dark/light themes, and saving sessions.

![NeuroDeck AI Interactive Demo](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\study_assistant_demo_1790269362645.webp)

---

## 📸 Key UI Screens

````carousel
![Home Landing Page with Preset Pills & Interviewer Controls](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\neurodeck_home_1790269406222.png)
<!-- slide -->
![Generated Study Deck with Progress Bar & Mastery Badges](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\deck_view_1790269494514.png)
<!-- slide -->
![3D Flipped Flashcard Revealing Answer & Memory Cue](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\flashcard_flipped_1790269551898.png)
<!-- slide -->
![Interactive Quiz with Instant Feedback and Explanations](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\quiz_feedback_1790269725954.png)
<!-- slide -->
![Targeted Weak Spots Cockpit for Focused Repetition](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\weak_spots_tab_1790269806615.png)
<!-- slide -->
![Saved Sessions Drawer with LocalStorage Persistence](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\saved_sessions_panel_open_1790270171656.png)
<!-- slide -->
![Light Theme Mode](C:\Users\K.Bhargav Reddy\.gemini\antigravity-ide\brain\60e49609-1c98-4c2b-8fe5-3cce4136b3a2\light_theme_mode_1790270215217.png)
````

---

## 🎯 Assignment Requirements Matrix

| Requirement | Implementation Detail | Location |
| :--- | :--- | :--- |
| **Not a Chatbot** | Zero raw chat bubbles; all output is structured JSON converted into stateful interactive widgets. | [`ResultView.tsx`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/components/ResultView.tsx) |
| **Free-Form Text Input** | Accepts raw lecture notes, syllabus, complex concepts, or code snippets with presets. | [`PromptInput.tsx`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/components/PromptInput.tsx) |
| **Structured Output Request** | Strict prompt instructing model to return pure JSON according to schema. | [`server/generate.ts`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/server/generate.ts#L22-L55) |
| **Defensive Parsing & Validation** | Strips markdown fences, catches syntax errors, checks object properties, validates array length & types. | [`validateResult.ts`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/lib/validateResult.ts#L33-L170) |
| **Backend Proxy (Key Security)** | Express proxy server on port 3001 keeps API keys out of client bundle. | [`server/generate.ts`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/server/generate.ts) |
| **Stale Response Guard** | `requestId` ref check + `AbortController` cancellation for in-flight requests. | [`App.tsx`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/App.tsx#L85-L165) |
| **Failure Mode Handling** | Explicit states for Malformed JSON, Wrong Shape, Empty Response, Slow Timeout, and Server 500. | [`ErrorState.tsx`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/components/ErrorState.tsx) |
| **Multi-Provider AI Fallback** | Automated cascade: Gemini $\rightarrow$ Groq $\rightarrow$ OpenRouter $\rightarrow$ Ollama $\rightarrow$ Intelligent Mock Generator. | [`server/generate.ts`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/server/generate.ts#L280-L330) |
| **Refinement Loop** | Follow-up prompts edit and augment the deck without losing active mastery state. | [`ResultView.tsx`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/src/components/ResultView.tsx#L275-L345) |
| **Single Start Command** | `npm install && npm start` boots both proxy server and Vite frontend concurrently. | [`package.json`](file:///c:/Users/K.Bhargav%20Reddy/Desktop/Flam%20%E2%80%94%20Frontend%20Internship%20Assignment/package.json#L7-L12) |

---

## 🏛️ Architecture & Data Flow

```mermaid
flowchart TD
    A[User Input: Free-Form Notes / Syllabus] --> B[Frontend Client: App.tsx]
    B -->|Cancel previous AbortController & increment requestId| C[src/lib/api.ts]
    C -->|POST /api/generate| D[Backend Proxy: server/generate.ts]
    
    subgraph Multi-LLM Fallback Cascade
        D -->|1. Try| E[Google Gemini 1.5 Flash]
        E -.->|If error / key missing| F[Groq Cloud: Llama 3.3 70B]
        F -.->|If error / key missing| G[OpenRouter API]
        G -.->|If error / key missing| H[Local Ollama: Llama 3]
        H -.->|If offline / no keys| I[Intelligent Mock Generator]
    end
    
    E --> J[Raw Model Text String]
    F --> J
    G --> J
    H --> J
    I --> J
    
    J -->|Return { raw, provider }| C
    C -->|Deliver to client| K{Stale Guard: currentId === requestId?}
    K -- No: Discard --> L[(Dropped Stale Response)]
    K -- Yes: Continue --> M[Defensive Parser: validateResult.ts]
    
    M -->|Extract JSON / Strip Code Blocks| N{Valid Schema?}
    N -- Invalid / Malformed / Empty --> O[src/components/ErrorState.tsx]
    O -->|Inspect raw output & Retry / Use Fallback| B
    
    N -- Valid Structured StudyDeck --> P[src/components/ResultView.tsx]
    P --> Q[3D FlashcardDeck.tsx]
    P --> R[Interactive QuizView.tsx]
    P --> S[Targeted WeakSpotsView.tsx]
    P --> T[Summary Notes & Outline]
    P -->|Follow-up prompt| U[Refinement Loop Engine]
    U --> D
```

---

## 💡 Evaluator Demo Guide: Simulating Failure Modes

Interviewers and reviewers can easily test error handling directly from the UI:
1. Open the app in browser.
2. In the generator card, click **"Interviewer Controls"**.
3. In the **"Simulate Failure Mode"** dropdown, select any scenario:
   - **Malformed JSON Syntax** $\rightarrow$ verifies JSON parse failure detection and raw output inspector.
   - **Wrong Shape** $\rightarrow$ verifies schema structure checking (detects missing cards array).
   - **Empty Response** $\rightarrow$ verifies detection of 0-byte outputs.
   - **Slow Timeout** $\rightarrow$ verifies client-side 25s timeout and abort controller behavior.
   - **HTTP 500 Upstream Error** $\rightarrow$ verifies proxy error status display.
4. Click **"Generate Study Deck"** to observe graceful recovery options.
