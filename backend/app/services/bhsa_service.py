import re
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from tf.app import use

from app.core.config import get_settings


def get_book_names_mapping() -> Dict[str, str]:
    """
    Return a mapping of common book name variants to BHSA-format names.
    
    Returns:
        A dictionary mapping lowercase book names/abbreviations to BHSA format.
    """
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
    """
    Normalize a book name to BHSA format using direct or fuzzy matching.
    
    Args:
        book: The book name to normalize (e.g., "Gen", "Genesis", "1 Samuel").
        
    Returns:
        The BHSA-formatted book name, or the original if no match found.
    """
    mapping = get_book_names_mapping()
    book_lower = book.lower().strip()
    
    if book_lower in mapping:
        return mapping[book_lower]
    
    best_match = None
    best_score = 0
    threshold = 0.7
    
    for key, bhsa_name in mapping.items():
        score = _similarity(book_lower, key)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = bhsa_name
    
    if best_match:
        print(f"[BHSA] Fuzzy matched '{book}' -> '{best_match}' (score: {best_score:.2f})")
        return best_match
    
    return book


def _similarity(s1: str, s2: str) -> float:
    """
    Calculate similarity ratio between two strings using longest common subsequence.
    
    Args:
        s1: First string to compare.
        s2: Second string to compare.
        
    Returns:
        A similarity score between 0.0 and 1.0.
    """
    if not s1 or not s2:
        return 0.0
    
    if s1 == s2:
        return 1.0
    
    len1, len2 = len(s1), len(s2)
    dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    lcs_length = dp[len1][len2]
    return lcs_length / max(len1, len2)


