# Agent roles and data handling

The Codex Lead Agent handles planning, architecture, code review, and final validation.
OpenCode handles only small, well-defined, low-risk implementation tasks delegated by the Codex Lead Agent.
If particle-ai/particle-1:free is unavailable, rate-limited, or errors, stop and report the error. Never switch models.

Never read, print, summarize, transmit, or include API keys, .env files, credentials, secrets, or sensitive data in model context.
OPENROUTER_API_KEY is only for OpenCode authentication; never print it or write it to files.

OpenCode shell commands require approval. Git push and deployment are denied.
