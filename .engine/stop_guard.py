#!/usr/bin/env python3
"""
Sentinel 2026 Stop Guard Hook
Blocks premature agent completion if sprint tasks are not fully verified and completed.
Outputs {"decision": "allow"} or {"decision": "continue", "reason": "..."} as JSON.
"""

import json
import os
import sys


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    state_file = os.path.join(script_dir, "state.json")

    if not os.path.exists(state_file):
        workspace_root = os.path.abspath(os.path.join(script_dir, ".."))
        alt_state_file = os.path.join(workspace_root, ".engine", "state.json")
        if os.path.exists(alt_state_file):
            state_file = alt_state_file
        else:
            output = {
                "decision": "continue",
                "reason": "Missing .engine/state.json. Sprint state could not be verified."
            }
            print(json.dumps(output, indent=2))
            sys.exit(0)

    try:
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
    except Exception as e:
        output = {
            "decision": "continue",
            "reason": f"Failed to parse .engine/state.json: {str(e)}. Fix state file before stopping."
        }
        print(json.dumps(output, indent=2))
        sys.exit(0)

    current_sprint = state.get("current_sprint", "sprint_0")
    sprint_data = state.get(current_sprint, {})
    sprint_name = sprint_data.get("name", current_sprint)

    tasks = sprint_data.get("tasks", {})
    incomplete_tasks = [task for task, status in tasks.items() if status != "completed"]
    failed_tests = state.get("failed_tests", [])

    if not incomplete_tasks and not failed_tests:
        output = {
            "decision": "allow"
        }
    else:
        incomplete_str = ", ".join(incomplete_tasks) if incomplete_tasks else "None"
        failed_str = ", ".join(failed_tests) if failed_tests else "None"
        reason = (
            f"Sprint {sprint_name} has incomplete tasks: {incomplete_str}. "
            f"Failed tests: {failed_str}. Fix and verify before stopping."
        )
        output = {
            "decision": "continue",
            "reason": reason
        }

    print(json.dumps(output, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
