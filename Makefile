-include .env

.PHONY: help docker-up docker-down docker-logs docker-build docker-ps ollama-up ollama-pull ollama-ensure docker-test docker-tests docker-smoke docker-smoke-all

COMPOSE = docker compose -f dockerfiles/docker-compose.yml
OLLAMA_MODEL ?= llama3.2:1b-instruct-q4_K_M

help:
	@echo "Targets:"
	@echo "  docker-up    Start web + ollama via compose"
	@echo "  docker-down  Stop compose stack"
	@echo "  docker-reset Stop and remove volumes"
	@echo "  docker-logs  Tail compose logs"
	@echo "  docker-test  Run npm test in container"
	@echo "  docker-tests Alias for docker-test"
	@echo "  docker-smoke Run smoke script in container"
	@echo "  docker-smoke-all Run full smoke (includes LLM)"
	@echo "  ollama-up    Start only Ollama"
	@echo "  ollama-pull  Pull model in Ollama"

docker-up:
	$(COMPOSE) up --build -d

docker-down:
	$(COMPOSE) down

docker-reset:
	$(COMPOSE) down -v

docker-logs:
	$(COMPOSE) logs -f --tail=200

docker-build:
	$(COMPOSE) build

docker-ps:
	$(COMPOSE) ps

ollama-up:
	$(COMPOSE) up -d ollama

ollama-pull: ollama-up
	$(COMPOSE) exec -T ollama ollama pull $(OLLAMA_MODEL)

docker-test:
	$(COMPOSE) run --rm web sh dockerfiles/entrypoint.sh npm run test

docker-tests: docker-test

ollama-ensure: ollama-up
	$(COMPOSE) exec -T ollama sh -lc 'ollama list | awk '"'"'NR>1{print $$1}'"'"' | grep -Fqx "$(OLLAMA_MODEL)" || ollama pull "$(OLLAMA_MODEL)"'

docker-smoke:
	$(COMPOSE) run --rm api sh dockerfiles/entrypoint.sh npm run smoke

docker-smoke-all: ollama-ensure
	$(COMPOSE) run --rm -e SMOKE_MODE=all api sh dockerfiles/entrypoint.sh npm run smoke
