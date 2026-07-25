from typing import List, Dict
from collections import defaultdict, deque

def compute_blast_radius(
    dep_edges: List[Dict[str, str]],
    target_file: str,
    max_depth: int = 5,
) -> Dict:
    # Build adjacency map for blast radius: dependency -> dependent
    # For each edge {source: A, target: B}, B depends on A.
    # So if A changes, B is affected. We map A -> B (source -> target).
    
    adj = defaultdict(set)
    for edge in dep_edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src and tgt:
            adj[src].add(tgt)
            
    direct = set()
    transitive = set()
    visited = {target_file}
    
    queue = deque([(target_file, 0)])
    
    while queue:
        curr, depth = queue.popleft()
        
        if depth == 1:
            direct.add(curr)
        elif depth > 1:
            transitive.add(curr)
            
        if depth < max_depth:
            for nxt in adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append((nxt, depth + 1))
                    
    return {
        "file": target_file,
        "direct": sorted(list(direct)),
        "transitive": sorted(list(transitive)),
        "directCount": len(direct),
        "transitiveCount": len(transitive)
    }
