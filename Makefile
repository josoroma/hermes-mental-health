# ═══════════════════════════════════════════════════════════════════════════
#  hermes-mental-health — Makefile
#  Local Setup, Zero Cloud Required
#  Everything is self-contained — no cloud dependency.
# ═════════════════════════════════════════════════════════════════════════

SHELL   := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
MAKEFLAGS += --warn-undefined-variables --no-print-directory

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
VENV         := $(PROJECT_ROOT)/.venv
PYTHON       := $(VENV)/bin/python3
PIP          := $(VENV)/bin/pip
UV           := $(shell command -v uv 2>/dev/null || echo "")
UV_SYNC_FLAGS ?= --inexact
DATA_RAW     := $(PROJECT_ROOT)/data/raw
DATA_MD      := $(PROJECT_ROOT)/data/markdown
DATA_PROCESSED := $(PROJECT_ROOT)/data/processed
HERMES_HOME_DIR  := $(PROJECT_ROOT)/.hermes
HERMES_ENV_FILE  := $(HERMES_HOME_DIR)/.env
MODELS_DIR   := $(PROJECT_ROOT)/models

# ── Parameters (override on CLI) ──────────────────────────────────────────
PATIENT_ID ?=
ASSESSMENT_ID ?=
RESULT_ID ?=
MODEL_NAME ?= qwopus-27b-q4_k_m.gguf
MODEL_URL  ?= https://huggingface.co/Qwopus/Qwopus-27B-GGUF/resolve/main/qwopus-27b-q4_k_m.gguf
LLAMA_PORT ?= 8080
FORM_PORT  ?= 9130
HERMES_DASHBOARD_PORT ?= 9120
HERMES_GATEWAY_PORT  ?= 8642
HERMES_GATEWAY_KEY   ?= change-me-local-dev
HERMES_DESKTOP_ARGS ?=
HERMES_DEFAULT_SKILLS ?= mental-health-core,mental-health-assessment-review,mental-health-patient-summary
HERMES_SKILLS ?= $(HERMES_DEFAULT_SKILLS)
HERMES_BUNDLE ?= mental-health

