# Hermes Gateway API — Curl Recipes & Interaction Patterns

## Start the gateway (project-scoped)

```bash
# Via Makefile (preferred — auto-kills stale process, sets HERMES_HOME)
make hermes-gateway

# Or manually
HERMES_HOME=/Users/josoroma/projects/hermes-mental-health/.hermes \
  API_SERVER_ENABLED=true \
  API_SERVER_KEY=change-me-local-dev \
  hermes gateway
```

Override key or port: `make hermes-gateway HERMES_GATEWAY_KEY=my-key HERMES_GATEWAY_PORT=8643`.

Without `HERMES_HOME`, the gateway uses `~/.hermes/config.yaml` — if that config has a different model provider (e.g., local GGUF on `:8080`), runs will fail with `Connection error.` even though the API endpoint responds.

## Connectivity check

```bash
# Makefile target — checks connectivity, sends test run, prints result
make hermes-gateway-curl-test

# Quick manual check — returns HTTP status code ("000" means not running)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8642/v1/runs

# If gateway is up but model is unreachable, this returns a 200+run_id
# but the run will eventually fail with status=failed, error="Connection error."
```

## Create a run

```bash
curl -s http://127.0.0.1:8642/v1/runs \
  -H "Authorization: Bearer change...ev" \
  -H "Content-Type: application/json" \
  -d '{"input": "/goal Generate a DSM-5-TR assessment JSON for PHQ-9.", "instructions": "You are a DSM-5-TR assessment JSON generator. Return ONLY valid JSON."}'
```

Response:
```json
{"run_id": "run_...", "status": "started"}
```

**Fields:** `input` (the task prompt), `instructions` (system prompt). The API rejects `prompt` with `"Missing 'input' field"`.

## Poll run status

```bash
RUN_ID="run_..."
curl -s http://127.0.0.1:8642/v1/runs/$RUN_ID \
  -H "Authorization: Bearer change...ev"
```

Response shape:
```json
{
  "object": "hermes.run",
  "run_id": "run_...",
  "status": "completed",      // started | running | completed | failed | error
  "output": "...",             // present when completed
  "error": "...",              // present when failed/error
  "model": "hermes-agent",
  "session_id": "run_...",
  "created_at": 1782131181.0,
  "updated_at": 1782131200.0,
  "last_event": "run.completed"
}
```

## Full polling script

```bash
RUN_ID="run_..."
for i in $(seq 1 60); do
  STATUS=$(curl -s http://127.0.0.1:8642/v1/runs/$RUN_ID \
    -H "Authorization: Bearer change...ev" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
  echo "[$i] status=$STATUS"
  case "$STATUS" in
    completed) echo "DONE"; break ;;
    failed|error) echo "FAILED"; break ;;
    *) sleep 3 ;;
  esac
done
```

## Background agent noise

The gateway process may log warnings from an auxiliary background agent thread trying to reach a local model. These are unrelated to the API server functionality — the API on `:8642` works regardless. The errors look like:

```
WARNING agent.conversation_loop: API call failed ... provider=custom base_url=http://127.0.0.1:8080/v1 ...
```

Silence them by either starting the local llama server (`make llama-server`) or removing the custom provider from `~/.hermes/config.yaml`.
