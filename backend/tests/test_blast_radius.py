import pytest
from app.services.analysis.blast_radius import compute_blast_radius

def test_blast_radius_direct_dependents():
    edges = [
        {"source": "a.py", "target": "b.py"},
        {"source": "a.py", "target": "c.py"}
    ]
    res = compute_blast_radius(edges, "a.py", max_depth=5)
    assert res["file"] == "a.py"
    assert res["directCount"] == 2
    assert "b.py" in res["direct"]
    assert "c.py" in res["direct"]
    assert res["transitiveCount"] == 0

def test_blast_radius_transitive_dependents():
    edges = [
        {"source": "a.py", "target": "b.py"},
        {"source": "b.py", "target": "c.py"},
        {"source": "c.py", "target": "d.py"}
    ]
    res = compute_blast_radius(edges, "a.py", max_depth=5)
    assert res["directCount"] == 1
    assert res["direct"] == ["b.py"]
    assert res["transitiveCount"] == 2
    assert "c.py" in res["transitive"]
    assert "d.py" in res["transitive"]

def test_blast_radius_depth_capping():
    edges = [
        {"source": "a.py", "target": "b.py"},
        {"source": "b.py", "target": "c.py"},
        {"source": "c.py", "target": "d.py"}
    ]
    res1 = compute_blast_radius(edges, "a.py", max_depth=1)
    assert res1["directCount"] == 1
    assert res1["transitiveCount"] == 0
    
    res2 = compute_blast_radius(edges, "a.py", max_depth=2)
    assert res2["directCount"] == 1
    assert res2["transitiveCount"] == 1
    assert res2["transitive"] == ["c.py"]

def test_blast_radius_no_dependents():
    edges = [
        {"source": "a.py", "target": "b.py"}
    ]
    res = compute_blast_radius(edges, "c.py", max_depth=5)
    assert res["directCount"] == 0
    assert res["transitiveCount"] == 0
    assert res["direct"] == []
    assert res["transitive"] == []

def test_blast_radius_cycles():
    edges = [
        {"source": "a.py", "target": "b.py"},
        {"source": "b.py", "target": "c.py"},
        {"source": "c.py", "target": "a.py"}
    ]
    res = compute_blast_radius(edges, "a.py", max_depth=5)
    assert res["directCount"] == 1
    assert res["direct"] == ["b.py"]
    assert res["transitiveCount"] == 1
    assert res["transitive"] == ["c.py"]