def parse_reference(ref_string: str) -> Tuple[str, int, int, int]:
    """
    Parse a biblical reference string into its components.
    
    Args:
        ref_string: A reference like "Ruth 1:1-6" or "Gen 1:1".
        
    Returns:
        A tuple of (book, chapter, start_verse, end_verse).
        
    Raises:
        ValueError: If the reference cannot be parsed.
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
    """
    Determine if a clause type represents a mainline narrative clause.
    
    Args:
        clause_type: The BHSA clause type code.
        
    Returns:
        True if the clause is mainline (Way0 or WayX), False otherwise.
    """
    mainline_types = {"Way0", "WayX"}
    return clause_type in mainline_types


def get_chain_position(clause_type: str, prev_type: Optional[str]) -> str:
    """
    Determine the chain position of a clause relative to its predecessor.
    
    Args:
        clause_type: The current clause type.
        prev_type: The previous clause type, or None if first clause.
        
    Returns:
        One of "initial", "continuation", or "break".
    """
    if clause_type in ("Way0", "WayX"):
        if prev_type not in ("Way0", "WayX"):
            return "initial"
        return "continuation"
    elif prev_type in ("Way0", "WayX"):
        return "break"
    return "continuation"


def extract_lemmas(words: List[Any], F: Any) -> List[str]:
    """
    Extract lemmas from word nodes, filtering out grammatical particles.
    
    Args:
        words: List of BHSA word nodes.
        F: The text-fabric Features object.
        
    Returns:
        A list of cleaned lemma strings.
    """
    lemmas = []
    for w in words:
        pos = F.sp.v(w)
        if pos in ('art', 'prep', 'conj'):
            continue
        
        if hasattr(F, 'lex_utf8'):
            lemma = F.lex_utf8.v(w)
        elif hasattr(F, 'g_lex_utf8'):
            lemma = F.g_lex_utf8.v(w)
        else:
            lemma = F.lex.v(w)
        
        if lemma:
            lemmas.append(lemma.rstrip('/=[]'))
    
    return lemmas


BHSA_PASSAGE_UNIT_OTYPE = "clause"


class BHSAService:
    """
    Service for accessing BHSA (Biblia Hebraica Stuttgartensia Amstelodamensis) data.
    
    Uses text-fabric to load and query biblical Hebrew clause and word data.
    Passages are extracted clause-by-clause using BHSA clause nodes.
    """
    
    def __init__(self, bhsa_path: Optional[str] = None):
        """
        Initialize the BHSA service.
        
        Args:
            bhsa_path: Optional custom path to BHSA data. If None, uses default.
        """
        self.tf_api = None
        self.bhsa_path = bhsa_path
        self._is_loaded = False
        self._loading_message = "Not loaded"
    
    def get_loading_message(self) -> str:
        """
        Get the current loading status message.
        
        Returns:
            A string describing the current loading state.
        """
        return self._loading_message

    def load_bhsa(self, force_reload: bool = False) -> None:
        """
        Load BHSA data from text-fabric, optionally downloading from GCS first.
        
        Args:
            force_reload: If True, reload even if already loaded.
            
        Raises:
            RuntimeError: If loading fails.
        """
        if self._is_loaded and not force_reload:
            self._loading_message = "Data already loaded"
            return
        
        try:
            self._loading_message = "Initializing BHSA data load..."
            
            bucket_name = get_settings().gcs_bucket_name
            if bucket_name:
                self._loading_message = f"Checking GCS bucket: {bucket_name}..."
                self._download_from_gcs(bucket_name)

            if self.bhsa_path:
                self._loading_message = f"Loading Text-Fabric data from {self.bhsa_path}..."
                self.tf_api = use(self.bhsa_path, silent=False)
            else:
                self._loading_message = "Loading Text-Fabric data (ETCBC/bhsa)..."
                self.tf_api = use("ETCBC/bhsa", silent=False)
            
            self._is_loaded = True
            self._loading_message = "BHSA Data Ready"
        except Exception as e:
            self._loading_message = f"Error loading data: {str(e)}"
            raise RuntimeError(f"Failed to load BHSA: {str(e)}")

    def _download_from_gcs(self, bucket_name: str) -> None:
        """
        Download text-fabric data from a GCS bucket if not already present locally.
        
        Args:
            bucket_name: The name of the GCS bucket containing the data.
        """
        try:
            try:
                from google.cloud import storage
            except ImportError:
                print("google-cloud-storage not installed. Skipping GCS check.")
                self._loading_message = "GCS library not found. Skipping GCS check."
                return

            print(f"Checking GCS bucket: {bucket_name}")
            
            tf_data_dir = Path(os.path.expanduser("~/text-fabric-data"))
            github_dir = tf_data_dir / "github"
            
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
            all_blobs = list(blobs)
            total_blobs = len(all_blobs)
            
            for blob in all_blobs:
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

    
    def is_loaded(self) -> bool:
        """
        Check if BHSA data has been loaded.
        
        Returns:
            True if data is loaded and ready, False otherwise.
        """
        return self._is_loaded
    
    def extract_passage(self, book: str, chapter: int, start_verse: int, end_verse: int) -> Dict[str, Any]:
        """
        Extract passage data from BHSA by verse range, clause-by-clause.
        
        Args:
            book: The BHSA-format book name.
            chapter: The chapter number.
            start_verse: The starting verse number.
            end_verse: The ending verse number.
            
        Returns:
            A dictionary with reference, source_lang, and clauses list.
            
        Raises:
            RuntimeError: If BHSA is not loaded.
            ValueError: If the starting verse cannot be found.
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
            try:
                verse_node = T.nodeFromSection((book, chapter, verse_num))
            except Exception:
                if verse_num == start_verse:
                    raise ValueError(f"Could not find {book} {chapter}:{verse_num}")
                break
            
            actual_end_verse = verse_num
            
            clause_nodes = L.d(verse_node, otype=BHSA_PASSAGE_UNIT_OTYPE)
            for clause_node in clause_nodes:
                clause_data = self._extract_clause_data(
                    clause_node, verse_num, clause_id, prev_clause_type, F, L, T
                )
                clauses_data.append(clause_data)
                clause_id += 1
                prev_clause_type = clause_data["clause_type"]
        
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
        self, clause_node: Any, verse_num: int, clause_id: int,
        prev_type: Optional[str], F: Any, L: Any, T: Any
    ) -> Dict[str, Any]:
        """
        Extract data for a single BHSA clause node.
        
        Args:
            clause_node: The text-fabric clause node.
            verse_num: The verse number this clause belongs to.
            clause_id: The sequential clause ID within the passage.
            prev_type: The previous clause type for chain position calculation.
            F: The text-fabric Features object.
            L: The text-fabric Locality object.
            T: The text-fabric Text object.
            
        Returns:
            A dictionary with clause data including text, gloss, type, verb info, etc.
        """
        clause_text = T.text(clause_node)
        clause_type = F.typ.v(clause_node) or "Unknown"

        word_nodes = L.d(clause_node, otype="word")
        glosses = []
        for w in word_nodes:
            gloss = F.gloss.v(w) if hasattr(F, 'gloss') and F.gloss.v(w) else ""
            if gloss:
                glosses.append(gloss)
        gloss_text = " ".join(glosses)
        
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
        
        subjects = []
        objects = []
        names = []
        
        phrase_nodes = L.d(clause_node, otype="phrase")
        for phrase_node in phrase_nodes:
            phrase_function = F.function.v(phrase_node)
            phrase_words = L.d(phrase_node, otype="word")
            
            phrase_lemmas = extract_lemmas(phrase_words, F)
            clean_phrase = ' '.join(phrase_lemmas) if phrase_lemmas else None
            
            if phrase_function == "Subj" and clean_phrase:
                subjects.append(clean_phrase)
            elif phrase_function == "Objc" and clean_phrase:
                objects.append(clean_phrase)
            
            for w in phrase_words:
                if F.sp.v(w) == "nmpr":
                    if hasattr(F, 'lex_utf8'):
                        name = F.lex_utf8.v(w)
                    else:
                        name = F.lex.v(w)
                    if name:
                        names.append(name.rstrip("/=[]"))
        
        has_ki = any(F.lex.v(w) == "KJ/" for w in word_nodes)
        
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


_bhsa_service_instance: Optional[BHSAService] = None


def get_bhsa_service() -> BHSAService:
    """
    Get or create the singleton BHSA service instance.
    
    Returns:
        The shared BHSAService instance.
    """
    global _bhsa_service_instance
    if _bhsa_service_instance is None:
        _bhsa_service_instance = BHSAService()
    return _bhsa_service_instance
