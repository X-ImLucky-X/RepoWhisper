"""
Cross-file dependency graph builder.

Analyzes source files (Python, JS/JSX, TS/TSX) to build file-to-file dependency
edges based on function/class definitions, import statements, and call sites.

Edge direction convention (matching CodeFlow):
    source -> target  =  file-that-DEFINES-the-symbol -> file-that-CALLS-the-symbol

    e.g. {source: "utils.py", target: "main.py", symbol: "helper"}
    means main.py calls helper(), which is defined in utils.py.

Resolution strategy:
    1. Explicit import wins: if file B imports name X from a resolved module A,
       and B calls X(), the edge is A -> B.
    2. Unique implicit match: if no import is present but exactly ONE other file
       in the repo defines X, the edge is that file -> B.
    3. Ambiguous: if multiple files define X and no import disambiguates,
       NO edge is created (to avoid false positives).
"""

import os
import re
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict

import tree_sitter

# ---------------------------------------------------------------------------
# Parser factory — uses the new tree-sitter per-language packages that
# support Python >=3.12, replacing the legacy tree_sitter_languages bundle.
# Falls back to tree_sitter_languages.get_parser() if the new packages are
# unavailable (for environments that still pin the old versions).
# ---------------------------------------------------------------------------

_PARSERS: Dict[str, tree_sitter.Parser] = {}


def _get_parser(language: str) -> tree_sitter.Parser:
    """Return a cached tree-sitter parser for the given language."""
    if language in _PARSERS:
        return _PARSERS[language]

    try:
        # New API: individual per-language packages (Python >=3.12 compatible)
        if language == "python":
            import tree_sitter_python
            lang = tree_sitter.Language(tree_sitter_python.language())
        elif language == "javascript":
            import tree_sitter_javascript
            lang = tree_sitter.Language(tree_sitter_javascript.language())
        elif language == "tsx":
            import tree_sitter_typescript
            lang = tree_sitter.Language(tree_sitter_typescript.language_tsx())
        else:
            raise ValueError(f"Unsupported language: {language}")
        parser = tree_sitter.Parser(lang)
    except ImportError:
        # Fallback: legacy tree_sitter_languages (Python <3.12)
        from tree_sitter_languages import get_parser
        parser = get_parser(language)

    _PARSERS[language] = parser
    return parser


# Languages supported for dependency-edge extraction in V1.
# Files in other languages get nodes in the graph but no import/call edges.
SUPPORTED_EXTENSIONS: Dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "tsx",
    ".tsx": "tsx",
}


def _get_language(file_path: str) -> Optional[str]:
    """Return tree-sitter language name for a file, or None if unsupported."""
    ext = os.path.splitext(file_path)[1].lower()
    return SUPPORTED_EXTENSIONS.get(ext)


# ---------------------------------------------------------------------------
# Definition extraction
# ---------------------------------------------------------------------------

# Tree-sitter node types that represent function/class definitions
_DEF_NODE_TYPES = frozenset({
    "function_definition",   # Python
    "class_definition",      # Python
    "function_declaration",  # JS/TS
    "class_declaration",     # JS/TS
    "method_definition",     # JS/TS class methods
})

# Tree-sitter node types that hold the name of a definition
_NAME_NODE_TYPES = frozenset({
    "identifier",
    "property_identifier",
    "type_identifier",
})


def _extract_definitions(code: str, language: str) -> List[str]:
    """Extract function and class names defined in a file via tree-sitter."""
    parser = _get_parser(language)
    tree = parser.parse(bytes(code, "utf8"))
    definitions: List[str] = []

    def traverse(node):
        if node.type in _DEF_NODE_TYPES:
            for child in node.children:
                if child.type in _NAME_NODE_TYPES:
                    name = code[child.start_byte:child.end_byte]
                    if name and name != "anonymous":
                        definitions.append(name)
                    break
        for child in node.children:
            traverse(child)

    traverse(tree.root_node)
    return definitions


# ---------------------------------------------------------------------------
# Import extraction
# ---------------------------------------------------------------------------

