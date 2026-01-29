"""
BHSA Service - Biblical Hebrew Data Access
Functional approach using text-fabric library
"""
import re
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from tf.app import use


# ============================================================
# PURE FUNCTIONS - Book Name Mapping
# ============================================================

def get_book_names_mapping() -> Dict[str, str]:
    """Pure function returning book name mappings"""
    return {
        "genesis": "Genesis", "gen": "Genesis",
        "exodus": "Exodus", "exod": "Exodus", "ex": "Exodus",
        "leviticus": "Leviticus", "lev": "Leviticus",
        "numbers": "Numbers", "num": "Numbers",
        "deuteronomy": "Deuteronomy", "deut": "Deuteronomy",
        "joshua": "Joshua", "josh": "Joshua",
        "judges": "Judges", "judg": "Judges",
        "ruth": "Ruth",
        "1 samuel": "1_Samuel", "1samuel": "1_Samuel", "1sam": "1_Samuel",
        "2 samuel": "2_Samuel", "2samuel": "2_Samuel", "2sam": "2_Samuel",
        "1 kings": "1_Kings", "1kings": "1_Kings", "1kgs": "1_Kings",
        "2 kings": "2_Kings", "2kings": "2_Kings", "2kgs": "2_Kings",
        "isaiah": "Isaiah", "isa": "Isaiah",
        "jeremiah": "Jeremiah", "jer": "Jeremiah",
        "ezekiel": "Ezekiel", "ezek": "Ezekiel",
        "hosea": "Hosea", "hos": "Hosea",
        "joel": "Joel",
        "amos": "Amos",
        "obadiah": "Obadiah", "obad": "Obadiah",
        "jonah": "Jonah",
        "micah": "Micah", "mic": "Micah",
        "nahum": "Nahum", "nah": "Nahum",
        "habakkuk": "Habakkuk", "hab": "Habakkuk",
        "zephaniah": "Zephaniah", "zeph": "Zephaniah",
        "haggai": "Haggai", "hag": "Haggai",
        "zechariah": "Zechariah", "zech": "Zechariah",
        "malachi": "Malachi", "mal": "Malachi",
        "psalms": "Psalms", "psalm": "Psalms", "ps": "Psalms",
        "job": "Job",
        "proverbs": "Proverbs", "prov": "Proverbs",
        "ecclesiastes": "Ecclesiastes", "eccl": "Ecclesiastes",
        "song of songs": "Song_of_songs", "song": "Song_of_songs",
        "lamentations": "Lamentations", "lam": "Lamentations",
        "esther": "Esther", "esth": "Esther",
        "daniel": "Daniel", "dan": "Daniel",
        "ezra": "Ezra",
        "nehemiah": "Nehemiah", "neh": "Nehemiah",
        "1 chronicles": "1_Chronicles", "1chronicles": "1_Chronicles",
        "2 chronicles": "2_Chronicles", "2chronicles": "2_Chronicles",
    }


def normalize_book_name(book: str) -> str:
    """Pure function to normalize book name to BHSA format with fuzzy matching"""
    mapping = get_book_names_mapping()
    book_lower = book.lower().strip()
    
    # Direct match
    if book_lower in mapping:
        return mapping[book_lower]
    
    # Fuzzy match - find closest book name
    best_match = None
    best_score = 0
    threshold = 0.7  # Minimum similarity required
    
    for key, bhsa_name in mapping.items():
        score = _similarity(book_lower, key)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = bhsa_name
    
    if best_match:
        print(f"[BHSA] Fuzzy matched '{book}' -> '{best_match}' (score: {best_score:.2f})")
        return best_match
    
    # No match found, return original
    return book


def _similarity(s1: str, s2: str) -> float:
    """
    Calculate similarity ratio between two strings using sequence matching.
    Returns a value between 0 and 1.
    """
    if not s1 or not s2:
        return 0.0
    
    # Quick check for exact match
    if s1 == s2:
        return 1.0
    
    # Use simple character-based similarity
    # Count matching characters in order (longest common subsequence approach)
    len1, len2 = len(s1), len(s2)
    
    # Create DP table for LCS
    dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    lcs_length = dp[len1][len2]
    
    # Similarity is LCS length divided by max string length
    return lcs_length / max(len1, len2)


