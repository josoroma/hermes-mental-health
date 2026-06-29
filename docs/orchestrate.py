#!/usr/bin/env python3
"""Orchestrate walkthrough video: open URLs, click via JS, scroll via key codes.
Run AFTER starting ffmpeg recording in background.
Usage: python3 docs/orchestrate.py
Expects: Microsoft Edge on display 2, app running on localhost:3000
"""

import subprocess, time, sys

BASE = "http://localhost:3000"
PATIENT_ID = "josoroma-mqn4h6m8"
INVITE_TOKEN = "demo-pending-form-token-abcdef12"         # pending invite
RESULT_ID = "result-1782700000004-demo4"  # Level 2 Depression (T-score gauge)

def applescript(script: str) -> str:
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  AppleScript error: {result.stderr.strip()}")
    return result.stdout.strip()

def activate_edge():
    applescript('tell application "Microsoft Edge" to activate')

def navigate(url: str):
    print(f"  Navigate: {url}")
    applescript(f'tell application "Microsoft Edge" to open location "{url}"')

def jseval(js: str) -> str:
    """Execute JavaScript in Edge's frontmost tab."""
    escaped = js.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')
    return applescript(f'tell application "Microsoft Edge" to tell front window to tell active tab to execute javascript "{escaped}"')

def key_code(code: int):
    """Press a key via System Events."""
    applescript(f'tell application "System Events" to key code {code}')

def click_element(selector: str) -> str:
    """Click first element matching CSS selector."""
    js = f'document.querySelector("{selector}")?.click(); document.querySelector("{selector}") ? "ok" : "miss"'
    return jseval(js)

def click_text(text: str):
    """Click element containing exact text."""
    js = f'''
    (()=>{{
        const all=document.querySelectorAll("button,a,span,div");
        for(let el of all){{
            if(el.textContent?.trim()==="{text}" && el.click){{ el.click(); return "ok:"+"{text}"; }}
        }}
        return "miss:"+"{text}";
    }})()
    '''
    return jseval(js)

def wait(s: float):
    print(f"  Wait {s}s...")
    time.sleep(s)

def scroll_down(n=1):
    for _ in range(n):
        key_code(121)
        time.sleep(0.3)

def scroll_up(n=1):
    for _ in range(n):
        key_code(115)
        time.sleep(0.3)

# ─── MAIN SEQUENCE ────────────────────────────────────────────────
print("Starting walkthrough orchestration...")
activate_edge()
wait(1)

# 1. Dashboard (0:00 - 0:25)
print("\n1. Dashboard")
navigate(f"{BASE}/")
wait(4)

# 2. Patient Profile (0:25 - 0:45)
print("\n2. Patient Profile")
navigate(f"{BASE}/patients/{PATIENT_ID}")
wait(3)
scroll_down(2)  # Show clinical summary
wait(2)
jseval("window.scrollTo(0,0)")  # Scroll to top
wait(1)

# 3. Assessments (0:45 - 1:05)
print("\n3. Assessments")
navigate(f"{BASE}/patients/{PATIENT_ID}/assessments")
wait(3)
# Show creating an invite
r = click_text("New Invite")
print(f"  New Invite: {r}")
wait(2)
# Press Escape to close dialog
key_code(53)
wait(1)

# 4. Assessment Form (patient-facing) (skip — brief mention)
print("\n4. Assessment Form")
navigate(f"{BASE}/a/{INVITE_TOKEN}")
wait(3)
scroll_down(2)
wait(2)
jseval("window.scrollTo(0,0)")
wait(1)

# 5. Results List (1:05 - 1:25)
print("\n5. Results List")
navigate(f"{BASE}/patients/{PATIENT_ID}/results")
wait(3)

# 6. Result Detail — View Mode (1:25 - 1:45)
print("\n6. Result Detail (view mode)")
navigate(f"{BASE}/patients/{PATIENT_ID}/results/{RESULT_ID}")
wait(3)
scroll_down(2)  # Show scores + answers
wait(2)
jseval("window.scrollTo(0,0)")
wait(1)

# 7. Result Edit — Inline Editing (1:45 - 2:00) ← KEY FIX
print("\n7. Result Edit (inline editing)")
r = click_text("Edit")
print(f"  Edit button: {r}")
wait(2)
# Show editing a radio button — find and click one
r = jseval('''
(()=>{
    const radios=document.querySelectorAll("input[type='radio']");
    if(radios.length>3){ radios[3].click(); return "clicked radio[3]"; }
    return "no radios";
})()
''')
print(f"  Radio click: {r}")
wait(2)
scroll_down(1)
wait(2)
jseval("window.scrollTo(0,0)")
wait(1)

# 8. Sessions (2:00 - 2:20)
print("\n8. Sessions List")
navigate(f"{BASE}/patients/{PATIENT_ID}/sessions")
wait(3)

# 9. Session Edit — MDX Editor (2:20 - 2:40)
print("\n9. Session Edit")
r = click_text("Edit")
print(f"  Edit: {r}")
wait(3)

# 10. Agent Chat (2:40 - 3:00)
print("\n10. Agent Chat")
navigate(f"{BASE}/patients/{PATIENT_ID}/agent-chat")
wait(3)

# 11. Assessment Editor (3:00 - 3:20)
print("\n11. Editor")
navigate(f"{BASE}/editor/phq-9")
wait(3)
# Click through tabs
r = click_text("Fields")
print(f"  Fields tab: {r}")
wait(2)
r = click_text("Scoring")
print(f"  Scoring tab: {r}")
wait(2)

# 12. Back to Dashboard (3:20)
print("\n12. Dashboard")
navigate(f"{BASE}/")
wait(3)

print("\n✓ Orchestration complete.")