def _extract_imports_python(code: str, language: str) -> List[Dict]:
    """
    Extract import info from Python source using tree-sitter to locate
    statements (handles multi-line imports) and regex to parse them.
    """
    parser = _get_parser(language)
    tree = parser.parse(bytes(code, "utf8"))
    imports: List[Dict] = []

    def traverse(node):
        if node.type == "import_from_statement":
            stmt = code[node.start_byte:node.end_byte]
            stmt = " ".join(stmt.split())  # normalise whitespace
            m = re.match(r"from\s+(\.{0,3}[\w.]*)\s+import\s+(.+)", stmt)
            if m:
                module_path = m.group(1)
                names_str = m.group(2)
                names: List[str] = []
                for part in re.split(r",", names_str):
                    part = part.strip().strip("()")
                    if " as " in part:
                        part = part.split(" as ")[0].strip()
                    part = part.strip()
                    if part and part != "*":
                        names.append(part)
                if names:
                    imports.append({"module": module_path, "names": names})

        elif node.type == "import_statement":
            stmt = code[node.start_byte:node.end_byte]
            stmt = " ".join(stmt.split())
            m = re.match(r"import\s+([\w.]+)", stmt)
            if m:
                module_path = m.group(1)
                imports.append({
                    "module": module_path,
                    "names": [module_path.split(".")[-1]],
                })

        for child in node.children:
            traverse(child)

    traverse(tree.root_node)
    return imports


def _extract_imports_js(code: str, language: str) -> List[Dict]:
    """
    Extract import info from JS/TS source using tree-sitter to locate
    import_statement nodes and regex to parse source/names.
    """
    parser = _get_parser(language)
    tree = parser.parse(bytes(code, "utf8"))
    imports: List[Dict] = []

    def traverse(node):
        if node.type == "import_statement":
            stmt = code[node.start_byte:node.end_byte]
            stmt = " ".join(stmt.split())

            # Extract the module source string
            source_match = re.search(r"""from\s+['"](.+?)['"]""", stmt)
            if not source_match:
                source_match = re.search(r"""import\s+['"](.+?)['"]""", stmt)
            if not source_match:
                for child in node.children:
                    traverse(child)
                return

            source = source_match.group(1)
            names: List[str] = []

            # Named imports: import { a, b as c } from '...'
            named_match = re.search(r"\{([^}]+)\}", stmt)
            if named_match:
                for part in named_match.group(1).split(","):
                    part = part.strip()
                    if " as " in part:
                        part = part.split(" as ")[0].strip()
                    if part:
                        names.append(part)

            # Default import: import Name from '...'
            default_match = re.match(r"import\s+(\w+)\s+from", stmt)
            if default_match:
                names.append(default_match.group(1))

            # Namespace import: import * as Name from '...'
            ns_match = re.search(r"\*\s+as\s+(\w+)", stmt)
            if ns_match:
                names.append(ns_match.group(1))

            if names:
                imports.append({"module": source, "names": names})

        for child in node.children:
            traverse(child)

    traverse(tree.root_node)
    return imports


# ---------------------------------------------------------------------------
# Call-site extraction
# ---------------------------------------------------------------------------

def _extract_calls(code: str, language: str) -> List[str]:
    """
    Extract direct-identifier function/class call names via tree-sitter.

    Only extracts calls where the callee is a bare identifier (e.g. ``foo()``
    or ``MyClass()``), NOT attribute/member calls (``obj.foo()``), to avoid
    noisy false-positive cross-file edges.  Attribute calls would require type
    inference to resolve correctly, which is out of scope for V1.
    """
    parser = _get_parser(language)
    tree = parser.parse(bytes(code, "utf8"))
    calls: Set[str] = set()

    # Python uses "call", JS/TS uses "call_expression"
    if language == "python":
        call_types = frozenset({"call"})
    else:
        call_types = frozenset({"call_expression", "new_expression"})

    def traverse(node):
        if node.type in call_types:
            if node.children:
                if node.type == "new_expression":
                    # new_expression: first child is 'new' keyword, second is the identifier
                    for child in node.children:
                        if child.type == "identifier":
                            calls.add(code[child.start_byte:child.end_byte])
                            break
                else:
                    # call_expression / call: first child is the function being called
                    func_node = node.children[0]
                    if func_node.type == "identifier":
                        calls.add(code[func_node.start_byte:func_node.end_byte])
        for child in node.children:
            traverse(child)

    traverse(tree.root_node)
    return list(calls)


# ---------------------------------------------------------------------------
# Module-path -> file-path resolution
# ---------------------------------------------------------------------------

