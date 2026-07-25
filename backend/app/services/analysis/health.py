import re
from typing import List, Dict, Set, Any

def _is_entry_point(filepath: str) -> bool:
    # simple string matching based on filename
    # split by / or \ to get filename
    filename = filepath.replace('\\', '/').split('/')[-1].lower()
    
    # regex for exact prefixes before extension
    entry_patterns = [
        r'^main\.',
        r'^index\.',
        r'^app\.',
        r'^__init__\.',
        r'^__main__\.',
        r'^setup\.',
        r'^conftest\.'
    ]
    if any(re.match(p, filename) for p in entry_patterns):
        return True
        
    if 'config' in filename or 'settings' in filename:
        return True
        
    return False

def compute_health_score(
    dep_edges: List[Dict[str, str]],
    analyzed_files: Set[str],
    all_files: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Computes a deterministic 0-100 health score from dependency graph.
    
    Scoring formula:
    score = 100
    score -= min(30, deadCodePct * 0.5)          # up to -30 for dead code
    score -= min(40, circularDeps * 10)          # up to -40 for circular deps  
    score -= min(30, max(0, avgCoupling - 3) * 5) # up to -30 for over-coupling
    score = max(0, round(score))
    """
    # 1. Dead Code Calculation
    incoming_edges = set()
    for edge in dep_edges:
        if edge["source"] != edge["target"]:
            incoming_edges.add(edge["target"])
            
    dead_code_files = []
    analyzed_non_entry = 0
    
    for filepath in analyzed_files:
        if not _is_entry_point(filepath):
            analyzed_non_entry += 1
            if filepath not in incoming_edges:
                dead_code_files.append(filepath)
                
    dead_code_pct = (len(dead_code_files) / analyzed_non_entry * 100) if analyzed_non_entry > 0 else 0.0
    
    # 2. Circular Dependencies (Tarjan's SCC)
    # Build file-level adjacency list
    adj = {}
    for edge in dep_edges:
        src, tgt = edge["source"], edge["target"]
        if src != tgt:
            if src not in adj:
                adj[src] = set()
            adj[src].add(tgt)
            if tgt not in adj:
                adj[tgt] = set()
                
    index_counter = 0
    index = {}
    lowlink = {}
    on_stack = set()
    stack = []
    sccs = []
    
    def strongconnect(v):
        nonlocal index_counter
        index[v] = index_counter
        lowlink[v] = index_counter
        index_counter += 1
        stack.append(v)
        on_stack.add(v)
        
        for w in adj.get(v, []):
            if w not in index:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in on_stack:
                lowlink[v] = min(lowlink[v], index[w])
                
        if lowlink[v] == index[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                scc.append(w)
                if w == v:
                    break
            if len(scc) > 1:
                sccs.append(scc)
                
    for v in list(adj.keys()):
        if v not in index:
            strongconnect(v)
            
    # Format cycles
    cycles = []
    for scc in sccs:
        # Just return the SCC nodes + the first node to show a cycle visually
        cycles.append(scc + [scc[0]])
        
    circular_deps = len(sccs)
    
    # 3. Average Coupling
    unique_edges = set()
    nodes_with_edges = set()
    for edge in dep_edges:
        src, tgt = edge["source"], edge["target"]
        if src != tgt:
            unique_edges.add((src, tgt))
            nodes_with_edges.add(src)
            nodes_with_edges.add(tgt)
            
    total_unique_edges = len(unique_edges)
    num_nodes_with_edges = len(nodes_with_edges)
    
    avg_coupling = (total_unique_edges / num_nodes_with_edges) if num_nodes_with_edges > 0 else 0.0
    avg_coupling = round(avg_coupling, 1)
    
    # 4. Scoring Formula
    score = 100.0
    score -= min(30.0, dead_code_pct * 0.5)
    score -= min(40.0, circular_deps * 10)
    score -= min(30.0, max(0.0, avg_coupling - 3) * 5)
    score = max(0, round(score))
    
    return {
        "score": score,
        "breakdown": {
            "deadCodePct": round(dead_code_pct, 1),
            "deadCodeFiles": dead_code_files,
            "deadCodeAnalyzedFiles": len(analyzed_files),
            "totalFiles": len(all_files),
            "circularDeps": circular_deps,
            "cycles": cycles,
            "avgCoupling": avg_coupling,
        }
    }