def parse_reference(ref_string: str) -> Tuple[str, int, int, int]:
    """
    Pure function to parse biblical reference
    
    Returns: (book, chapter, start_verse, end_verse)
    Examples:
        "Ruth 1:1-6" -> ("Ruth", 1, 1, 6)
        "Gen 1:1" -> ("Genesis", 1, 1, 1)
    """
    ref_string = ref_string.strip()
    
    pattern = r'^(.+?)\s+(\d+):(\d+)[a-zA-Z]?-(\d+)[a-zA-Z]?$'
    match = re.match(pattern, ref_string)
    
    if match:
        book = normalize_book_name(match.group(1))
        chapter = int(match.group(2))
        start_verse = int(match.group(3))
        end_verse = int(match.group(4))
        return book, chapter, start_verse, end_verse
    
    pattern2 = r'^(.+?)\s+(\d+):(\d+)[a-zA-Z]?$'
    match2 = re.match(pattern2, ref_string)
    
    if match2:
        book = normalize_book_name(match2.group(1))
        chapter = int(match2.group(2))
        verse = int(match2.group(3))
        return book, chapter, verse, verse
    
    raise ValueError(f"Could not parse reference: {ref_string}")


def is_mainline_clause(clause_type: str) -> bool:
    """Pure function to determine if clause is mainline"""
    mainline_types = {"Way0", "WayX"}
    return clause_type in mainline_types


def get_chain_position(clause_type: str, prev_type: Optional[str]) -> str:
    """Pure function to determine chain position"""
    if clause_type in ("Way0", "WayX"):
        if prev_type not in ("Way0", "WayX"):
            return "initial"
        return "continuation"
    elif prev_type in ("Way0", "WayX"):
        return "break"
    return "continuation"


def extract_lemmas(words: List, F) -> List[str]:
    """Extract lemmas from words, filtering out grammatical particles"""
    lemmas = []
    for w in words:
        pos = F.sp.v(w)
        # Skip articles, prepositions, conjunctions
        if pos in ('art', 'prep', 'conj'):
            continue
        
        # Get lemma
        if hasattr(F, 'lex_utf8'):
            lemma = F.lex_utf8.v(w)
        elif hasattr(F, 'g_lex_utf8'):
            lemma = F.g_lex_utf8.v(w)
        else:
            lemma = F.lex.v(w)
        
        if lemma:
            lemmas.append(lemma.rstrip('/=[]'))
    
    return lemmas


# ============================================================
# BHSA SERVICE CLASS
# ============================================================
# Passage fetch is clause-by-clause from BHSA: we use BHSA clause nodes
# as the unit, never word nodes. The otype for that unit must be "clause".
BHSA_PASSAGE_UNIT_OTYPE = "clause"


