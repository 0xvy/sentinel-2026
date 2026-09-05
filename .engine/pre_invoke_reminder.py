#!/usr/bin/env python3
"""
Sentinel 2026 Pre-Invocation Reminder Hook
Reads .engine/state.json and injects an ephemeral sprint state reminder before each model turn.
Exits 0 always with valid JSON output.
"""

import json
import os
import sys


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    state_file = os.path.join(script_dir, "state.json")

    if not os.path.exists(state_file):
        # Fallback to workspace root .engine/state.json if invoked from elsewhere
        workspace_root = os.path.abspath(os.path.join(script_dir, ".."))
        alt_state_file = os.path.join(workspace_root, ".engine", "state.json")
        if os.path.exists(alt_state_file):
            state_file = alt_state_file
        else:
            print(json.dumps({"injectSteps": []}, indent=2))
            sys.exit(0)

    try:
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
    except Exception:
        print(json.dumps({"injectSteps": []}, indent=2))
        sys.exit(0)

    current_sprint = state.get("current_sprint", "sprint_0")
    sprint_data = state.get(current_sprint, {})
    sprint_name = sprint_data.get("name", current_sprint)

    tasks = sprint_data.get("tasks", {})
    pending_tasks = [task for task, status in tasks.items() if status != "completed"]
    task_list = ", ".join(pending_tasks) if pending_tasks else "None"

    failed_tests_list = state.get("failed_tests", [])
    failed_tests = ", ".join(failed_tests_list) if failed_tests_list else "None"

    msg = (
        f"ACTIVE SPRINT: {sprint_name}. "
        f"PENDING TASKS: {task_list}. "
        f"FAILED TESTS: {failed_tests}. "
        "DO NOT move to next task until all tests pass."
    )

    output = {
        "injectSteps": [
            {
                "ephemeralMessage": msg
            }
        ]
    }

    print(json.dumps(output, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
