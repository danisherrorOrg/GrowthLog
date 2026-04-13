import re
import math

def analyze_sentiment(text: str) -> dict:
    """
    Advanced heuristic sentiment analyzer.
    Analyzes normalized word frequencies against extended dictionaries and accounts for contextual negations.
    Returns dynamic scores mapping from 0.0 to 1.0 instead of fixed bounds.
    """
    if not text or not str(text).strip():
        return {"label": "Neutral", "score": 0.5}

    text_str = str(text).lower()

    positive_words = {
        "good", "great", "awesome", "happy", "happiness", "excited", "progress", 
        "learned", "growth", "love", "beautiful", "amazing", "calm", "fantastic",
        "excellent", "success", "succeed", "proud", "joy", "peace", "better", "best",
        "win", "winning", "strong", "healthy", "inspired", "motivation"
    }

    negative_words = {
        "bad", "terrible", "sad", "angry", "frustrated", "hate", "stuck", "fail", 
        "failure", "anxious", "anxiety", "overwhelmed", "stress", "stressed", 
        "tired", "exhausted", "awful", "worst", "pain", "hurt", "worse", "depressed",
        "annoyed", "bored", "lonely", "guilt", "guilty", "regret"
    }

    negators = {
        "not", "no", "never", "none", "neither", "nor", "don't", "dont", "can't", 
        "cant", "won't", "wont", "isn't", "isnt", "aren't", "arent", "wasn't", 
        "wasnt", "didn't", "didnt", "hasn't", "hasnt", "haven't", "havent", 
        "hadn't", "hadnt", "shouldn't", "shouldnt", "wouldn't", "wouldnt", 
        "couldn't", "couldnt"
    }

    # Extract alphabetic words and standard punctuation as separate tokens
    tokens = re.findall(r"\b[a-z']+\b|[.,!?;]", text_str)
    punctuation = set(".,!?;")
    
    pos_score = 0.0
    neg_score = 0.0
    is_negated = False
    
    word_count = 0

    for word in tokens:
        if word in punctuation:
            is_negated = False # Punctuation breaks negation context bounds 
            continue
            
        word_count += 1
            
        if word in negators:
            is_negated = True
            continue
            
        if word in positive_words:
            if is_negated:
                neg_score += 1.0
            else:
                pos_score += 1.0
            is_negated = False
        elif word in negative_words:
            if is_negated:
                # "Not bad" is weakly positive
                pos_score += 0.5
            else:
                neg_score += 1.0
            is_negated = False
            
    if pos_score == 0 and neg_score == 0:
        return {"label": "Neutral", "score": 0.5}
        
    # Scale calculation
    polarity = (pos_score - neg_score) / (pos_score + neg_score)
    
    # We use a curve so a single positive word in a few words hits an intensity of ~0.3 - 0.5
    # High frequency hits max out intensity to 1.0
    intensity = min(1.0, (pos_score + neg_score) / max(3.0, math.sqrt(max(1, word_count))))
    
    # Normalize heavily to a continuous bound between 0.01 and 0.99
    final_score = 0.5 + (polarity * 0.45 * intensity)
    final_score = round(max(0.01, min(0.99, final_score)), 2)
    
    if final_score >= 0.6:
        label = "Positive"
    elif final_score <= 0.4:
        label = "Negative"
    else:
        label = "Neutral"
        
    return {"label": label, "score": final_score}
