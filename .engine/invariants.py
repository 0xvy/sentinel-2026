#!/usr/bin/env python3
"""
Sentinel 2026 Engine Invariant Gate
AST-based static scanner enforcing the 8 Sandbox Commandments and JSON integrity.
Exits 0 always to satisfy hook execution contracts, outputting structured JSON results.
"""

import ast
import json
import os
import re
import sys


class ASTInvariantChecker(ast.NodeVisitor):
    def __init__(self, filename: str, is_vision_file: bool):
        self.filename = filename
        self.is_vision_file = is_vision_file
        self.violations = []
        self.time_imported_names = set()
        self.in_docstring = False

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name == "time":
                self.time_imported_names.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module == "cv2":
            for alias in node.names:
                if alias.name == "CAP_PROP_FPS":
                    self.violations.append(
                        f"Forbidden cv2.CAP_PROP_FPS import at {self.filename}:{node.lineno}. "
                        "Rule 2: NEVER USE CAP_PROP_FPS. Use PTS (cv2.CAP_PROP_POS_MSEC)."
                    )
        elif node.module == "time":
            for alias in node.names:
                if alias.name == "time":
                    self.time_imported_names.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_Attribute(self, node):
        # Check cv2.CAP_PROP_FPS
        if node.attr == "CAP_PROP_FPS":
            self.violations.append(
                f"Forbidden CAP_PROP_FPS attribute access at {self.filename}:{node.lineno}. "
                "Rule 2: NEVER USE CAP_PROP_FPS OR ARRIVAL TIME FOR TRACKING. Use PTS (cv2.CAP_PROP_POS_MSEC)."
            )
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id == "CAP_PROP_FPS":
            self.violations.append(
                f"Forbidden CAP_PROP_FPS name reference at {self.filename}:{node.lineno}. "
                "Rule 2: NEVER USE CAP_PROP_FPS OR ARRIVAL TIME FOR TRACKING. Use PTS (cv2.CAP_PROP_POS_MSEC)."
            )
        self.generic_visit(node)

    def visit_Call(self, node):
        # Check time.time() calls in vision directory files
        if self.is_vision_file:
            is_time_call = False
            if isinstance(node.func, ast.Attribute):
                if node.func.attr == "time" and isinstance(node.func.value, ast.Name):
                    if node.func.value.id in ("time", *self.time_imported_names):
                        is_time_call = True
            elif isinstance(node.func, ast.Name):
                if node.func.id in self.time_imported_names:
                    is_time_call = True

            if is_time_call:
                self.violations.append(
                    f"Forbidden time.time() call in vision module at {self.filename}:{node.lineno}. "
                    "Rule 2: NEVER USE ARRIVAL TIME FOR TRACKING. Use PTS (cv2.CAP_PROP_POS_MSEC)."
                )

        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, str):
            val = node.value

            # Check 1: 'udp' in RTSP transport context
            if re.search(r"rtsp_transport[;=]\s*udp", val, re.IGNORECASE) or (
                "rtsp" in val.lower() and "udp" in val.lower() and "rtsp_transport" in val.lower()
            ):
                self.violations.append(
                    f"Forbidden UDP RTSP transport string '{val}' at {self.filename}:{node.lineno}. "
                    "Rule 1: NEVER USE UDP FOR RTSP. Always set 'rtsp_transport;tcp'."
                )

            # Check 4: Hardcoded RTSP stream URLs
            if re.search(r"^rtsp://[^\s\"']+", val.strip(), re.IGNORECASE):
                self.violations.append(
                    f"Hardcoded RTSP URL '{val}' at {self.filename}:{node.lineno}. "
                    "Rule 3: NEVER HARDCODE RTSP STREAM URLS. Always query GET /api/ingest dynamically."
                )

        self.generic_visit(node)

    def visit_While(self, node):
        # Check 5: Reconnection loops without exponential backoff
        # Look for while loops containing reconnection logic and constant sleep
        has_reconnect = False
        has_constant_sleep = False
        has_backoff = False
        sleep_line = node.lineno

        for subnode in ast.walk(node):
            # Check for reconnection / retry indicators
            if isinstance(subnode, ast.Name):
                if any(kw in subnode.id.lower() for kw in ("reconnect", "retry", "backoff")):
                    has_reconnect = True
            elif isinstance(subnode, ast.Attribute):
                if any(kw in subnode.attr.lower() for kw in ("reconnect", "videocapture", "open", "connect")):
                    has_reconnect = True
            elif isinstance(subnode, ast.Constant) and isinstance(subnode.value, str):
                if any(kw in subnode.value.lower() for kw in ("reconnect", "retrying", "connection lost")):
                    has_reconnect = True

            # Check for exponential arithmetic (e.g. delay * 2 or delay *= 2 or min(delay * 2, 30))
            if isinstance(subnode, (ast.Mult, ast.BinOp, ast.AugAssign)):
                if isinstance(subnode, ast.BinOp) and isinstance(subnode.op, ast.Mult):
                    has_backoff = True
                elif isinstance(subnode, ast.AugAssign) and isinstance(subnode.op, ast.Mult):
                    has_backoff = True

            # Check for sleep with literal constant argument
            if isinstance(subnode, ast.Call):
                func = subnode.func
                is_sleep = False
                if isinstance(func, ast.Attribute) and func.attr == "sleep":
                    is_sleep = True
                elif isinstance(func, ast.Name) and func.id == "sleep":
                    is_sleep = True

                if is_sleep:
                    sleep_line = subnode.lineno
                    if subnode.args:
                        arg = subnode.args[0]
                        # If argument is a numeric literal or constant
                        if isinstance(arg, ast.Constant) and isinstance(arg.value, (int, float)):
                            has_constant_sleep = True
                        elif hasattr(ast, "Num") and isinstance(arg, ast.Num):
                            has_constant_sleep = True

        if has_reconnect and has_constant_sleep and not has_backoff:
            self.violations.append(
                f"Missing exponential backoff in reconnection loop at {self.filename}:{sleep_line}. "
                "Rule 5: ALWAYS IMPLEMENT EXPONENTIAL BACKOFF (2s initial -> 30s max). Never tight-loop reconnect."
            )

        self.generic_visit(node)


