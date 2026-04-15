from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str) -> dict:
    """
    Sentiment analyzer using VADER (Valence Aware Dictionary and sEntiment Reasoner).
    Specifically tuned for short informal text, handles negation, punctuation, and emphasis.
    Returns dynamic scores mapped from 0.01 to 0.99.
    """
    if not text or not str(text).strip():
        return {"label": "Neutral", "score": 0.5}

    scores = analyzer.polarity_scores(str(text))
    compound = scores['compound']
    
    # Map compound score [-1.0, 1.0] to [0.01, 0.99]
    final_score = round(0.5 + (compound * 0.49), 2)
    final_score = max(0.01, min(0.99, final_score))
    
    if final_score >= 0.6:
        label = "Positive"
    elif final_score <= 0.4:
        label = "Negative"
    else:
        label = "Neutral"
        
    return {"label": label, "score": final_score}
