import pytest
from app.services.analysis.health import compute_health_score

def test_healthy_codebase():
    dep_edges = [
        {"source": "main.py", "target": "router.py", "symbol": "router"},
        {"source": "router.py", "target": "service.py", "symbol": "service_func"},
    ]
    analyzed_files = {"main.py", "router.py", "service.py"}
    all_files = [{"path": "main.py"}, {"path": "router.py"}, {"path": "service.py"}]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    assert res["score"] == 100
    assert res["breakdown"]["deadCodePct"] == 0.0
    assert res["breakdown"]["circularDeps"] == 0
    assert res["breakdown"]["avgCoupling"] == round(2/3, 1)

def test_circular_dependencies():
    dep_edges = [
        {"source": "main.py", "target": "a.py", "symbol": "a"},
        {"source": "a.py", "target": "b.py", "symbol": "b"},
        {"source": "b.py", "target": "a.py", "symbol": "a"}, # Cycle
    ]
    analyzed_files = {"main.py", "a.py", "b.py"}
    all_files = [{"path": f} for f in analyzed_files]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    assert res["score"] == 90 # 100 - 1*10
    assert res["breakdown"]["circularDeps"] == 1
    assert len(res["breakdown"]["cycles"]) == 1

def test_dead_code():
    dep_edges = [
        {"source": "main.py", "target": "used.py", "symbol": "used"},
    ]
    analyzed_files = {"main.py", "used.py", "unused.py"}
    all_files = [{"path": f} for f in analyzed_files]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    # analyzed non-entry = used.py, unused.py (2 files)
    # dead = unused.py (1 file) -> 50%
    # penalty = min(30, 50 * 0.5) = 25
    assert res["score"] == 75
    assert res["breakdown"]["deadCodePct"] == 50.0
    assert "unused.py" in res["breakdown"]["deadCodeFiles"]

def test_entry_point_exclusion():
    dep_edges = []
    # All these should be excluded, so dead code should be 0% since 0 non-entry files
    analyzed_files = {"main.py", "index.js", "app.ts", "__init__.py", "setup.py", "conftest.py", "config.py", "prod_settings.json"}
    all_files = [{"path": f} for f in analyzed_files]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    assert res["score"] == 100
    assert res["breakdown"]["deadCodePct"] == 0.0
    assert len(res["breakdown"]["deadCodeFiles"]) == 0

def test_unsupported_language_files_excluded():
    dep_edges = [
        {"source": "main.py", "target": "utils.py", "symbol": "utils"}
    ]
    analyzed_files = {"main.py", "utils.py", "unused_py.py"}
    all_files = [
        {"path": "main.py"}, {"path": "utils.py"}, {"path": "unused_py.py"}, 
        {"path": "unsupported.go"}, {"path": "unsupported.rs"}
    ]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    # analyzed_non_entry = utils.py, unused_py.py (2 files)
    # dead = unused_py.py (1 file) -> 50%
    # unsupported.go and .rs are NOT in analyzed_files, so they don't count towards dead code files
    assert res["breakdown"]["deadCodePct"] == 50.0
    assert res["breakdown"]["deadCodeAnalyzedFiles"] == 3
    assert res["breakdown"]["totalFiles"] == 5

def test_high_coupling_penalty():
    dep_edges = [
        {"source": "a.py", "target": "b.py", "symbol": "1"},
        {"source": "a.py", "target": "c.py", "symbol": "2"},
        {"source": "a.py", "target": "d.py", "symbol": "3"},
        {"source": "a.py", "target": "e.py", "symbol": "4"},
        {"source": "a.py", "target": "f.py", "symbol": "5"},
        # That's 5 edges for 6 nodes. Avg coupling = 5 / 6 = 0.8
        # Let's add more edges to increase avg coupling > 3
    ]
    # For avg coupling > 3, we need total edges > 3 * nodes
    # Let's just create a complete graph of 5 nodes
    nodes = ["n1", "n2", "n3", "n4", "n5"]
    dep_edges = []
    for i in nodes:
        for j in nodes:
            if i != j:
                dep_edges.append({"source": i, "target": j, "symbol": "sym"})
                
    # Total edges = 5 * 4 = 20
    # Nodes = 5
    # Avg coupling = 20 / 5 = 4.0
    
    analyzed_files = set(nodes)
    all_files = [{"path": n} for n in nodes]
    
    res = compute_health_score(dep_edges, analyzed_files, all_files)
    assert res["breakdown"]["avgCoupling"] == 4.0
    # Score penalty: min(30, max(0, 4 - 3) * 5) = 5
    # Since it's a complete graph, circular dependencies will be huge.
    # Actually complete graph is 1 strongly connected component!
    assert res["breakdown"]["circularDeps"] == 1
    # Penalty for circular = 10
    # Penalty for dead code = 0
    # Score = 100 - 5 - 10 = 85
    assert res["score"] == 85
