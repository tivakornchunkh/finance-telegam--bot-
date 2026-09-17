# Runtime and Bot Framework

## Context & Decision
We are building a personal finance assistant in Telegram requiring strong type safety, asynchronous handler flow, and conversational confirmation states. We chose **Node.js (TypeScript)** with **`grammY`** over Python/aiogram or Telegraf.

`grammY` offers complete end-to-end TypeScript types, superior middleware architecture, built-in session and conversation plugins for confirmation modes, and clean integration with npm libraries like `googleapis` and `@google/genai`.