# ── Colors ──────────────────────────────────────────────────────────────────
C_GREEN  := \033[0;32m
C_YELLOW := \033[0;33m
C_RED    := \033[0;31m
C_CYAN   := \033[0;36m
C_BOLD   := \033[1m
C_RESET  := \033[0m

# ── Default target ─────────────────────────────────────────────────────────
.DEFAULT_GOAL := help

# ═══════════════════════════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: help
help:
	@printf "$(C_BOLD)hermes-mental-health$(C_RESET) — Local mental health assessment platform\n"
	@printf "\n$(C_CYAN)Setup (one time):$(C_RESET)\n"
	@printf "  $(C_GREEN)make install$(C_RESET)          venv + dependencies\n"
	@printf "  $(C_GREEN)make dev$(C_RESET)              dev extras (ruff, pytest)\n"
	@printf "\n$(C_CYAN)Hermes runtime:$(C_RESET)\n"
	@printf "  $(C_GREEN)make hermes-chat$(C_RESET)       Chat with default mental-health skills\n"
	@printf "  $(C_GREEN)make hermes-gateway$(C_RESET)      Hermes API server at http://127.0.0.1:$(HERMES_GATEWAY_PORT) (Create With AI)\n"
	@printf "  $(C_GREEN)make hermes-gateway-curl-test$(C_RESET)  Test gateway: POST /v1/runs\n"
	@printf "  $(C_GREEN)make hermes-dashboard$(C_RESET)  Dashboard at http://127.0.0.1:$(HERMES_DASHBOARD_PORT)\n"
	@printf "  $(C_GREEN)make hermes-desktop$(C_RESET)   Launch Hermes Desktop with this repo's .hermes/\n"
	@printf "  $(C_GREEN)make hermes-update$(C_RESET)     Sync this repo's .hermes/ config\n"
	@printf "\\n$(C_CYAN)Hermes agents:$(C_RESET)\\n"
	@printf "  $(C_GREEN)make agent-assessment-review$(C_RESET)    Review patient assessment + score + interpret\n"
	@printf "  $(C_GREEN)make agent-patient-intake$(C_RESET)       New patient intake workflow\n"
	@printf "  $(C_GREEN)make agent-patient-progress$(C_RESET)     Weekly progress summary + trends\n"
	@printf "  $(C_GREEN)make agent-privacy-audit$(C_RESET)        Audit session output for PHI leakage\n"
	@printf "\\n$(C_CYAN)Hermes hooks:$(C_RESET)\\n"
	@printf "  $(C_GREEN)make hooks-test$(C_RESET)        Test patient-scope-guard + output-privacy-review hooks\n"
	@printf "\\n$(C_CYAN)Skill bundles:$(C_RESET)\\n"
	@printf "  $(C_GREEN)make hermes-chat-bundle BUNDLE=assessment-review$(C_RESET)  Chat with a skill bundle\n"
	@printf "  Bundles: mental-health | assessment-review | patient-session | care-plan | safety-check\n"
	@printf "\n$(C_CYAN)Local model (no internet needed):$(C_RESET)\n"
	@printf "  $(C_GREEN)make model-download-gguf$(C_RESET)  Download GGUF quant (default: Qwopus 27B Q4_K_M)\n"
	@printf "  $(C_GREEN)make llama-server$(C_RESET)        Serve at http://127.0.0.1:$(LLAMA_PORT)\n"
	@printf "  $(C_YELLOW)Note:$(C_RESET) config.yaml has 'llama-local' provider -> http://127.0.0.1:$(LLAMA_PORT)/v1\n"
	@printf "         Select 'llama-local' in Hermes -> fully offline on your machine.\n"
	@printf "\n$(C_CYAN)OpenRouter (internet required):$(C_RESET)\n"
	@printf "  export OPENROUTER_API_KEY=...\n"
	@printf "  $(C_GREEN)make hermes-chat$(C_RESET)\n"
	@printf "  Default: openrouter + deepseek/deepseek-v4-pro. Edit .hermes/config.yaml to change.\n"
	@printf "\n$(C_CYAN)Patients and assessments:$(C_RESET)\n"
	@printf "  $(C_GREEN)make form-server$(C_RESET)                    Start at http://127.0.0.1:$(FORM_PORT)\n"
	@printf "  $(C_GREEN)make patient-init PATIENT_ID=patient-001$(C_RESET)\n"
	@printf "  $(C_GREEN)make assessment-invite PATIENT_ID=patient-001 ASSESSMENT_ID=phq-9$(C_RESET)\n"
	@printf "  $(C_GREEN)make assessment-graph PATIENT_ID=patient-001 RESULT_ID=phq-9-...$(C_RESET)\n"
	@printf "\\n$(C_CYAN)Data & Corpus:$(C_RESET)\\n"
		@printf "  $(C_GREEN)make data-init$(C_RESET)          Create data/ dirs\n"
		@printf "  $(C_GREEN)make assessment-templates$(C_RESET) Generate PHQ-9, GAD-7, PCL-5, WHO-5 templates\n"
		@printf "  $(C_GREEN)make dsm-corpus-generate-templates$(C_RESET) Generate JSON templates from corpus\n"
				@printf "  $(C_GREEN)make dsm-corpus-build-index$(C_RESET) Build template catalog index\n"
				@printf "  $(C_GREEN)make dsm-corpus-sync$(C_RESET)     Full sync: corpus → templates → index\n"
		@printf "  $(C_GREEN)make status$(C_RESET)             Show current state\n"
	@printf "\n$(C_CYAN)Development:$(C_RESET)\n"
	@printf "  $(C_GREEN)make lint$(C_RESET)               Ruff linter check\n"
	@printf "  $(C_GREEN)make format$(C_RESET)             Ruff auto-format\n"
	@printf "  $(C_GREEN)make test$(C_RESET)               Run pytest\n"
	@printf "\n$(C_CYAN)Next.js App:$(C_RESET)\n"
	@printf "  $(C_GREEN)make dev-app$(C_RESET)              Install npm dependencies\n"
	@printf "  $(C_GREEN)make dev-server$(C_RESET)           Start dev server → http://localhost:3000\n"
	@printf "  $(C_GREEN)make build-app$(C_RESET)            Production build\n"
	@printf "  $(C_GREEN)make typecheck-app$(C_RESET)        tsc --noEmit\n"
	@printf "  $(C_GREEN)make test-app$(C_RESET)             Run vitest tests\n"
	@printf "  $(C_GREEN)make lint-app$(C_RESET)             ESLint\n"
	@printf "\n$(C_CYAN)Maintenance:$(C_RESET)\n"
	@printf "  $(C_GREEN)make clean$(C_RESET)              Remove data/ (preserves venv)\n"
	@printf "  $(C_GREEN)make clean-venv$(C_RESET)         Remove .venv only\n"
	@printf "  $(C_GREEN)make reset$(C_RESET)              Factory reset: nuke everything, reinstall\n"
	@printf "\n$(C_YELLOW)Variables (override on CLI):$(C_RESET)\n"
	@printf "  PATIENT_ID=...  ASSESSMENT_ID=...  RESULT_ID=...\n"
	@printf "  MODEL_NAME=...  MODEL_URL=...   LLAMA_PORT=8080  FORM_PORT=9130\n"

# ═══════════════════════════════════════════════════════════════════════════
#  Environment
# ═══════════════════════════════════════════════════════════════════════════

$(VENV):
	@printf "$(C_CYAN)->$(C_RESET) Creating Python 3.12+ virtualenv...\n"
	@python3.12 -m venv $(VENV) || python3 -m venv $(VENV) --upgrade
	@printf "$(C_GREEN)v$(C_RESET) virtualenv created at $(VENV)\n"
	@$(PIP) install --upgrade pip setuptools wheel > /dev/null 2>&1

.PHONY: install
install: $(VENV) sync
	@printf "$(C_GREEN)v$(C_RESET) Install complete\n"
	@printf "  Run $(C_BOLD)make hermes-chat$(C_RESET) to start\n"

.PHONY: sync
sync: $(VENV)
	@printf "$(C_CYAN)->$(C_RESET) Syncing dependencies...\n"
ifdef UV
	@cd $(PROJECT_ROOT) && uv sync $(UV_SYNC_FLAGS) > /dev/null 2>&1
	@printf "$(C_GREEN)v$(C_RESET) Dependencies synced via uv\n"
else
	@$(PIP) install -e "." > /dev/null 2>&1
	@printf "$(C_GREEN)v$(C_RESET) Dependencies synced via pip\n"
endif

.PHONY: dev
dev: $(VENV)
	@printf "$(C_CYAN)->$(C_RESET) Installing dev dependencies (ruff, pytest)...\n"
ifdef UV
	@cd $(PROJECT_ROOT) && uv sync $(UV_SYNC_FLAGS) --extra dev > /dev/null 2>&1
else
	@$(PIP) install -e ".[dev]" > /dev/null 2>&1
endif
	@printf "$(C_GREEN)v$(C_RESET) Dev dependencies installed\n"

# ═══════════════════════════════════════════════════════════════════════════
#  Hermes Runtime
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: hermes-chat
hermes-chat:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting Hermes with mental-health skills...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "$(HERMES_SKILLS)"

.PHONY: hermes-dashboard
hermes-dashboard:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@if command -v lsof > /dev/null 2>&1 && lsof -tiTCP:$(HERMES_DASHBOARD_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
		LISTENER_PID=$$(lsof -tiTCP:$(HERMES_DASHBOARD_PORT) -sTCP:LISTEN | head -n 1); \
		LISTENER_CMD=$$(ps -ww -p $$LISTENER_PID -o command= 2>/dev/null || true); \
		if printf '%s' "$$LISTENER_CMD" | grep -Eq 'hermes|hermes_cli|Python|python'; then \
			printf "$(C_YELLOW)->$(C_RESET) Stopping existing Hermes dashboard on port $(HERMES_DASHBOARD_PORT) (pid $$LISTENER_PID)...\n"; \
			kill $$LISTENER_PID; \
			for _ in {1..60}; do \
				if ! lsof -tiTCP:$(HERMES_DASHBOARD_PORT) -sTCP:LISTEN > /dev/null 2>&1; then break; fi; \
				/bin/sleep 0.5; \
			done; \
			if lsof -tiTCP:$(HERMES_DASHBOARD_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
				printf "$(C_RED)x$(C_RESET) Existing dashboard did not release port $(HERMES_DASHBOARD_PORT). Stop pid $$LISTENER_PID and retry.\n"; \
				exit 1; \
			fi; \
		else \
			printf "$(C_RED)x$(C_RESET) Port $(HERMES_DASHBOARD_PORT) already in use by pid $$LISTENER_PID: $$LISTENER_CMD\n"; \
			exit 1; \
		fi; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting Hermes dashboard at http://127.0.0.1:$(HERMES_DASHBOARD_PORT)...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		DASHBOARD_EXIT=0; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes dashboard --host "127.0.0.1" --port "$(HERMES_DASHBOARD_PORT)" || DASHBOARD_EXIT=$$?; \
		if [ "$$DASHBOARD_EXIT" = "130" ] || [ "$$DASHBOARD_EXIT" = "143" ]; then \
			printf "$(C_YELLOW)->$(C_RESET) Hermes dashboard stopped\n"; exit 0; \
		fi; \
		exit $$DASHBOARD_EXIT

.PHONY: hermes-desktop
hermes-desktop:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@mkdir -p "$(HERMES_HOME_DIR)"
	@printf "$(C_CYAN)->$(C_RESET) Launching Hermes Desktop with HERMES_HOME=$(HERMES_HOME_DIR)...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes desktop $(HERMES_DESKTOP_ARGS)

.PHONY: hermes-update
hermes-update:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@mkdir -p "$(HERMES_HOME_DIR)"
	@printf "$(C_CYAN)->$(C_RESET) Updating Hermes for this repo\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes update
	@printf "$(C_GREEN)v$(C_RESET) Hermes update complete\n"

# ── Hermes Gateway (API server for Create With AI) ──────────────────────

.PHONY: hermes-gateway
hermes-gateway:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@if command -v lsof > /dev/null 2>&1 && lsof -tiTCP:$(HERMES_GATEWAY_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
		LISTENER_PID=$$(lsof -tiTCP:$(HERMES_GATEWAY_PORT) -sTCP:LISTEN | head -n 1); \
		LISTENER_CMD=$$(ps -ww -p $$LISTENER_PID -o command= 2>/dev/null || true); \
		if printf '%s' "$$LISTENER_CMD" | grep -Eq 'hermes|hermes_cli|Python|python'; then \
			printf "$(C_YELLOW)->$(C_RESET) Stopping existing Hermes gateway on port $(HERMES_GATEWAY_PORT) (pid $$LISTENER_PID)...\n"; \
			kill $$LISTENER_PID; \
			for _ in {1..60}; do \
				if ! lsof -tiTCP:$(HERMES_GATEWAY_PORT) -sTCP:LISTEN > /dev/null 2>&1; then break; fi; \
				/bin/sleep 0.5; \
			done; \
			if lsof -tiTCP:$(HERMES_GATEWAY_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
				printf "$(C_RED)x$(C_RESET) Existing gateway did not release port $(HERMES_GATEWAY_PORT). Stop pid $$LISTENER_PID and retry.\n"; \
				exit 1; \
			fi; \
		else \
			printf "$(C_RED)x$(C_RESET) Port $(HERMES_GATEWAY_PORT) already in use by pid $$LISTENER_PID: $$LISTENER_CMD\n"; \
			exit 1; \
		fi; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting Hermes gateway at http://127.0.0.1:$(HERMES_GATEWAY_PORT)...\n"
	@printf "  Model: $(C_BOLD)deepseek/deepseek-v4-pro$(C_RESET) (openrouter)\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" \
		API_SERVER_ENABLED=true \
		API_SERVER_KEY="$(HERMES_GATEWAY_KEY)" \
		hermes gateway

.PHONY: hermes-gateway-curl-test
hermes-gateway-curl-test:
	@printf "$(C_CYAN)->$(C_RESET) Testing Hermes gateway at http://127.0.0.1:$(HERMES_GATEWAY_PORT)...\n"
	@response=$$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$(HERMES_GATEWAY_PORT)/v1/runs 2>&1); \
	if [ "$$response" = "000" ]; then \
		printf "$(C_RED)x$(C_RESET) Gateway not reachable. Run $(C_BOLD)make hermes-gateway$(C_RESET) first.\n"; \
		exit 1; \
	fi
	@printf "$(C_GREEN)v$(C_RESET) Gateway is up. Sending test run...\n"
	@curl -s http://127.0.0.1:$(HERMES_GATEWAY_PORT)/v1/runs \
		-H "Authorization: Bearer $(HERMES_GATEWAY_KEY)" \
		-H "Content-Type: application/json" \
		-d '{"input":"/goal Reply with just: OK","instructions":"Minimal test"}' | python3 -m json.tool

# ═══════════════════════════════════════════════════════════════════════════
#  Hermes Agents (named agent configurations from .hermes/agents/)
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: agent-assessment-review
agent-assessment-review:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting assessment review agent...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "mental-health-core,mental-health-assessment-review,mental-health-patient-summary"

.PHONY: agent-patient-intake
agent-patient-intake:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting patient intake agent...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "mental-health-core,mental-health-patient-summary"

.PHONY: agent-patient-progress
agent-patient-progress:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting weekly progress agent...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "mental-health-core,mental-health-patient-summary"

.PHONY: agent-privacy-audit
agent-privacy-audit:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting privacy audit agent...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "mental-health-core"

# ═══════════════════════════════════════════════════════════════════════════
#  Hermes Hooks
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: hooks-test
hooks-test:
	@printf "$(C_CYAN)->$(C_RESET) Testing patient-scope-guard hook...\n"
	@HERMES_PATIENT_ID="patient-001" HERMES_ACTIVE_PATIENT_ID="patient-001" HERMES_TOOL_NAME="read_file" \
		bash "$(HERMES_HOME_DIR)/hooks/patient-scope-guard.sh" && \
		printf "$(C_GREEN)v$(C_RESET) Same-patient access ALLOWED (correct)\n" || true
	@printf "$(C_CYAN)->$(C_RESET) Testing cross-patient block...\n"
	@HERMES_PATIENT_ID="patient-002" HERMES_ACTIVE_PATIENT_ID="patient-001" HERMES_TOOL_NAME="read_file" \
		bash "$(HERMES_HOME_DIR)/hooks/patient-scope-guard.sh" && \
		printf "$(C_RED)x$(C_RESET) Cross-patient access should have been BLOCKED\n" || \
		printf "$(C_GREEN)v$(C_RESET) Cross-patient access BLOCKED (correct)\n"
	@printf "$(C_CYAN)->$(C_RESET) Testing output-privacy-review hook...\n"
	@HERMES_RESPONSE_TEXT="Clinical note for patient-001: stable mood." HERMES_DELIVERY_TARGET="cli" \
		bash "$(HERMES_HOME_DIR)/hooks/output-privacy-review.sh" && \
		printf "$(C_GREEN)v$(C_RESET) Clean output passed review (correct)\n" || true
	@printf "$(C_CYAN)->$(C_RESET) Testing PHI detection...\n"
	@HERMES_RESPONSE_TEXT="Patient email: jane@example.com phone: (555) 123-4567" HERMES_DELIVERY_TARGET="cli" \
		bash "$(HERMES_HOME_DIR)/hooks/output-privacy-review.sh" && \
		printf "$(C_YELLOW)!!$(C_RESET) PHI detected (warnings above expected)\n" || true
	@printf "$(C_GREEN)v$(C_RESET) Hook tests complete\n"

# ═══════════════════════════════════════════════════════════════════════════
#  Hermes Skill Bundles (from .hermes/skill-bundles/)
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: hermes-chat-bundle
hermes-chat-bundle:
	@if ! command -v hermes > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) hermes command not found. Install Hermes first.\n"; \
		exit 1; \
	fi
	@BUNDLE_FILE="$(HERMES_HOME_DIR)/skill-bundles/$(HERMES_BUNDLE).yaml"; \
	if [ ! -f "$$BUNDLE_FILE" ]; then \
		printf "$(C_RED)x$(C_RESET) Bundle not found: $(HERMES_BUNDLE) ($$BUNDLE_FILE)\n"; \
		printf "Available: mental-health assessment-review patient-session care-plan safety-check\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Starting Hermes with bundle: $(HERMES_BUNDLE)...\n"
	@cd $(PROJECT_ROOT) && \
		if [ -f "$(HERMES_ENV_FILE)" ]; then set -a; source "$(HERMES_ENV_FILE)"; set +a; fi; \
		HERMES_HOME="$(HERMES_HOME_DIR)" hermes chat --skills "$(if $(filter mental-health,$(HERMES_BUNDLE)),mental-health-core,mental-health-scoping,mental-health-commands,mental-health-assessment-review,mental-health-patient-summary,mental-health-assessment-invite,mental-health-results,mental-health-editor,mental-health-dashboard,mental-health-care-plan,mental-health-safety,mental-health-corpus,mental-health-video,$(if $(filter assessment-review,$(HERMES_BUNDLE)),mental-health-core,mental-health-assessment-review,mental-health-results,$(if $(filter patient-session,$(HERMES_BUNDLE)),mental-health-core,mental-health-scoping,mental-health-patient-summary,mental-health-assessment-invite,mental-health-care-plan,$(if $(filter care-plan,$(HERMES_BUNDLE)),mental-health-core,mental-health-patient-summary,mental-health-care-plan,mental-health-assessment-review,$(if $(filter safety-check,$(HERMES_BUNDLE)),mental-health-core,mental-health-safety,mental-health-assessment-review,$(HERMES_DEFAULT_SKILLS))))))"

# ═══════════════════════════════════════════════════════════════════════════
#  Local Model (llama.cpp GGUF — no internet needed)
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: model-download-gguf
model-download-gguf:
	@mkdir -p "$(MODELS_DIR)"
	@if [ -f "$(MODELS_DIR)/$(MODEL_NAME)" ]; then \
		printf "$(C_GREEN)v$(C_RESET) Model already cached: $(MODELS_DIR)/$(MODEL_NAME)\n"; \
	else \
		printf "$(C_CYAN)->$(C_RESET) Downloading $(MODEL_NAME)...\n"; \
		if command -v curl > /dev/null 2>&1; then \
			curl -L -C - --progress-bar -o "$(MODELS_DIR)/$(MODEL_NAME)" "$(MODEL_URL)"; \
		elif command -v wget > /dev/null 2>&1; then \
			wget -c -q --show-progress -O "$(MODELS_DIR)/$(MODEL_NAME)" "$(MODEL_URL)"; \
		else \
			printf "$(C_RED)x$(C_RESET) Neither curl nor wget found. Install one of them.\n"; \
			exit 1; \
		fi; \
		printf "$(C_GREEN)v$(C_RESET) Model downloaded to $(MODELS_DIR)/$(MODEL_NAME)\n"; \
	fi

.PHONY: llama-server
llama-server:
	@if ! command -v llama-server > /dev/null 2>&1; then \
		printf "$(C_RED)x$(C_RESET) llama-server not found. Install llama.cpp:\n"; \
		printf "  brew install llamacpp    # macOS\n"; \
		printf "  or build from https://github.com/ggerganov/llama.cpp\n"; \
		exit 1; \
	fi
	@if [ ! -f "$(MODELS_DIR)/$(MODEL_NAME)" ]; then \
		printf "$(C_YELLOW)!!$(C_RESET) Model not found. Running $(C_BOLD)make model-download-gguf$(C_RESET) first...\n"; \
		$(MAKE) model-download-gguf; \
	fi
	@if command -v lsof > /dev/null 2>&1 && lsof -tiTCP:$(LLAMA_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
		printf "$(C_GREEN)v$(C_RESET) llama-server already running on port $(LLAMA_PORT)\n"; \
	else \
		printf "$(C_CYAN)->$(C_RESET) Starting llama-server on http://127.0.0.1:$(LLAMA_PORT)...\n"; \
		printf "  Provider URL for Hermes: $(C_BOLD)http://127.0.0.1:$(LLAMA_PORT)/v1$(C_RESET)\n"; \
		llama-server -m "$(MODELS_DIR)/$(MODEL_NAME)" --port $(LLAMA_PORT) --host 127.0.0.1 -ngl 99 & \
	fi

# ═══════════════════════════════════════════════════════════════════════════
#  Patients and Assessments
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: form-server
form-server: $(VENV)
	@if command -v lsof > /dev/null 2>&1 && lsof -tiTCP:$(FORM_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
		printf "$(C_GREEN)v$(C_RESET) Form server already running on port $(FORM_PORT)\n"; \
	else \
		printf "$(C_CYAN)->$(C_RESET) Starting form server at http://127.0.0.1:$(FORM_PORT)...\n"; \
		cd $(PROJECT_ROOT) && $(PYTHON) -m hermes_mental_health.forms --port $(FORM_PORT) & \
	fi

.PHONY: patient-init
patient-init:
	@if [ -z "$(PATIENT_ID)" ]; then \
		printf "$(C_RED)x$(C_RESET) PATIENT_ID required. Example: $(C_BOLD)make patient-init PATIENT_ID=patient-001$(C_RESET)\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Initializing patient record: $(PATIENT_ID)\n"
	@mkdir -p "$(DATA_PROCESSED)/patients/$(PATIENT_ID)"
	@printf "patient_id: $(PATIENT_ID)\ncreated_at: $$(date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ)\nstatus: active\n" \
		> "$(DATA_PROCESSED)/patients/$(PATIENT_ID)/profile.yaml"
	@printf "$(C_GREEN)v$(C_RESET) Patient $(PATIENT_ID) initialized\n"

.PHONY: assessment-invite
assessment-invite:
	@if [ -z "$(PATIENT_ID)" ]; then \
		printf "$(C_RED)x$(C_RESET) PATIENT_ID required. Example: $(C_BOLD)make assessment-invite PATIENT_ID=patient-001 ASSESSMENT_ID=phq-9$(C_RESET)\n"; \
		exit 1; \
	fi
	@if [ -z "$(ASSESSMENT_ID)" ]; then \
		printf "$(C_RED)x$(C_RESET) ASSESSMENT_ID required (phq-9, gad-7, pcl-5, who-5, etc.)\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Creating assessment invite: $(ASSESSMENT_ID) for $(PATIENT_ID)\n"
	@mkdir -p "$(DATA_PROCESSED)/patients/$(PATIENT_ID)/assessments"
	@INVITE_ID=$$(date -u +%%Y%%m%%d-%%H%%M%%S); \
	printf "assessment_id: $(ASSESSMENT_ID)\ninvite_id: $$INVITE_ID\npatient_id: $(PATIENT_ID)\ncreated_at: $$(date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ)\nstatus: pending\n" \
		> "$(DATA_PROCESSED)/patients/$(PATIENT_ID)/assessments/$$INVITE_ID-$(ASSESSMENT_ID).yaml"
	@printf "$(C_GREEN)v$(C_RESET) Assessment invite created for $(PATIENT_ID) ($(ASSESSMENT_ID))\n"

.PHONY: assessment-graph
assessment-graph:
	@if [ -z "$(PATIENT_ID)" ]; then \
		printf "$(C_RED)x$(C_RESET) PATIENT_ID required\n"; \
		exit 1; \
	fi
	@if [ -z "$(RESULT_ID)" ]; then \
		printf "$(C_RED)x$(C_RESET) RESULT_ID required. Example: RESULT_ID=phq-9-20260620-120000\n"; \
		exit 1; \
	fi
	@printf "$(C_CYAN)->$(C_RESET) Generating graph for $(PATIENT_ID) / $(RESULT_ID)...\n"
	@if [ -f "$(DATA_PROCESSED)/patients/$(PATIENT_ID)/results/$(RESULT_ID).json" ]; then \
		$(PYTHON) -m hermes_mental_health.graph --patient-id "$(PATIENT_ID)" --result-id "$(RESULT_ID)"; \
	else \
		printf "$(C_YELLOW)!!$(C_RESET) Result file not found: data/processed/patients/$(PATIENT_ID)/results/$(RESULT_ID).json\n"; \
	fi

# ═══════════════════════════════════════════════════════════════════════════
#  Development
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: lint
lint:
	@if command -v ruff > /dev/null 2>&1; then \
		printf "$(C_CYAN)->$(C_RESET) Running ruff linter...\n"; \
		ruff check hermes_mental_health/; \
		printf "$(C_GREEN)v$(C_RESET) Lint clean\n"; \
	else \
		printf "$(C_YELLOW)!!$(C_RESET) ruff not installed — run $(C_BOLD)make dev$(C_RESET) first\n"; \
	fi

.PHONY: format
format:
	@if command -v ruff > /dev/null 2>&1; then \
		printf "$(C_CYAN)->$(C_RESET) Running ruff format...\n"; \
		ruff format hermes_mental_health/; \
		printf "$(C_GREEN)v$(C_RESET) Format complete\n"; \
	else \
		printf "$(C_YELLOW)!!$(C_RESET) ruff not installed — run $(C_BOLD)make dev$(C_RESET) first\n"; \
	fi

.PHONY: test
test:
	@if command -v pytest > /dev/null 2>&1; then \
		printf "$(C_CYAN)->$(C_RESET) Running tests...\n"; \
		cd $(PROJECT_ROOT) && $(PYTHON) -m pytest; \
		printf "$(C_GREEN)v$(C_RESET) Tests passed\n"; \
	else \
		printf "$(C_YELLOW)!!$(C_RESET) pytest not installed — run $(C_BOLD)make dev$(C_RESET) first\n"; \
	fi

.PHONY: type-check
type-check:
	@if [ -f "$(PROJECT_ROOT)/tsconfig.json" ]; then \
		printf "$(C_CYAN)->$(C_RESET) Running TypeScript type check...\n"; \
		cd $(PROJECT_ROOT) && npm run type-check; \
		printf "$(C_GREEN)v$(C_RESET) Type check clean\n"; \
	else \
		printf "$(C_YELLOW)!!$(C_RESET) No tsconfig.json found — skip TypeScript\n"; \
	fi

# ═══════════════════════════════════════════════════════════════════════════
#  Next.js App
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: dev-app
dev-app:
	@printf "$(C_CYAN)->$(C_RESET) Installing npm dependencies...\n"
	@cd $(PROJECT_ROOT) && npm install
	@printf "$(C_GREEN)v$(C_RESET) npm dependencies installed\n"

.PHONY: dev-server
dev-server:
	@printf "$(C_CYAN)->$(C_RESET) Starting Next.js dev server...\n"
	@printf "  → http://localhost:3000\n"
	@cd $(PROJECT_ROOT) && npm run dev

.PHONY: build-app
build-app:
	@printf "$(C_CYAN)->$(C_RESET) Building Next.js for production...\n"
	@cd $(PROJECT_ROOT) && npm run build
	@printf "$(C_GREEN)v$(C_RESET) Build complete\n"

.PHONY: typecheck-app
typecheck-app:
	@printf "$(C_CYAN)->$(C_RESET) Running tsc --noEmit...\n"
	@cd $(PROJECT_ROOT) && npm run typecheck
	@printf "$(C_GREEN)v$(C_RESET) Type check clean\n"

.PHONY: test-app
test-app:
	@printf "$(C_CYAN)->$(C_RESET) Running vitest...\n"
	@cd $(PROJECT_ROOT) && npm test
	@printf "$(C_GREEN)v$(C_RESET) Tests passed\n"

.PHONY: lint-app
lint-app:
	@printf "$(C_CYAN)->$(C_RESET) Running ESLint...\n"
	@cd $(PROJECT_ROOT) && npm run lint
	@printf "$(C_GREEN)v$(C_RESET) Lint clean\n"

# ═══════════════════════════════════════════════════════════════════════════
#  Data & Corpus
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: data-init
data-init:
	@printf "$(C_CYAN)->$(C_RESET) Creating data directories...\n"
	@mkdir -p "$(DATA_RAW)/pdfs"
	@mkdir -p "$(DATA_RAW)/forms"
	@mkdir -p "$(DATA_MD)/assessments"
	@mkdir -p "$(DATA_MD)/protocols"
	@mkdir -p "$(DATA_MD)/guidelines"
	@mkdir -p "$(DATA_PROCESSED)/patients"
	@mkdir -p "$(DATA_PROCESSED)/results"
	@printf "$(C_GREEN)v$(C_RESET) Data directories created\n"
	@printf "  $(C_BOLD)data/raw/$(C_RESET)       — PDFs, original forms\n"
	@printf "  $(C_BOLD)data/markdown/$(C_RESET)  — Assessment templates, protocols, clinical guidelines\n"
	@printf "  $(C_BOLD)data/processed/$(C_RESET) — Patient records, assessment results\n"

.PHONY: assessment-templates
assessment-templates:
	@printf "$(C_CYAN)->$(C_RESET) Generating standard assessment templates...\n"
	@mkdir -p "$(DATA_MD)/assessments"
	@# PHQ-9
	@printf "# PHQ-9 — Patient Health Questionnaire\n\n## Overview\nScreens for depression severity over the past 2 weeks.\n\n## Items (score 0-3 each)\n\n1. Little interest or pleasure in doing things\n2. Feeling down, depressed, or hopeless\n3. Trouble falling/staying asleep, or sleeping too much\n4. Feeling tired or having little energy\n5. Poor appetite or overeating\n6. Feeling bad about yourself\n7. Trouble concentrating on things\n8. Moving/speaking slowly, or being fidgety/restless\n9. Thoughts you would be better off dead or hurting yourself\n\n## Scoring\n| Range  | Severity      |\n|--------|---------------|\n| 0-4    | Minimal       |\n| 5-9    | Mild          |\n| 10-14  | Moderate      |\n| 15-19  | Moderately severe |\n| 20-27  | Severe        |\n" > "$(DATA_MD)/assessments/phq-9.md"
	@# GAD-7
	@printf "# GAD-7 — Generalized Anxiety Disorder\n\n## Overview\nScreens for anxiety severity over the past 2 weeks.\n\n## Items (score 0-3 each)\n\n1. Feeling nervous, anxious, or on edge\n2. Not being able to stop or control worrying\n3. Worrying too much about different things\n4. Trouble relaxing\n5. Being so restless that it is hard to sit still\n6. Becoming easily annoyed or irritable\n7. Feeling afraid as if something awful might happen\n\n## Scoring\n| Range  | Severity |\n|--------|----------|\n| 0-4    | Minimal  |\n| 5-9    | Mild     |\n| 10-14  | Moderate |\n| 15-21  | Severe   |\n" > "$(DATA_MD)/assessments/gad-7.md"
	@# PCL-5
	@printf "# PCL-5 — PTSD Checklist for DSM-5\n\n## Overview\nMeasures PTSD symptom severity over the past month.\n\n## Clusters\n- **B** (1-5): Intrusion symptoms\n- **C** (6-7): Avoidance\n- **D** (8-14): Negative alterations in cognition and mood\n- **E** (15-20): Alterations in arousal and reactivity\n\n## Items (score 0-4 each, 0=Not at all, 4=Extremely)\n\n1. Repeated, disturbing memories\n2. Repeated, disturbing dreams\n3. Suddenly feeling as if the event were happening again\n4. Feeling very upset when something reminds you\n5. Physical reactions when reminded\n6. Avoiding memories, thoughts, feelings\n7. Avoiding external reminders\n8. Trouble remembering important parts\n9. Strong negative beliefs about yourself or others\n10. Blaming yourself or others\n11. Strong negative feelings (fear, horror, anger, guilt, shame)\n12. Loss of interest in activities\n13. Feeling distant or cut off\n14. Trouble experiencing positive feelings\n15. Irritable behavior, angry outbursts\n16. Taking too many risks\n17. Being superalert or watchful\n18. Feeling jumpy or easily startled\n19. Difficulty concentrating\n20. Trouble falling or staying asleep\n\n## Scoring\nSum all items. Provisional PTSD diagnosis: score >= 33.\n" > "$(DATA_MD)/assessments/pcl-5.md"
	@# WHO-5
	@printf "# WHO-5 — World Health Organization Well-Being Index\n\n## Overview\nMeasures subjective psychological well-being over the past 2 weeks.\n\n## Items (score 0-5 each, 0=At no time, 5=All of the time)\n\n1. I have felt cheerful and in good spirits\n2. I have felt calm and relaxed\n3. I have felt active and vigorous\n4. I woke up feeling fresh and rested\n5. My daily life has been filled with things that interest me\n\n## Scoring\nRaw score range: 0-25. Multiply by 4 for percentage score (0-100).\nScore <= 50 suggests screening for depression.\n" > "$(DATA_MD)/assessments/who-5.md"
	@printf "$(C_GREEN)v$(C_RESET) Templates generated: PHQ-9, GAD-7, PCL-5, WHO-5\n"

DATA_CORPUS := $(PROJECT_ROOT)/data/corpus/assessment-measures

.PHONY: dsm-corpus-download
dsm-corpus-download:
	@printf "$(C_CYAN)->$(C_RESET) Downloading and converting all APA DSM-5-TR assessment measures...\n"
	@printf "  Source: psychiatry.org/dsm/educational-resources/assessment-measures\n"
	@printf "  PDFs -> $(DATA_CORPUS)/\n"
	@printf "  HTML -> $(DATA_CORPUS)/html/\n"
	@$(PYTHON) scripts/download_assessment_measures.py

.PHONY: dsm-corpus-verify
dsm-corpus-verify:
	@printf "$(C_CYAN)->$(C_RESET) Verifying Markdown quality...\n"
	@$(PYTHON) -c "\
import json; from pathlib import Path; \
m = json.load(open('$(DATA_CORPUS)/manifest.json')); \
md_dir = Path('$(DATA_CORPUS)/markdown'); items = m['items']; \
ok = sum(1 for i in items if (md_dir / f\"{i['slug']}.md\").exists()); \
print(f'  Markdown: {ok}/{len(items)} files'); \
"

.PHONY: dsm-corpus-markdown
dsm-corpus-markdown:
	@printf "$(C_CYAN)->$(C_RESET) Converting PDFs to structured Markdown...\n"
	@$(PYTHON) scripts/convert_to_markdown.py

.PHONY: dsm-corpus-status
dsm-corpus-status:
	@if [ -f "$(DATA_CORPUS)/manifest.json" ]; then \
		$(PYTHON) -c "\
import json; \
m = json.load(open('$(DATA_CORPUS)/manifest.json')); \
print(f'  DSM-5-TR Assessment Measures:'); \
print(f'    PDFs: {m[\"ok\"]} ok, {m[\"empty\"]} empty, {m[\"failed_download\"]} failed'); \
print(f'    Total items in manifest: {m[\"total\"]}'); \
pdfs = len([f for f in __import__('pathlib').Path('$(DATA_CORPUS)').glob('*.pdf')]); \
htmls = len([f for f in __import__('pathlib').Path('$(DATA_CORPUS)/html').glob('*.html')]); \
print(f'    Files on disk: {pdfs} PDFs, {htmls} HTMLs'); \
"; \
	else \
		printf "$(C_YELLOW)[]$(C_RESET) No DSM corpus yet — run $(C_BOLD)make dsm-corpus-download$(C_RESET)\n"; \
	fi

.PHONY: dsm-corpus-generate-templates
dsm-corpus-generate-templates:
	@printf "$(C_CYAN)->$(C_RESET) Generating schema-conformant assessment templates from corpus...\n"
	@printf "  Corpus: $(DATA_CORPUS)/*.md ($(shell ls $(DATA_CORPUS)/*.md 2>/dev/null | wc -l | tr -d ' ') files)\n"
	@printf "  Output: data/shared/templates/json/\n"
	@cd $(PROJECT_ROOT) && python3 scripts/corpus/generate-templates.py
	@printf "$(C_GREEN)v$(C_RESET) Templates generated\n"

.PHONY: dsm-corpus-build-index
dsm-corpus-build-index:
	@printf "$(C_CYAN)->$(C_RESET) Building template catalog index...\n"
	@cd $(PROJECT_ROOT) && python3 scripts/corpus/build-index.py
	@printf "$(C_GREEN)v$(C_RESET) Index built\n"

.PHONY: dsm-corpus-sync
dsm-corpus-sync: dsm-corpus-generate-templates dsm-corpus-build-index
	@printf "$(C_GREEN)v$(C_RESET) Corpus → templates sync complete\n"
	@printf "  Ready for assessment library, editor, and patient forms.\n"

# ═══════════════════════════════════════════════════════════════════════════
#  Status
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: status
status:
	@printf "$(C_BOLD)hermes-mental-health$(C_RESET) project status\n"
	@printf "  Root:  $(PROJECT_ROOT)\n\n"
	@printf "$(C_CYAN)Environment:$(C_RESET)\n"
	@if [ -d $(VENV) ]; then \
		VER=$$($(PYTHON) --version 2>&1 || echo 'unknown'); \
		printf "  $(C_GREEN)v$(C_RESET) .venv ($$VER)\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) No .venv — run $(C_BOLD)make install$(C_RESET)\n"; \
	fi
	@if command -v hermes > /dev/null 2>&1; then \
		printf "  $(C_GREEN)v$(C_RESET) hermes CLI available\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) hermes CLI not found\n"; \
	fi
	@if command -v llama-server > /dev/null 2>&1; then \
		printf "  $(C_GREEN)v$(C_RESET) llama-server available\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) llama-server not installed\n"; \
	fi
	@printf "\n$(C_CYAN)Data:$(C_RESET)\n"
	@if [ -d $(DATA_RAW) ]; then \
		RAW_SIZE=$$(du -sh $(DATA_RAW) 2>/dev/null | cut -f1); \
		printf "  $(C_GREEN)v$(C_RESET) data/raw/ — $$RAW_SIZE\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) data/raw/ — run $(C_BOLD)make data-init$(C_RESET)\n"; \
	fi
	@if [ -d $(DATA_MD) ]; then \
		MD_COUNT=$$(find $(DATA_MD) -type f -name '*.md' 2>/dev/null | wc -l | tr -d ' '); \
		printf "  $(C_GREEN)v$(C_RESET) data/markdown/ — $$MD_COUNT files\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) data/markdown/ — run $(C_BOLD)make data-init$(C_RESET)\n"; \
	fi
	@if [ -d $(DATA_PROCESSED) ]; then \
		PAT_COUNT=$$(find $(DATA_PROCESSED)/patients -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' '); \
		printf "  $(C_GREEN)v$(C_RESET) data/processed/ — $$PAT_COUNT patient(s)\n"; \
	else \
		printf "  $(C_YELLOW)[]$(C_RESET) data/processed/ — run $(C_BOLD)make data-init$(C_RESET)\n"; \
	fi
	@if [ -d $(MODELS_DIR) ]; then \
		MODEL_FILES=$$(find $(MODELS_DIR) -name '*.gguf' -type f 2>/dev/null | wc -l | tr -d ' '); \
		if [ "$$MODEL_FILES" -gt 0 ]; then \
			printf "\n$(C_CYAN)Models:$(C_RESET)\n"; \
			find $(MODELS_DIR) -name '*.gguf' -type f -exec ls -lh {} \; | awk '{printf "  $(C_GREEN)v$(C_RESET) %s\n", $$0}'; \
		else \
			printf "\n$(C_CYAN)Models:$(C_RESET)\n  $(C_YELLOW)[]$(C_RESET) No .gguf files — run $(C_BOLD)make model-download-gguf$(C_RESET)\n"; \
		fi; \
	else \
		printf "\n$(C_CYAN)Models:$(C_RESET)\n  $(C_YELLOW)[]$(C_RESET) No models/ directory yet\n"; \
	fi

# ═══════════════════════════════════════════════════════════════════════════
#  Clean & Reset
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: clean
clean:
	@printf "$(C_YELLOW)->$(C_RESET) Cleaning data directories...\n"
	@rm -rf $(DATA_RAW)
	@rm -rf $(DATA_MD)
	@rm -rf $(DATA_PROCESSED)
	@printf "$(C_GREEN)v$(C_RESET) Data cleaned — venv and models preserved\n"

.PHONY: clean-venv
clean-venv:
	@printf "$(C_YELLOW)->$(C_RESET) Removing virtual environment...\n"
	@rm -rf $(VENV)
	@printf "$(C_GREEN)v$(C_RESET) .venv removed — data preserved\n"

.PHONY: clean-models
clean-models:
	@printf "$(C_YELLOW)->$(C_RESET) Removing downloaded models...\n"
	@rm -rf $(MODELS_DIR)
	@printf "$(C_GREEN)v$(C_RESET) Models directory removed\n"

.PHONY: reset
reset: clean clean-venv clean-models
	@printf "\n$(C_BOLD)Factory reset complete.$(C_RESET) All state nuked.\n"
	@printf "  To rebuild: $(C_BOLD)make install && make data-init && make assessment-templates$(C_RESET)\n"
	@printf "  .venv, data/, and models/ have been removed.\n"
	@printf "  Source code, .hermes/, and .git/ are untouched.\n"