def scan_workspace(workspace_root: str):
    violations = []
    scanned_py = 0
    scanned_json = 0

    # 1. Walk Python files in backend/ and vision/
    target_dirs = [
        os.path.join(workspace_root, "backend"),
        os.path.join(workspace_root, "vision"),
    ]

    for tdir in target_dirs:
        if not os.path.exists(tdir):
            continue
        for root, dirs, files in os.walk(tdir):
            # Skip caches and virtual environments
            dirs[:] = [d for d in dirs if d not in ("__pycache__", ".pytest_cache", ".venv", "venv", "node_modules")]
            for file in files:
                if file.endswith(".py"):
                    scanned_py += 1
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, workspace_root).replace("\\", "/")
                    is_vision = "vision" in rel_path.split("/")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()
                        tree = ast.parse(content, filename=rel_path)
                        checker = ASTInvariantChecker(rel_path, is_vision_file=is_vision)
                        checker.visit(tree)
                        violations.extend(checker.violations)
                    except SyntaxError as e:
                        violations.append(f"Python syntax error in {rel_path}:{e.lineno} - {e.msg}")
                    except Exception as e:
                        violations.append(f"Failed to scan {rel_path}: {str(e)}")

    # 2. Check all JSON files in the workspace
    for root, dirs, files in os.walk(workspace_root):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__", ".pytest_cache", ".venv", "venv", "node_modules")]
        for file in files:
            if file.endswith(".json"):
                scanned_json += 1
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, workspace_root).replace("\\", "/")
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    violations.append(f"Invalid JSON syntax in {rel_path}:{e.lineno}:{e.colno} - {e.msg}")
                except Exception as e:
                    violations.append(f"Failed reading JSON {rel_path}: {str(e)}")

    result = {
        "passed": len(violations) == 0,
        "violations": violations,
        "scanned_files": {
            "python_files": scanned_py,
            "json_files": scanned_json
        }
    }
    return result


def main():
    if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
        workspace_root = os.path.abspath(sys.argv[1])
    else:
        # Default to parent of .engine/ directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(script_dir, ".."))

    result = scan_workspace(workspace_root)
    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
