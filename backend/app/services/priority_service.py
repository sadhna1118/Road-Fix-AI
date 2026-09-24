from typing import Tuple
from app.config import PRIORITY_DAMAGE_WEIGHTS

def calculate_priority_score(
    damage_type: str,
    confidence: float = 0.85,
    report_count: int = 1,
    days_old: float = 0.0
) -> Tuple[int, str]:
    """
    Calculate empirical Civic Priority Score (0 - 100) and Level.
    Returns (score, level).
    """
    # 1. Damage base weight (0 - 45)
    base_weight = PRIORITY_DAMAGE_WEIGHTS.get(damage_type, 20)

    # 2. AI Confidence weight (0 - 25)
    conf_weight = min(25.0, max(0.0, confidence * 25.0))

    # 3. Crowdsource Multiplier (0 - 25)
    # Each additional report adds 6 points up to 25 pts max
    crowd_weight = min(25.0, max(0.0, (report_count - 1) * 6.0))

    # 4. Aging weight (0 - 10)
    # 2 points per day unattended up to 10 max
    aging_weight = min(10.0, max(0.0, days_old * 2.0))

    total_score = int(round(base_weight + conf_weight + crowd_weight + aging_weight))
    total_score = min(100, max(10, total_score))

    # Priority category
    if total_score >= 85:
        level = "CRITICAL"
    elif total_score >= 70:
        level = "HIGH"
    elif total_score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return total_score, level
