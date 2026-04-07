def analyze_sentiment(text: str) -> dict:
    """
    Very lightweight mock sentiment analyzer.
    In a real app, this would use a pretrained model or external API.
    """
    text_lower = text.lower()
    positive_words = ["good", "great", "awesome", "happy", "excited", "progress", "learned", "growth", "love", "beautiful", "amazing", "calm"]
    negative_words = ["bad", "terrible", "sad", "angry", "frustrated", "hate", "stuck", "fail", "anxious", "overwhelmed", "stress", "tired"]
    
    pos_score = sum(1 for w in positive_words if w in text_lower)
    neg_score = sum(1 for w in negative_words if w in text_lower)
    
    if pos_score > neg_score:
        return {"label": "Positive", "score": 0.8}
    elif neg_score > pos_score:
        return {"label": "Negative", "score": 0.3}
    return {"label": "Neutral", "score": 0.5}
