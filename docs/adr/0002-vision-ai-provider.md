# Multimodal AI Provider for Thai Slip Recognition and Parser

## Context & Decision
The system must parse Thai natural language queries ("จ่าย 55 ข้าว") and inspect Thai bank transfer slips (from K PLUS, SCB, Krungthai, Bangkok Bank, etc.) with zero hallucination of amounts or dates.

We chose **Google Gemini (Gemini 2.5 Flash / 2.0 Flash)** using Structured Outputs (`responseSchema`). Gemini provides industry-leading Thai OCR capability on complex mobile screenshots, low latency (< 1.5s), cost efficiency, and deterministic JSON schemas directly preventing model hallucinations.

