"""
Tests for the cross-file dependency graph builder.

Covers:
- Basic Python cross-file import resolution
- Basic JS/TS import resolution
- Amendment 5: ambiguous name → NO edge created
- Amendment 5: unambiguous implicit match → edge created
- Explicit import wins over implicit match
- Self-calls are excluded from edges
- analyzed_files tracking (only supported languages)
"""

import pytest
from app.services.analysis.dependency import build_dependency_graph


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_file(path: str, content: str) -> dict:
    return {"path": path, "content": content}


def _edge_set(edges):
    """Convert edge list to a set of (source, target, symbol) tuples for easy assertion."""
    return {(e["source"], e["target"], e["symbol"]) for e in edges}


# ---------------------------------------------------------------------------
# Python tests
# ---------------------------------------------------------------------------

class TestPythonDependencies:
    def test_explicit_import_creates_edge(self):
        """from utils import helper; helper() → edge utils.py → main.py"""
        files = [
            _make_file("utils.py", "def helper():\n    pass\n"),
            _make_file("main.py", "from utils import helper\n\nhelper()\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("utils.py", "main.py", "helper") in _edge_set(edges)

    def test_class_import_creates_edge(self):
        """from models import User; User() → edge models.py → app.py"""
        files = [
            _make_file("models.py", "class User:\n    pass\n"),
            _make_file("app.py", "from models import User\n\nobj = User()\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("models.py", "app.py", "User") in _edge_set(edges)

    def test_multi_name_import(self):
        """from utils import foo, bar; foo(); bar() → two edges"""
        files = [
            _make_file("utils.py", "def foo():\n    pass\n\ndef bar():\n    pass\n"),
            _make_file("main.py", "from utils import foo, bar\n\nfoo()\nbar()\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        es = _edge_set(edges)
        assert ("utils.py", "main.py", "foo") in es
        assert ("utils.py", "main.py", "bar") in es

    def test_no_self_edges(self):
        """A file calling its own definitions should not create a self-edge."""
        files = [
            _make_file("utils.py", "def helper():\n    pass\n\nhelper()\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert len(edges) == 0


class TestJavaScriptDependencies:
    def test_named_import_creates_edge(self):
        """import { helper } from './utils'; helper() → edge"""
        files = [
            _make_file("utils.js", "function helper() {}\nexport { helper };\n"),
            _make_file("main.js", "import { helper } from './utils';\nhelper();\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("utils.js", "main.js", "helper") in _edge_set(edges)

    def test_default_import_creates_edge(self):
        """import App from './App'; App() → edge"""
        files = [
            _make_file("App.jsx", "function App() { return null; }\nexport default App;\n"),
            _make_file("index.jsx", "import App from './App';\nApp();\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("App.jsx", "index.jsx", "App") in _edge_set(edges)

    def test_typescript_import(self):
        """import { Service } from './service'; new Service() → edge"""
        files = [
            _make_file("service.ts", "export class Service {}\n"),
            _make_file("main.ts", "import { Service } from './service';\nconst s = new Service();\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("service.ts", "main.ts", "Service") in _edge_set(edges)


# ---------------------------------------------------------------------------
# Amendment 5 — ambiguity handling
# ---------------------------------------------------------------------------

class TestAmendment5AmbiguousNames:
    def test_ambiguous_name_skips_edge(self):
        """
        Two files define the same function name. A third file calls that name
        with NO import present. The builder MUST skip creating an edge — it
        must not guess between the two candidates.
        """
        files = [
            _make_file("utils_a.py", "def process():\n    pass\n"),
            _make_file("utils_b.py", "def process():\n    pass\n"),
            _make_file("main.py", "process()\n"),  # no import, ambiguous
        ]
        edges, analyzed = build_dependency_graph(files)
        # No edge should be created for the ambiguous call
        for e in edges:
            assert e["symbol"] != "process", (
                f"Edge created for ambiguous name 'process': {e}"
            )

    def test_unambiguous_implicit_match_creates_edge(self):
        """
        Only ONE file defines a function name. Another file calls that name
        with no import present. Since it's genuinely unambiguous, an edge
        SHOULD be created.
        """
        files = [
            _make_file("utils.py", "def unique_helper():\n    pass\n"),
            _make_file("main.py", "unique_helper()\n"),  # no import, but unambiguous
        ]
        edges, analyzed = build_dependency_graph(files)
        assert ("utils.py", "main.py", "unique_helper") in _edge_set(edges)

    def test_explicit_import_overrides_ambiguity(self):
        """
        Two files define the same name. A third file explicitly imports from
        one of them and calls the name. The explicit import should resolve
        unambiguously, and an edge SHOULD be created to the imported file.
        """
        files = [
            _make_file("utils_a.py", "def process():\n    pass\n"),
            _make_file("utils_b.py", "def process():\n    pass\n"),
            _make_file(
                "main.py",
                "from utils_a import process\n\nprocess()\n",
            ),
        ]
        edges, analyzed = build_dependency_graph(files)
        es = _edge_set(edges)
        assert ("utils_a.py", "main.py", "process") in es
        # Must NOT have an edge from utils_b
        assert ("utils_b.py", "main.py", "process") not in es


# ---------------------------------------------------------------------------
# analyzed_files tracking
# ---------------------------------------------------------------------------

class TestAnalyzedFilesTracking:
    def test_only_supported_languages_in_analyzed_set(self):
        """
        Files in unsupported languages (.go, .rs, .rb) must NOT appear in the
        analyzed_files set. Only Python/JS/TS files should.
        """
        files = [
            _make_file("main.py", "def main():\n    pass\n"),
            _make_file("utils.js", "function helper() {}\n"),
            _make_file("lib.go", "package main\nfunc Foo() {}\n"),
            _make_file("core.rs", "fn bar() {}\n"),
            _make_file("app.rb", "def baz; end\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        assert "main.py" in analyzed
        assert "utils.js" in analyzed
        assert "lib.go" not in analyzed
        assert "core.rs" not in analyzed
        assert "app.rb" not in analyzed

    def test_unsupported_files_have_no_edges(self):
        """Unsupported-language files should never appear as source or target in edges."""
        files = [
            _make_file("main.py", "def main():\n    pass\n"),
            _make_file("lib.go", "package main\nfunc main() {}\n"),
        ]
        edges, analyzed = build_dependency_graph(files)
        for e in edges:
            assert not e["source"].endswith(".go")
            assert not e["target"].endswith(".go")


# ---------------------------------------------------------------------------
# Edge direction convention
# ---------------------------------------------------------------------------

class TestEdgeDirection:
    def test_edge_points_from_definer_to_caller(self):
        """
        Edge direction convention: source = definer, target = caller.
        If utils.py defines foo and main.py calls foo, the edge is
        {source: utils.py, target: main.py, symbol: foo}.
        """
        files = [
            _make_file("utils.py", "def foo():\n    pass\n"),
            _make_file("main.py", "from utils import foo\n\nfoo()\n"),
        ]
        edges, _ = build_dependency_graph(files)
        assert len(edges) == 1
        edge = edges[0]
        assert edge["source"] == "utils.py"
        assert edge["target"] == "main.py"
        assert edge["symbol"] == "foo"
