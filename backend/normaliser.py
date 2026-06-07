"""
normaliser.py — text normalisation for the AI Study Companion.

Provides a single pure function `normalise(text)` that prepares raw
student text for TF-IDF vectorisation.
"""

import string
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

# Build a translation table that maps every punctuation character to a space.
# Using str.translate is faster than regex for simple character removal.
_PUNCT_TABLE = str.maketrans(string.punctuation, " " * len(string.punctuation))

# Cache the stop-word set as a plain Python set for O(1) lookup.
_STOP_WORDS: frozenset[str] = frozenset(ENGLISH_STOP_WORDS)


def normalise(text: str) -> str:
    """
    Clean and normalise a raw text string for TF-IDF vectorisation.

    Steps:
      1. Lowercase all characters.
      2. Replace every punctuation character with a space.
      3. Tokenise on whitespace.
      4. Drop tokens that are purely numeric.
      5. Drop tokens present in scikit-learn's English stop-word list.
      6. Rejoin the surviving tokens with a single space.

    Returns:
        A normalised string containing at least one token.

    Raises:
        ValueError: If the normalised output contains no tokens
                    (e.g. the input was empty, whitespace-only, contained
                    only punctuation/numbers/stop-words).
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str, got {type(text).__name__}")

    # Step 1 — lowercase
    lowered = text.lower()

    # Step 2 — replace punctuation with spaces
    no_punct = lowered.translate(_PUNCT_TABLE)

    # Step 3 — tokenise
    tokens = no_punct.split()

    # Steps 4 & 5 — filter numeric-only tokens and stop words
    filtered = [
        token
        for token in tokens
        if not token.isnumeric() and token not in _STOP_WORDS
    ]

    if not filtered:
        raise ValueError(
            "Text contains no meaningful content after normalisation. "
            "Ensure your input has enough domain-relevant words."
        )

    return " ".join(filtered)
