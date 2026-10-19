"""
The full "Should I Do This?" decision matrix: 18 questions in 5 groups,
scored 0-100 with a verdict and plain-language insights.
"""
import math

# key -> group. "cost" keys count against the score; urgency/handoff only steer the verdict.
FACTORS = {
    "required": "need", "goals": "need", "urgency": "need", "handoff": "need",
    "impact": "impact", "longterm": "impact", "skip": "impact", "harm": "impact",
    "learning": "growth", "health": "growth", "people": "growth",
    "time": "cost", "energy": "cost", "money": "cost", "opp": "cost",
    "emotion": "heart", "motive": "heart", "regret": "heart",
}

VERDICTS = {
    "dont": ("Don't do it", "High risk of harm with little benefit."),
    "do_now": ("Do it now", "It matters and it's urgent. Start today."),
    "schedule": ("Schedule it", "Worth doing. Put a specific day and time on it."),
    "hand_off": ("Hand it off", "Urgent but low value for you. Ask someone else."),
    "minimum": ("Do the minimum", "Urgent but low value. Get it done quickly, don't polish."),
    "drop": ("Drop it", "Low value. This is likely a waste of your time."),
    "optional": ("Optional", "Only if you have spare time and energy."),
}


def _round(x):
    return int(math.floor(x + 0.5))  # half-up, not Python's banker's rounding


def _n(v):
    return (v - 1) / 4 * 100


def _inv(v):
    return 100 - _n(v)


def _avg(xs):
    return sum(xs) / len(xs)


def evaluate(v: dict):
    """v maps every FACTORS key to 1-5. Returns score, verdict, dimensions, insights."""
    dims = {
        "need": _avg([_n(v["required"]), _n(v["goals"])]),
        "impact": _avg([_n(v["impact"]), _n(v["longterm"]), _n(v["skip"]), _inv(v["harm"])]),
        "growth": _avg([_n(v["learning"]), _n(v["health"]), _n(v["people"])]),
        "lightness": _avg([_inv(v["time"]), _inv(v["energy"]), _inv(v["money"]), _inv(v["opp"])]),
        "heart": _avg([_n(v["emotion"]), _n(v["motive"]), _n(v["regret"])]),
    }
    worth = _round(0.25 * dims["need"] + 0.30 * dims["impact"] + 0.20 * dims["growth"]
                   + 0.15 * dims["lightness"] + 0.10 * dims["heart"])

    if v["harm"] >= 4 and v["impact"] <= 2:
        verdict = "dont"
    elif worth >= 60 and v["urgency"] >= 4:
        verdict = "do_now"
    elif worth >= 60:
        verdict = "schedule"
    elif v["urgency"] >= 4 and v["handoff"] >= 3:
        verdict = "hand_off"
    elif v["urgency"] >= 4:
        verdict = "minimum"
    elif worth < 40:
        verdict = "drop"
    else:
        verdict = "optional"

    ins = []
    if v["emotion"] <= 2 and worth >= 60:
        ins.append("You dread it, but it matters. Start with a 10-minute first step instead of the whole thing.")
    if v["emotion"] >= 4 and worth < 45:
        ins.append("You're excited, but the value is low. Check whether this is fun disguised as productive.")
    if v["motive"] <= 2:
        ins.append("You're doing this mainly because of pressure or to impress someone. Ask if you would choose it on your own.")
    if v["skip"] <= 1 and v["required"] <= 2:
        ins.append("Nothing happens if you skip it and nobody needs it. Skipping is a valid choice.")
    if v["skip"] >= 4:
        ins.append("Skipping has serious consequences. Even if you don't enjoy it, don't let it slide.")
    if v["learning"] >= 4 and v["longterm"] >= 4:
        ins.append("Strong learning and long-term payoff. This is an investment in your future self.")
    if v["learning"] <= 2 and v["longterm"] <= 2 and v["impact"] <= 3:
        ins.append("No learning and no lasting effect. This is the classic time-waster profile.")
    if v["health"] <= 2:
        ins.append("This drains your body or mind. If you must do it, plan rest afterwards.")
    if v["people"] <= 2:
        ins.append("It may strain a relationship. Think about who else is affected.")
    if v["harm"] >= 3:
        ins.append("There's real risk here. Write down the worst case and how you'd handle it.")
    if v["opp"] >= 4:
        ins.append("You'd give up something important for this. Compare the two directly.")
    if v["regret"] >= 4 and worth < 60:
        ins.append("The numbers are lukewarm, but you'd regret skipping it. Your gut may know something the numbers don't.")
    if v["time"] >= 4 and v["energy"] >= 4:
        ins.append("Big time and energy cost. Break it into smaller parts.")
    if not ins:
        ins.append("Nothing stands out. Trust the verdict above.")

    title, text = VERDICTS[verdict]
    return {
        "score": worth,
        "verdict": verdict,
        "verdict_title": title,
        "verdict_text": text,
        "dimensions": {k: _round(x) for k, x in dims.items()},
        "insights": ins,
    }