def _resolve_python_module(
    module_path: str,
    importing_file: str,
    all_files: Set[str],
) -> Optional[str]:
    """Resolve a Python dotted-module path to a repo file path."""
    # --- relative imports (leading dots) ---
    if module_path.startswith("."):
        dots = len(module_path) - len(module_path.lstrip("."))
        rest = module_path.lstrip(".")
        base = os.path.dirname(importing_file)
        for _ in range(dots - 1):
            base = os.path.dirname(base)
        candidate = (
            os.path.join(base, rest.replace(".", "/")).replace("\\", "/")
            if rest
            else base
        )
    else:
        candidate = module_path.replace(".", "/")

    # Try <candidate>.py  then  <candidate>/__init__.py
    for suffix in (".py", "/__init__.py"):
        full = candidate + suffix
        if full in all_files:
            return full
    return None


def _resolve_js_module(
    source: str,
    importing_file: str,
    all_files: Set[str],
) -> Optional[str]:
    """Resolve a JS/TS relative import source to a repo file path."""
    # Skip bare / node_modules specifiers
    if not source.startswith(".") and not source.startswith("/"):
        return None

    base = os.path.dirname(importing_file)
    resolved = os.path.normpath(os.path.join(base, source)).replace("\\", "/")

    for suffix in ("", ".js", ".jsx", ".ts", ".tsx",
                    "/index.js", "/index.jsx", "/index.ts", "/index.tsx"):
        candidate = resolved + suffix
        if candidate in all_files:
            return candidate
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_dependency_graph(
    files_data: List[Dict[str, str]],
) -> Tuple[List[Dict[str, str]], Set[str]]:
    """
    Build file-to-file dependency edges from parsed source files.

    Parameters
    ----------
    files_data : list of dicts
        Each dict has ``path`` (str) and ``content`` (str).

    Returns
    -------
    edges : list of dicts
        ``{source, target, symbol}`` -- source=definer, target=caller.
    analyzed_files : set of str
        File paths that were actually analyzed for edges (supported languages
        only).  Used by the health-score module to avoid counting unsupported-
        language files as dead code (Amendment 2).
    """
    all_file_paths: Set[str] = {f["path"] for f in files_data}
    analyzed_files: Set[str] = set()

    # Per-file extracted data
    file_definitions: Dict[str, List[str]] = {}
    file_imports: Dict[str, List[Dict]] = {}
    file_calls: Dict[str, List[str]] = {}

    # ---- Phase 1: parse every supported file ----
    for f in files_data:
        fpath = f["path"]
        language = _get_language(fpath)
        if language is None:
            continue

        analyzed_files.add(fpath)
        code = f["content"]

        try:
            file_definitions[fpath] = _extract_definitions(code, language)

            if language == "python":
                file_imports[fpath] = _extract_imports_python(code, language)
            else:
                file_imports[fpath] = _extract_imports_js(code, language)

            file_calls[fpath] = _extract_calls(code, language)
        except Exception as exc:
            print(f"[dependency] analysis failed for {fpath}: {exc}")
            continue

    # ---- Phase 2: definition index  {name -> [file, ...]} ----
    definition_index: Dict[str, List[str]] = defaultdict(list)
    for fpath, defs in file_definitions.items():
        for name in defs:
            definition_index[name].append(fpath)

    # ---- Phase 3: resolve imports -> {caller_file -> {name -> definer_file}} ----
    import_resolution: Dict[str, Dict[str, str]] = defaultdict(dict)
    for fpath, imps in file_imports.items():
        is_python = os.path.splitext(fpath)[1].lower() == ".py"
        for imp in imps:
            if is_python:
                resolved = _resolve_python_module(
                    imp["module"], fpath, all_file_paths
                )
            else:
                resolved = _resolve_js_module(
                    imp["module"], fpath, all_file_paths
                )
            if resolved and resolved != fpath:
                for name in imp["names"]:
                    import_resolution[fpath][name] = resolved

    # ---- Phase 4: build edges ----
    edges: List[Dict[str, str]] = []
    seen: Set[Tuple[str, str, str]] = set()

    for caller_file, calls in file_calls.items():
        for call_name in calls:
            source_file: Optional[str] = None

            # Priority 1 -- explicit import resolution
            if call_name in import_resolution.get(caller_file, {}):
                source_file = import_resolution[caller_file][call_name]
            else:
                # Priority 2 -- unique implicit match
                definers = definition_index.get(call_name, [])
                external = [d for d in definers if d != caller_file]
                if len(external) == 1:
                    source_file = external[0]
                # len(external) != 1 -> ambiguous or not found -> skip

            if source_file and source_file != caller_file:
                key = (source_file, caller_file, call_name)
                if key not in seen:
                    seen.add(key)
                    edges.append({
                        "source": source_file,
                        "target": caller_file,
                        "symbol": call_name,
                    })

    return edges, analyzed_files
