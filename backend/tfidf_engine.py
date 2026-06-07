"""
tfidf_engine.py — TF-IDF vectorisation for the AI Study Companion.

The TfidfVectorizer is fitted once at module import time on the concept
graph keyword corpus. All subsequent calls use transform() only (no
re-fitting), guaranteeing consistent vocabulary dimensionality across
every request.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from concept_graph import CONCEPT_GRAPH

# ---------------------------------------------------------------------------
# Build the corpus from concept keyword lists and fit the vectoriser.
# norm="l2" ensures every resulting vector has an L2 norm of 1.0, so that
# cosine similarity reduces to a plain dot product.
# ---------------------------------------------------------------------------

_concept_names: list[str] = [c["name"] for c in CONCEPT_GRAPH]
_corpus: list[str] = [" ".join(c["keywords"]) for c in CONCEPT_GRAPH]

vectorizer: TfidfVectorizer = TfidfVectorizer(norm="l2")
_concept_matrix = vectorizer.fit_transform(_corpus)  # shape: (20, vocab_size)

# Pre-compute dense concept vectors once so gap analysis is just a dot product.
_concept_vectors: dict[str, np.ndarray] = {
    name: _concept_matrix[i].toarray().flatten()
    for i, name in enumerate(_concept_names)
}


def get_concept_vectors() -> dict[str, np.ndarray]:
    """
    Return a mapping of concept name → unit-normalised 1-D TF-IDF vector.

    The returned dict contains one entry per concept in CONCEPT_GRAPH.
    Vectors are pre-computed at startup; this call is O(1).
    """
    return _concept_vectors


def transform(text: str) -> np.ndarray:
    """
    Transform a pre-normalised text string into a unit-normalised TF-IDF
    vector using the fitted vectoriser.

    The returned vector has the same dimensionality as the concept-graph
    vocabulary regardless of whether any tokens are out-of-vocabulary.

    For entirely out-of-vocabulary input the returned vector is the zero
    vector (L2 norm 0.0), which yields a cosine similarity of 0 against
    every concept — correctly representing zero coverage.

    Args:
        text: A pre-normalised (lowercased, stop-word-removed) string.

    Returns:
        A 1-D numpy array of shape (vocab_size,).
    """
    sparse = vectorizer.transform([text])  # shape: (1, vocab_size)
    return sparse.toarray().flatten()