class BHSAService:
    """Service for accessing BHSA data using text-fabric"""
    
    def __init__(self, bhsa_path: Optional[str] = None):
        """Initialize BHSA service"""
        self.tf_api = None
        self.bhsa_path = bhsa_path
        self._is_loaded = False
        self._loading_message = "Not loaded"
    
    def get_loading_message(self) -> str:
        return self._loading_message

    def load_bhsa(self, force_reload: bool = False) -> None:
        """Load BHSA data from text-fabric"""
        if self._is_loaded and not force_reload:
            self._loading_message = "Data already loaded"
            return
        
        try:
            self._loading_message = "Initializing BHSA data load..."
            
            # Check for GCS Bucket download
            bucket_name = os.getenv("GCS_BUCKET_NAME")
            if bucket_name:
                self._loading_message = f"Checking GCS bucket: {bucket_name}..."
                self._download_from_gcs(bucket_name)

            if self.bhsa_path:
                self._loading_message = f"Loading Text-Fabric data from {self.bhsa_path}..."
                self.tf_api = use(self.bhsa_path, silent=False)
            else:
                # Try to use local data
                self._loading_message = "Loading Text-Fabric data (ETCBC/bhsa)..."
                self.tf_api = use("ETCBC/bhsa", silent=False)
            
            self._is_loaded = True
            self._loading_message = "BHSA Data Ready"
        except Exception as e:
            self._loading_message = f"Error loading data: {str(e)}"
            raise RuntimeError(f"Failed to load BHSA: {str(e)}")

    def _download_from_gcs(self, bucket_name: str) -> None:
        """Download text-fabric data from GCS bucket if not exists"""
        try:
            # Only try to import google-cloud-storage if we have a bucket name
            try:
                from google.cloud import storage
            except ImportError:
                print("google-cloud-storage not installed. Skipping GCS check.")
                self._loading_message = "GCS library not found. Skipping GCS check."
                return

            print(f"Checking GCS bucket: {bucket_name}")
            
            # Target directory
            tf_data_dir = Path(os.path.expanduser("~/text-fabric-data"))
            github_dir = tf_data_dir / "github"
            
            # If data already exists, skip download (unless we want to force check)
            if github_dir.exists():
                print(f"Data found at {github_dir}, skipping download.")
                self._loading_message = "Local data found, skipping download..."
                return

            print(f"Downloading data from gs://{bucket_name} to {tf_data_dir}...")
            self._loading_message = f"Downloading data from GCS ({bucket_name})..."
            tf_data_dir.mkdir(parents=True, exist_ok=True)
            
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blobs = bucket.list_blobs(prefix="text-fabric-data/")
            
            count = 0
            # Convert iterator to list to get length if possible, or just iterate
            # Listing blobs takes time too
            all_blobs = list(blobs)
            total_blobs = len(all_blobs)
            
            for blob in all_blobs:
                # Remove prefix 'text-fabric-data/' from extraction path to match expected structure
                # We want ~/text-fabric-data/github/...
                rel_path = blob.name.replace("text-fabric-data/", "", 1)
                if not rel_path or rel_path.endswith("/"): 
                    continue
                    
                dest_path = tf_data_dir / rel_path
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                blob.download_to_filename(str(dest_path))
                count += 1
                if count % 10 == 0:
                    self._loading_message = f"Downloading files from GCS: {count}/{total_blobs}..."
                    print(f"Downloaded {count} files...")
            
            print(f"Successfully downloaded {count} files from GCS.")
            self._loading_message = "GCS Download complete. Initializing TF..."
            
        except Exception as e:
            print(f"Error downloading from GCS: {e}")
            self._loading_message = f"GCS Error: {str(e)}. Falling back to TF download..."
            # Don't raise here, attempting to load what we have or falling back

    
    def is_loaded(self) -> bool:
        """Check if BHSA is loaded"""
        return self._is_loaded
    
    def extract_passage(self, book: str, chapter: int, start_verse: int, end_verse: int) -> Dict:
        """
        Extract passage data from BHSA by verse range, then by clause.

        Uses BHSA/ETCBC clause nodes (L.d(verse_node, otype="clause")), not words.
        Each row is one BHSA clause; some clauses are single-word (e.g. short
        imperatives like "Go", "return")—that is expected ETCBC annotation.
        """
        if not self._is_loaded:
            raise RuntimeError("BHSA not loaded")
        
        A = self.tf_api
        F = A.api.F
        L = A.api.L
        T = A.api.T
        
        clauses_data = []
        clause_id = 1
        prev_clause_type = None
        actual_end_verse = start_verse
        
        for verse_num in range(start_verse, end_verse + 1):
            # Get verse node
            try:
                verse_node = T.nodeFromSection((book, chapter, verse_num))
            except Exception:
                if verse_num == start_verse:
                    raise ValueError(f"Could not find {book} {chapter}:{verse_num}")
                break
            
            actual_end_verse = verse_num
            
            # Fetch clause-by-clause from BHSA: use clause nodes only (not words).
            clause_nodes = L.d(verse_node, otype=BHSA_PASSAGE_UNIT_OTYPE)
            for clause_node in clause_nodes:
                clause_data = self._extract_clause_data(
                    clause_node, verse_num, clause_id, prev_clause_type, F, L, T
                )
                clauses_data.append(clause_data)
                clause_id += 1
                prev_clause_type = clause_data["clause_type"]
        
        # Build reference string
        if start_verse == actual_end_verse:
            ref_string = f"{book} {chapter}:{start_verse}"
        else:
            ref_string = f"{book} {chapter}:{start_verse}-{actual_end_verse}"
        
        return {
            "reference": ref_string,
            "source_lang": "hbo",
            "clauses": clauses_data,
        }
    
    def _extract_clause_data(
        self, clause_node, verse_num: int, clause_id: int,
        prev_type: Optional[str], F, L, T
    ) -> Dict:
        """
        Extract data for a single BHSA clause node.
        Input must be a clause node (otype='clause'); we get words only as
        children of this clause for gloss/verb, not as top-level units.
        """
        # Clause-level: text and type from the BHSA clause node
        clause_text = T.text(clause_node)
        clause_type = F.typ.v(clause_node) or "Unknown"

        # Words only as children of this clause (for gloss/verb), not iterating words as clauses
        word_nodes = L.d(clause_node, otype="word")
        glosses = []
        for w in word_nodes:
            gloss = F.gloss.v(w) if hasattr(F, 'gloss') and F.gloss.v(w) else ""
            if gloss:
                glosses.append(gloss)
        gloss_text = " ".join(glosses)
        
        # Get verb information
        verb_lemma = None
        verb_lemma_ascii = None
        verb_stem = None
        verb_tense = None
        
        for w in word_nodes:
            pos = F.sp.v(w)
            if pos == "verb":
                if hasattr(F, 'lex_utf8'):
                    verb_lemma = F.lex_utf8.v(w)
                elif hasattr(F, 'g_lex_utf8'):
                    verb_lemma = F.g_lex_utf8.v(w)
                else:
                    verb_lemma = F.lex.v(w)
                
                verb_lemma_ascii = F.lex.v(w)
                verb_stem = F.vs.v(w)
                verb_tense = F.vt.v(w)
                break
        
        # Get subjects, objects, names
        subjects = []
        objects = []
        names = []
        
        phrase_nodes = L.d(clause_node, otype="phrase")
        for phrase_node in phrase_nodes:
            phrase_function = F.function.v(phrase_node)
            phrase_words = L.d(phrase_node, otype="word")
            
            # Extract lemmas
            phrase_lemmas = extract_lemmas(phrase_words, F)
            clean_phrase = ' '.join(phrase_lemmas) if phrase_lemmas else None
            
            if phrase_function == "Subj" and clean_phrase:
                subjects.append(clean_phrase)
            elif phrase_function == "Objc" and clean_phrase:
                objects.append(clean_phrase)
            
            # Check for proper names
            for w in phrase_words:
                if F.sp.v(w) == "nmpr":
                    if hasattr(F, 'lex_utf8'):
                        name = F.lex_utf8.v(w)
                    else:
                        name = F.lex.v(w)
                    if name:
                        names.append(name.rstrip("/=[]"))
        
        # Check for כי
        has_ki = any(F.lex.v(w) == "KJ/" for w in word_nodes)
        
        # Build clause object using pure functions
        return {
            "clause_id": clause_id,
            "verse": verse_num,
            "text": clause_text.strip(),
            "gloss": gloss_text,
            "clause_type": clause_type,
            "is_mainline": is_mainline_clause(clause_type),
            "chain_position": get_chain_position(clause_type, prev_type),
            "lemma": verb_lemma.rstrip("/=[]") if verb_lemma else None,
            "lemma_ascii": verb_lemma_ascii.rstrip("/=[]") if verb_lemma_ascii else None,
            "binyan": verb_stem,
            "tense": verb_tense,
            "subjects": subjects,
            "objects": objects,
            "has_ki": has_ki,
            "names": list(set(names)) if names else [],
        }


# ============================================================
# FACTORY FUNCTION
# ============================================================

_bhsa_service_instance: Optional[BHSAService] = None


def get_bhsa_service() -> BHSAService:
    """Get or create BHSA service singleton"""
    global _bhsa_service_instance
    if _bhsa_service_instance is None:
        _bhsa_service_instance = BHSAService()
    return _bhsa_service_instance
