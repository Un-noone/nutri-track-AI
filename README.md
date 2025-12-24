# NutriTrack AI (local LLM + OFF/FDC)

## Docker

This project is intended to run only via containers.

1. Review `.env` (optionally set `FDC_API_KEY`)
2. Start containers: `make docker-up`
3. Ensure the default model is available in Ollama:
   - `make ollama-pull` (explicit), or
   - `make docker-smoke-all` (auto-pulls if missing)
4. Open `http://localhost:3000`

Optional:
N/A.

## Commands

- `make docker-test` runs `npm run test` inside the `web` container
- `make docker-smoke` runs fast smoke scenarios inside the `api` container
- `make docker-smoke-all` runs the full smoke (includes one LLM fallback)
- `make docker-reset` stops containers and removes volumes (useful if dependencies changed)
