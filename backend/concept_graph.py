"""
concept_graph.py — static concept graph for the AI Study Companion.

Loaded once at import time. _validate() runs immediately and raises
RuntimeError if the structure is missing or malformed, preventing startup.
"""

CONCEPT_GRAPH: list[dict] = [
    {
        "name": "math",
        "keywords": [
            "arithmetic", "number", "equation", "integer", "fraction",
            "decimal", "percentage", "ratio", "counting", "digit",
            "sum", "difference", "product", "quotient", "numeral",
        ],
    },
    {
        "name": "algebra",
        "keywords": [
            "variable", "expression", "polynomial", "linear", "coefficient",
            "equation", "inequality", "factoring", "quadratic", "exponent",
            "binomial", "monomial", "constant", "term", "solve",
        ],
    },
    {
        "name": "calculus",
        "keywords": [
            "derivative", "integral", "limit", "differentiation", "continuity",
            "antiderivative", "chain rule", "gradient", "tangent", "slope",
            "convergence", "divergence", "series", "function", "rate",
        ],
    },
    {
        "name": "probability",
        "keywords": [
            "chance", "event", "distribution", "random", "likelihood",
            "sample space", "outcome", "independent", "conditional", "bayes",
            "variance", "expected value", "permutation", "combination", "trial",
        ],
    },
    {
        "name": "grammar",
        "keywords": [
            "sentence", "noun", "verb", "syntax", "clause",
            "adjective", "adverb", "preposition", "conjunction", "pronoun",
            "tense", "subject", "predicate", "modifier", "phrase",
        ],
    },
    {
        "name": "essay writing",
        "keywords": [
            "thesis", "argument", "paragraph", "structure", "introduction",
            "conclusion", "evidence", "topic sentence", "transition", "outline",
            "draft", "revision", "citation", "body", "claim",
        ],
    },
    {
        "name": "biology",
        "keywords": [
            "cell", "organism", "evolution", "species", "metabolism",
            "photosynthesis", "respiration", "ecosystem", "adaptation", "taxonomy",
            "reproduction", "heredity", "protein", "enzyme", "homeostasis",
        ],
    },
    {
        "name": "cells",
        "keywords": [
            "membrane", "nucleus", "mitosis", "organelle", "cytoplasm",
            "ribosome", "mitochondria", "chloroplast", "vacuole", "lysosome",
            "cell wall", "endoplasmic reticulum", "golgi", "meiosis", "division",
        ],
    },
    {
        "name": "genetics",
        "keywords": [
            "gene", "dna", "allele", "chromosome", "heredity",
            "mutation", "phenotype", "genotype", "dominant", "recessive",
            "rna", "transcription", "translation", "inheritance", "locus",
        ],
    },
    {
        "name": "chemistry",
        "keywords": [
            "element", "compound", "molecule", "reaction", "bond",
            "periodic table", "valence", "oxidation", "reduction", "acid",
            "base", "solution", "concentration", "mole", "formula",
        ],
    },
    {
        "name": "atoms",
        "keywords": [
            "proton", "neutron", "electron", "nucleus", "orbital",
            "isotope", "atomic number", "mass number", "shell", "subshell",
            "ion", "charge", "energy level", "quantum", "atomic mass",
        ],
    },
    {
        "name": "reactions",
        "keywords": [
            "reactant", "product", "catalyst", "equilibrium", "exothermic",
            "endothermic", "activation energy", "rate", "stoichiometry", "yield",
            "combustion", "synthesis", "decomposition", "displacement", "redox",
        ],
    },
    {
        "name": "physics",
        "keywords": [
            "energy", "force", "mass", "velocity", "acceleration",
            "momentum", "work", "power", "wave", "frequency",
            "amplitude", "pressure", "density", "temperature", "heat",
        ],
    },
    {
        "name": "motion",
        "keywords": [
            "displacement", "velocity", "speed", "kinematics", "trajectory",
            "distance", "time", "uniform", "acceleration", "deceleration",
            "projectile", "circular", "position", "vector", "scalar",
        ],
    },
    {
        "name": "forces",
        "keywords": [
            "newton", "tension", "friction", "gravity", "torque",
            "normal force", "net force", "equilibrium", "inertia", "weight",
            "spring", "compression", "buoyancy", "drag", "centripetal",
        ],
    },
    {
        "name": "history",
        "keywords": [
            "civilization", "empire", "war", "revolution", "timeline",
            "dynasty", "colonization", "independence", "treaty", "battle",
            "monarchy", "republic", "medieval", "ancient", "modern",
        ],
    },
    {
        "name": "geography",
        "keywords": [
            "continent", "climate", "topography", "region", "latitude",
            "longitude", "ocean", "mountain", "river", "desert",
            "biome", "population", "urbanization", "border", "map",
        ],
    },
    {
        "name": "programming",
        "keywords": [
            "variable", "function", "loop", "algorithm", "syntax",
            "condition", "class", "object", "method", "array",
            "string", "integer", "boolean", "compiler", "interpreter",
        ],
    },
    {
        "name": "data structures",
        "keywords": [
            "array", "list", "tree", "graph", "hash",
            "stack", "queue", "linked list", "heap", "trie",
            "node", "edge", "pointer", "index", "dictionary",
        ],
    },
    {
        "name": "algorithms",
        "keywords": [
            "sort", "search", "complexity", "recursion", "iteration",
            "big o", "dynamic programming", "greedy", "backtracking", "divide",
            "conquer", "binary search", "breadth first", "depth first", "heuristic",
        ],
    },
]


def _validate() -> None:
    """
    Validates CONCEPT_GRAPH structure at import time.
    Raises RuntimeError with a descriptive message if validation fails,
    preventing the application from starting with a broken concept graph.
    """
    if not isinstance(CONCEPT_GRAPH, list):
        raise RuntimeError("CONCEPT_GRAPH must be a list")
    if len(CONCEPT_GRAPH) < 20:
        raise RuntimeError(
            f"CONCEPT_GRAPH must contain at least 20 concepts, found {len(CONCEPT_GRAPH)}"
        )
    seen_names: set[str] = set()
    for i, concept in enumerate(CONCEPT_GRAPH):
        if not isinstance(concept, dict):
            raise RuntimeError(f"Concept at index {i} must be a dict, got {type(concept)}")
        name = concept.get("name")
        if not name or not isinstance(name, str):
            raise RuntimeError(f"Concept at index {i} has a missing or empty 'name' field")
        if name in seen_names:
            raise RuntimeError(f"Duplicate concept name '{name}' at index {i}")
        seen_names.add(name)
        keywords = concept.get("keywords")
        if not keywords or not isinstance(keywords, list):
            raise RuntimeError(
                f"Concept '{name}' has a missing or empty 'keywords' list"
            )
        if not all(isinstance(k, str) and k.strip() for k in keywords):
            raise RuntimeError(
                f"Concept '{name}' contains non-string or blank keyword entries"
            )


_validate()
