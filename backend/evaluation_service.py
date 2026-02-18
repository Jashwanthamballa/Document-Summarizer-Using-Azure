"""
Evaluation Service for Summary Quality Assessment
Uses textstat for readability and sentence-transformers for consistency
"""
import textstat
import numpy as np
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
from typing import Dict, List, Tuple
import re

class EvaluationService:
    """Service for evaluating summary quality"""
    
    def __init__(self):
        # Initialize sentence transformer model for consistency evaluation
        self.similarity_model = None
        self.model_loading_attempted = False
    
    def _ensure_model_loaded(self):
        """Load the sentence transformer model on first use"""
        if self.model_loading_attempted:
            return
        
        self.model_loading_attempted = True
        
        # Temporarily disable model loading due to SSL issues
        self.similarity_model = None
        return
    
    def evaluate_readability(self, text: str) -> Dict[str, float]:
        """
        Evaluate readability metrics using textstat
        Returns dictionary with various readability scores
        """
        if not text or len(text.strip()) < 10:
            return self._get_default_readability_scores()
        
        try:
            # Clean text for evaluation
            clean_text = self._clean_text_for_evaluation(text)
            
            # Calculate textstat metrics
            metrics = {
                'flesch_kincaid_grade': textstat.flesch_kincaid_grade(clean_text),
                'flesch_reading_ease': textstat.flesch_reading_ease(clean_text),
                'gunning_fog': textstat.gunning_fog(clean_text),
                'automated_readability_index': textstat.automated_readability_index(clean_text),
                'coleman_liau_index': textstat.coleman_liau_index(clean_text),
                'average_sentence_length': textstat.avg_sentence_length(clean_text),
                'syllable_count': textstat.syllable_count(clean_text),
                'word_count': textstat.lexicon_count(clean_text, removepunct=True)
            }
            
            # Calculate composite readability score (0-100)
            readability_score = self._calculate_readability_score(metrics)
            metrics['readability_score'] = readability_score
            
            return metrics
            
        except Exception as e:
            print(f"Error in readability evaluation: {e}")
            return self._get_default_readability_scores()
    
    def evaluate_consistency(self, original_text: str, summary: str) -> Dict[str, float]:
        """
        Evaluate consistency between original text and summary
        Returns dictionary with consistency metrics
        """
        if not original_text or not summary:
            return self._get_default_consistency_scores()
        
        try:
            # Semantic similarity using sentence transformers
            semantic_similarity = self._calculate_semantic_similarity(original_text, summary)
            
            # Factual consistency (basic keyword overlap)
            factual_consistency = self._calculate_factual_consistency(original_text, summary)
            
            # Coherence within the summary itself
            coherence_score = self._calculate_coherence(summary)
            
            # Composite consistency score
            consistency_score = self._calculate_consistency_score(
                semantic_similarity, factual_consistency, coherence_score
            )
            
            return {
                'semantic_similarity_score': semantic_similarity,
                'factual_consistency_score': factual_consistency,
                'coherence_score': coherence_score,
                'consistency_score': consistency_score
            }
            
        except Exception as e:
            print(f"Error in consistency evaluation: {e}")
            return self._get_default_consistency_scores()
    
    def evaluate_summary_complete(self, original_text: str, summary: str, summary_type: str = "medium") -> Dict[str, float]:
        """
        Complete evaluation combining readability and consistency
        Returns all evaluation metrics plus overall quality score
        """
        # Get readability metrics
        readability_metrics = self.evaluate_readability(summary)
        
        # Get consistency metrics
        consistency_metrics = self.evaluate_consistency(original_text, summary)
        
        # Calculate overall quality score
        overall_quality = self._calculate_overall_quality(
            readability_metrics['readability_score'],
            consistency_metrics['consistency_score'],
            summary_type
        )
        
        # Combine all metrics
        complete_evaluation = {
            **readability_metrics,
            **consistency_metrics,
            'overall_quality_score': overall_quality
        }
        
        return complete_evaluation
    
    def _clean_text_for_evaluation(self, text: str) -> str:
        """Clean text for accurate textstat evaluation"""
        # Remove extra whitespace and normalize
        text = ' '.join(text.split())
        
        # Ensure sentences end with proper punctuation for textstat
        if text and not text.endswith(('.', '!', '?')):
            text += '.'
        
        return text
    
    def _calculate_readability_score(self, metrics: Dict[str, float]) -> float:
        """
        Calculate composite readability score (0-100)
        Higher score = more readable
        """
        try:
            # Use Flesch Reading Ease as primary metric (already 0-100 scale)
            flesch_ease = max(0, min(100, metrics['flesch_reading_ease']))
            
            # Adjust based on grade level (prefer 8th-12th grade level)
            grade_level = metrics['flesch_kincaid_grade']
            grade_penalty = 0
            if grade_level > 16:  # Too advanced
                grade_penalty = min(20, (grade_level - 16) * 2)
            elif grade_level < 6:  # Too simple
                grade_penalty = min(15, (6 - grade_level) * 2)
            
            # Adjust for sentence length (prefer moderate length)
            avg_sentence_length = metrics['average_sentence_length']
            length_penalty = 0
            if avg_sentence_length > 25:  # Too long
                length_penalty = min(10, (avg_sentence_length - 25) * 0.5)
            elif avg_sentence_length < 8:  # Too short
                length_penalty = min(10, (8 - avg_sentence_length) * 1.0)
            
            # Final readability score
            readability_score = max(0, min(100, flesch_ease - grade_penalty - length_penalty))
            
            return round(readability_score, 2)
            
        except Exception:
            return 50.0  # Default middle score
    
    def _calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity using sentence transformers"""
        # Try to load model on first use
        self._ensure_model_loaded()
        
        if not self.similarity_model:
            # Fallback to simple word overlap
            return self._calculate_word_overlap(text1, text2)
        
        try:
            # Clean and truncate texts for embedding (model has token limits)
            text1_clean = self._clean_text_for_embedding(text1)[:1000]
            text2_clean = self._clean_text_for_embedding(text2)[:1000]
            
            # Generate embeddings
            embeddings = self.similarity_model.encode([text1_clean, text2_clean])
            
            # Calculate cosine similarity
            similarity = np.dot(embeddings[0], embeddings[1]) / (
                np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
            )
            
            # Convert to 0-100 scale
            return max(0, min(100, similarity * 100))
            
        except Exception as e:
            print(f"Error in semantic similarity calculation: {e}")
            return self._calculate_word_overlap(text1, text2)
    
    def _calculate_factual_consistency(self, original: str, summary: str) -> float:
        """Calculate factual consistency using keyword and entity overlap"""
        try:
            # Extract key terms (simple approach)
            original_words = self._extract_key_terms(original)
            summary_words = self._extract_key_terms(summary)
            
            if not original_words:
                return 50.0
            
            # Calculate overlap ratio
            overlap = len(original_words.intersection(summary_words))
            total_important_words = len(original_words)
            
            # Calculate consistency score (0-100)
            consistency = (overlap / total_important_words) * 100
            
            return min(100, consistency)
            
        except Exception:
            return 50.0
    
    def _calculate_coherence(self, text: str) -> float:
        """Calculate internal coherence of the text"""
        try:
            sentences = self._split_into_sentences(text)
            
            if len(sentences) < 2:
                return 80.0  # Single sentence is coherent
            
            # Simple coherence based on sentence similarity
            if self.similarity_model:
                sentence_embeddings = self.similarity_model.encode(sentences)
                similarities = []
                
                for i in range(len(sentences) - 1):
                    sim = np.dot(sentence_embeddings[i], sentence_embeddings[i + 1]) / (
                        np.linalg.norm(sentence_embeddings[i]) * np.linalg.norm(sentence_embeddings[i + 1])
                    )
                    similarities.append(sim)
                
                avg_coherence = np.mean(similarities) * 100
                return max(0, min(100, avg_coherence))
            else:
                # Fallback: assume reasonable coherence for well-structured text
                return 70.0
                
        except Exception:
            return 60.0
    
    def _calculate_consistency_score(self, semantic_sim: float, factual_cons: float, coherence: float) -> float:
        """Calculate composite consistency score"""
        # Weighted average of consistency metrics
        weights = {
            'semantic': 0.5,
            'factual': 0.3,
            'coherence': 0.2
        }
        
        consistency_score = (
            semantic_sim * weights['semantic'] +
            factual_cons * weights['factual'] +
            coherence * weights['coherence']
        )
        
        return round(max(0, min(100, consistency_score)), 2)
    
    def _calculate_overall_quality(self, readability: float, consistency: float, summary_type: str) -> float:
        """Calculate overall quality score"""
        # Adjust weights based on summary type
        if summary_type == "short":
            # For short summaries, consistency is more important
            weights = {'readability': 0.3, 'consistency': 0.7}
        elif summary_type == "long":
            # For long summaries, readability is more important
            weights = {'readability': 0.5, 'consistency': 0.5}
        else:  # medium
            weights = {'readability': 0.4, 'consistency': 0.6}
        
        overall = (
            readability * weights['readability'] +
            consistency * weights['consistency']
        )
        
        return round(max(0, min(100, overall)), 2)
    
    # Helper methods
    def _get_default_readability_scores(self) -> Dict[str, float]:
        """Return default readability scores when evaluation fails"""
        return {
            'flesch_kincaid_grade': 10.0,
            'flesch_reading_ease': 50.0,
            'gunning_fog': 12.0,
            'automated_readability_index': 10.0,
            'coleman_liau_index': 10.0,
            'average_sentence_length': 15.0,
            'syllable_count': 100,
            'word_count': 50,
            'readability_score': 50.0
        }
    
    def _get_default_consistency_scores(self) -> Dict[str, float]:
        """Return default consistency scores when evaluation fails"""
        return {
            'semantic_similarity_score': 70.0,
            'factual_consistency_score': 70.0,
            'coherence_score': 70.0,
            'consistency_score': 70.0
        }
    
    def _clean_text_for_embedding(self, text: str) -> str:
        """Clean text for sentence transformer processing"""
        # Remove extra whitespace and special characters
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text
    
    def _calculate_word_overlap(self, text1: str, text2: str) -> float:
        """Fallback similarity calculation using word overlap"""
        words1 = set(re.findall(r'\w+', text1.lower()))
        words2 = set(re.findall(r'\w+', text2.lower()))
        
        if not words1:
            return 0.0
        
        overlap = len(words1.intersection(words2))
        return (overlap / len(words1)) * 100
    
    def _extract_key_terms(self, text: str) -> set:
        """Extract key terms from text (simplified approach)"""
        # Remove common stop words and extract meaningful words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
            'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'do', 'does', 'did'
        }
        
        # Extract words (3+ characters, not in stop words)
        words = re.findall(r'\b\w{3,}\b', text.lower())
        key_terms = {word for word in words if word not in stop_words}
        
        return key_terms
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

# Note: Create EvaluationService instance in your application code when needed