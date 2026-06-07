# Requirements Document

## Introduction

The AI Study Companion is a web application that helps students identify gaps in their knowledge and reinforce learning through targeted quizzes. Students upload PDF notes or paste raw text; the system extracts content, computes TF-IDF vectors, and uses cosine similarity against a built-in concept graph to score coverage of each concept. Concepts with low coverage scores are flagged as knowledge gaps, and the system generates quiz questions focused on those weak areas. The result is a fast, self-contained study loop that guides students toward what they actually need to review.

---

## Glossary

- **Study_App**: The AI Study Companion web application as a whole.
- **Upload_Service**: The backend component responsible for receiving and validating uploaded files or pasted text.
- **PDF_Extractor**: The backend component that extracts plain text from uploaded PDF files using PyMuPDF or pdfplumber.
- **Text_Normaliser**: The backend component that cleans and prepares extracted or pasted text for vectorisation (lowercasing, stop-word removal, tokenisation).
- **TF_IDF_Engine**: The backend component that computes TF-IDF vectors for student content and concept graph entries using scikit-learn.
- **Concept_Graph**: The built-in, static data structure that encodes subject-domain concepts and their expected vocabulary/relationships.
- **Gap_Analyser**: The backend component that computes cosine similarity between student TF-IDF vectors and each concept in the Concept_Graph to produce gap scores.
- **Gap_Score**: A numeric value in the range [0, 1] representing how well a student's content covers a given concept; lower values indicate weaker coverage.
- **Quiz_Generator**: The backend component that selects concepts with Gap_Scores below the gap threshold and generates targeted quiz questions for those concepts.
- **Question**: A single quiz item consisting of a prompt, a set of answer choices, the correct answer, and the concept it targets.
- **Session**: A single browser session representing one round of upload → analysis → quiz; no user accounts exist in v1.
- **UI**: The React-based browser interface through which the student interacts with the Study_App.
- **API**: The FastAPI HTTP interface exposed by the backend at base path `/api/v1`.

---

## Requirements

### Requirement 1: Content Ingestion — File Upload

**User Story:** As a student, I want to upload a PDF file containing my notes, so that the system can analyse my existing knowledge without requiring me to retype content.

#### Acceptance Criteria

1. THE UI SHALL provide a drag-and-drop upload zone and a click-to-browse fallback for selecting PDF files.
2. WHEN a student drops or selects a file, THE UI SHALL accept only files with a `.pdf` extension and a MIME type of `application/pdf`.
3. IF a student attempts to upload a file that is not a PDF, THEN THE UI SHALL display an error notification within 500 ms and reject the file without sending it to the API.
4. WHEN a valid PDF file is submitted, THE UI SHALL send a `multipart/form-data` POST request to `POST /api/v1/upload`.
5. WHEN the Upload_Service receives a PDF upload, THE Upload_Service SHALL enforce a maximum file size of 20 MB and reject files exceeding this limit with an HTTP 413 response.
6. IF the Upload_Service receives an oversized file, THEN THE Upload_Service SHALL return a JSON error body with a human-readable `detail` field.
7. WHEN the Upload_Service accepts a valid PDF, THE PDF_Extractor SHALL extract all readable text from the document and return it to the processing pipeline.
8. IF the PDF_Extractor cannot extract any text (e.g. scanned image PDF), THEN THE Upload_Service SHALL return an HTTP 422 response with a `detail` field explaining that no text could be extracted.

---

### Requirement 2: Content Ingestion — Text Paste

**User Story:** As a student, I want to paste my notes as plain text, so that I can analyse content that is not in PDF form.

#### Acceptance Criteria

1. THE UI SHALL provide a text area where the student can paste or type plain text notes.
2. WHEN the student submits pasted text, THE UI SHALL require the text to be at least 50 characters before enabling submission.
3. IF the student attempts to submit fewer than 50 characters of text, THEN THE UI SHALL display an inline validation message and disable the submit action.
4. WHEN valid pasted text is submitted, THE UI SHALL send a JSON POST request to `POST /api/v1/upload` with the text in a `content` field.
5. THE Upload_Service SHALL enforce a maximum plain-text payload of 500 000 characters and reject larger payloads with an HTTP 413 response.

---

### Requirement 3: Text Normalisation

**User Story:** As a developer, I want raw text to be cleaned and normalised before vectorisation, so that TF-IDF scores are not distorted by punctuation, casing, or common stop words.

#### Acceptance Criteria

1. WHEN the Upload_Service passes extracted or pasted text to the Text_Normaliser, THE Text_Normaliser SHALL convert all characters to lowercase.
2. THE Text_Normaliser SHALL remove punctuation, special characters, and numeric tokens that are not part of domain vocabulary.
3. THE Text_Normaliser SHALL remove English stop words using scikit-learn's built-in stop-word list.
4. THE Text_Normaliser SHALL return a normalised string of at least one token; IF the normalised output is empty, THEN THE Text_Normaliser SHALL propagate an error to the Upload_Service causing an HTTP 422 response.
5. FOR ALL valid input strings, normalising then re-normalising the output SHALL produce an identical result (idempotence property).

---

### Requirement 4: TF-IDF Vectorisation

**User Story:** As a developer, I want student content and concept graph entries to be represented as TF-IDF vectors, so that cosine similarity can quantify topical coverage.

#### Acceptance Criteria

