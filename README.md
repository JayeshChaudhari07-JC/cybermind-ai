# CyberMind AI

Cybersecurity learning platform: terminal-style chat, quick topics, quizzes, progress, bookmarks and resources.

## Live site
https://jayeshchaudhari07-jc.github.io/cybermind-ai/

## Current AI modes
- Built-in Mentor: no API, no key, no external service. Curated topic responses.
- AgentRouter: optional hosted model via backend secret.
- Anthropic API: optional Claude API via backend secret. Claude web-app Free usage is separate from API billing/credits.

## Secure backend (Cloudflare Workers)
The frontend is GitHub Pages; never place provider API keys in HTML or browser storage. A Worker backend keeps API keys in Cloudflare secrets.

### Deploy
1. Create/sign in to Cloudflare account and open Workers & Pages.
2. Create a Worker named `cybermind-ai-backend`.
3. Copy this repository's `worker.js` into the Worker editor and deploy.
4. In Worker > Settings > Variables and Secrets, configure only providers you intend to use:
   - **Secret** `AGENTROUTER_API_KEY` — AgentRouter API key.
   - **Text variable** `AGENTROUTER_MODEL` — exact model ID from your AgentRouter dashboard (do not assume free credits; check quota/pricing first).
   - **Optional text variable** `AGENTROUTER_BASE_URL` — defaults to `https://agentrouter.org/v1`; if your account documentation shows another compatible base, set it here.
   - **Secret** `ANTHROPIC_API_KEY` — Anthropic Console API key, if you have API credits.
   - **Text variable** `ANTHROPIC_MODEL` — exact model ID enabled in your API account.
5. In CyberMind AI Terminal > AI Provider Settings, paste Worker URL, select provider, Save.
6. Test Backend. Health check shows provider keys configured (does not reveal keys).
7. Chat test: `Explain DNS in beginner Hinglish`.

**Important cost safety:** API requests can use provider credits or incur charges. Do not add provider keys until account dashboard confirms free credits/quota and billing/spend limits are configured. This backend does not promise that any API provider is permanently free.

## Worker endpoints
- `GET /health` — health and configured provider booleans (no secrets returned)
- `POST /chat` — `{provider, question, history}`; provider values: `agentrouter`, `anthropic`, `auto`
- `auto`: AgentRouter first; Anthropic fallback only when configured.
- CORS allows the GitHub Pages origin only. A small per-isolate throttle is included, but it is best-effort and not durable; CORS is not authentication. The Worker is publicly reachable and can still be targeted by non-browser clients. Add Cloudflare durable rate limiting/Turnstile before adding provider credits. Keep billing/spend caps disabled or set to zero where possible.

## Local config
Wrangler config is included. Keep API values in Cloudflare secrets or local `.dev.vars` (never commit). `.gitignore` excludes secret files.

## Limitations / security notes
This is a learning project, not production authentication. Existing login/password reset use browser localStorage and Base64; do not store sensitive data or rely on it as secure auth.