1. THE TF_IDF_Engine SHALL fit a TF-IDF vectoriser on the Concept_Graph vocabulary at application startup.
2. WHEN normalised student text is received, THE TF_IDF_Engine SHALL transform it into a TF-IDF vector using the fitted vectoriser without re-fitting.
3. THE TF_IDF_Engine SHALL produce vectors whose L2 norm is 1.0 (unit-normalised) to ensure cosine similarity equals the dot product.
4. THE TF_IDF_Engine SHALL produce vectors of the same dimensionality as the Concept_Graph vocabulary for every input, regardless of out-of-vocabulary tokens in the student text.

---

### Requirement 5: Knowledge Gap Analysis

**User Story:** As a student, I want to see which concepts my notes cover poorly, so that I know exactly what to focus my revision on.

#### Acceptance Criteria

1. WHEN the Gap_Analyser receives a student TF-IDF vector, THE Gap_Analyser SHALL compute a Gap_Score for every concept in the Concept_Graph.
2. THE Gap_Analyser SHALL define the Gap_Score for a concept as the cosine similarity between the student vector and that concept's TF-IDF vector, yielding a value in [0, 1].
3. WHEN analysis is complete, THE API SHALL return a JSON response containing an array of objects, each with `concept`, `score`, and `is_gap` fields.
4. THE Gap_Analyser SHALL mark a concept as a gap (`is_gap: true`) when its Gap_Score is below 0.35.
5. THE API SHALL return the analysis response within 3 seconds of receiving a valid upload for documents up to 20 MB.
6. IF no concepts are identified as gaps (all scores ≥ 0.35), THEN THE API SHALL return the full scored list with `is_gap: false` for all entries and THE UI SHALL display a message informing the student that no significant gaps were detected.

---

### Requirement 6: Quiz Generation

**User Story:** As a student, I want the system to generate quiz questions targeting my knowledge gaps, so that I can actively test and reinforce weak areas.

#### Acceptance Criteria

1. WHEN a student requests a quiz, THE UI SHALL send a POST request to `POST /api/v1/quiz` with the list of gap concepts from the most recent analysis.
2. THE Quiz_Generator SHALL generate at least one Question per gap concept and no more than three Questions per concept per quiz session.
3. WHEN the Quiz_Generator produces a Question, THE Question SHALL include a `prompt` string, an `options` array of exactly four strings, a `correct_index` integer (0–3), and a `concept` string.
4. THE Quiz_Generator SHALL ensure that all four answer options for a given Question are distinct strings.
5. IF no gap concepts are supplied in the request, THEN THE Quiz_Generator SHALL return an HTTP 400 response with a `detail` field stating that at least one gap concept is required.
6. THE Quiz_Generator SHALL return the complete question set within 2 seconds of receiving a valid request.

---

### Requirement 7: Quiz Interaction and Scoring

**User Story:** As a student, I want to answer quiz questions and receive immediate feedback with a final score, so that I can gauge how well I understand my weak areas.

#### Acceptance Criteria

1. THE UI SHALL display one Question at a time with its four answer options rendered as selectable buttons.
2. WHEN a student selects an answer, THE UI SHALL immediately indicate whether the selection is correct or incorrect without requiring a network request.
3. WHEN a student selects an answer, THE UI SHALL reveal which option was correct if the student's choice was wrong.
4. WHEN a student selects an answer, THE UI SHALL disable all answer buttons for the current Question so the answer cannot be changed.
5. WHEN all Questions in a session have been answered, THE UI SHALL display a summary showing the total number of correct answers, total questions, and percentage score.
6. WHEN the summary is displayed, THE UI SHALL provide a button that allows the student to start a new session, returning to the upload/paste screen.

---

### Requirement 8: Session State Management

**User Story:** As a student, I want my current session (upload → analysis → quiz) to remain intact while I navigate within the app, so that I do not lose progress unexpectedly.

#### Acceptance Criteria

1. WHILE a session is active, THE UI SHALL retain the analysis results and generated questions in React component state without requiring a page reload.
2. WHEN the student navigates between the upload, results, and quiz views within the same browser tab, THE UI SHALL preserve session state across those view transitions.
3. IF the student reloads the browser page, THEN THE UI SHALL reset to the initial upload screen; no session persistence to `localStorage` or a database is required in v1.
4. WHILE a backend request is in flight, THE UI SHALL display a loading indicator and disable controls that would trigger duplicate requests.

---

### Requirement 9: Error Handling and User Feedback

**User Story:** As a student, I want clear error messages when something goes wrong, so that I understand what happened and how to recover.

#### Acceptance Criteria

1. WHEN the API returns an HTTP 4xx or 5xx response, THE UI SHALL display a toast notification containing the `detail` message from the response body within 500 ms.
2. IF the UI cannot reach the API (network error or timeout after 15 seconds), THEN THE UI SHALL display a toast notification informing the student that the server could not be reached and suggest retrying.
3. WHEN an error occurs, THE UI SHALL return all affected controls to an enabled, actionable state so the student can retry.
4. THE Upload_Service SHALL log all HTTP 5xx errors with a timestamp, request path, and error detail to standard output.

---

### Requirement 10: Concept Graph — Data Integrity

**User Story:** As a developer, I want the Concept_Graph to be a well-structured static resource, so that the TF-IDF and gap-analysis pipeline always has a consistent and valid vocabulary to work against.

#### Acceptance Criteria

1. THE Concept_Graph SHALL be defined as a static JSON or Python data structure loaded at application startup.
2. THE Concept_Graph SHALL contain at least 20 distinct concepts, each with a non-empty `name` string and a non-empty `keywords` list.
3. IF the Concept_Graph file is missing or malformed at startup, THEN THE Study_App SHALL fail to start and log a descriptive error message to standard output.
4. THE TF_IDF_Engine SHALL accept the Concept_Graph as its sole source of vocabulary; no concepts shall be added or removed at runtime in v1.
