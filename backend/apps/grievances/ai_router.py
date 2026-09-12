"""
AI-based grievance categorization and department routing using keyword scoring.
No external ML dependency required.
"""

CATEGORY_KEYWORDS = {
    'electricity': [
        'electricity', 'power', 'current', 'voltage', 'transformer', 'wire', 'electric',
        'outage', 'blackout', 'meter', 'bill', 'shock', 'sparking', 'tripping', 'fuse',
        'load shedding', 'power cut', 'no power', 'fluctuation', 'short circuit',
    ],
    'water': [
        'water', 'supply', 'pipe', 'leakage', 'leak', 'tap', 'drinking', 'contaminated',
        'dirty water', 'no water', 'water shortage', 'pipeline', 'borewell', 'tanker',
        'water pressure', 'muddy water', 'water quality', 'overflow', 'water board',
    ],
    'road': [
        'road', 'pothole', 'footpath', 'pavement', 'highway', 'bridge', 'divider',
        'speed breaker', 'traffic', 'signal', 'damaged road', 'broken road',
        'crater', 'pit', 'road repair', 'road construction', 'barricade',
    ],
    'garbage': [
        'garbage', 'waste', 'trash', 'litter', 'dump', 'dustbin', 'collection',
        'sanitation', 'sweeping', 'cleaning', 'filth', 'rubbish', 'solid waste',
        'overflowing bin', 'no collection', 'stench', 'smell', 'hygiene',
    ],
    'streetlight': [
        'streetlight', 'street light', 'lamp', 'lighting', 'dark', 'darkness',
        'light not working', 'broken light', 'no light', 'pole', 'bulb', 'led',
        'night visibility', 'street lamp', 'lamp post',
    ],
    'sewage': [
        'sewage', 'drain', 'drainage', 'sewer', 'manhole', 'overflow', 'blocked drain',
        'clogged', 'stagnant water', 'flooding', 'waterlogging', 'open drain',
        'foul smell', 'nala', 'gutter', 'sewage overflow',
    ],
    'park': [
        'park', 'garden', 'playground', 'tree', 'bench', 'grass', 'maintenance',
        'public space', 'open space', 'broken equipment', 'fallen tree', 'overgrown',
    ],
    'public_safety': [
        'public safety', 'safety', 'security', 'crime', 'incident', 'police',
        'harassment', 'theft', 'assault', 'street crime', 'danger', 'accident',
        'unsafe', 'emergency', 'violence', 'road accident', 'fight', 'riot',
    ],
    'noise': [
        'noise', 'sound', 'loud', 'music', 'speaker', 'horn', 'construction noise',
        'disturbance', 'nuisance', 'night noise', 'party', 'loudspeaker',
    ],
    'encroachment': [
        'encroachment', 'illegal', 'occupied', 'blocked', 'footpath blocked',
        'road blocked', 'hawker', 'vendor', 'unauthorized', 'building violation',
        'parking', 'obstruction', 'illegal construction',
    ],
}

DEPARTMENT_MAP = {
    'electricity': 'electricity',
    'water':       'water',
    'road':        'municipal',
    'garbage':     'municipal',
    'streetlight': 'electricity',
    'sewage':      'water',
    'park':        'municipal',
    'public_safety':'police',
    'noise':       'police',
    'encroachment':'municipal',
    'other':       'other',
}

PRIORITY_KEYWORDS = {
    'critical': [
        'accident', 'fire', 'sparking', 'shock', 'electrocution', 'flooding',
        'contaminated', 'sewage overflow', 'gas leak', 'emergency', 'danger',
        'hazard', 'injury', 'death', 'collapse', 'explosion',
    ],
    'high': [
        'no water', 'no power', 'power cut', 'blackout', 'outage', 'broken',
        'damaged', 'blocked', 'overflow', 'pothole', 'dark', 'unsafe', 'urgent',
    ],
    'medium': [
        'repair', 'maintenance', 'leakage', 'dirty', 'smell', 'noise',
        'garbage', 'waste', 'encroachment', 'complaint',
    ],
}


def classify_from_image_hint(filename: str, mime_type: str = '') -> dict:
    """
    Lightweight image-based classification using filename keywords.
    In production, replace with a real vision model (Google Vision, AWS Rekognition, etc.)
    """
    text = filename.lower().replace('_', ' ').replace('-', ' ')
    return classify_grievance(text, text)


def classify_grievance(title: str, description: str) -> dict:
    text = f"{title} {description}".lower()
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[cat] += 1

    best_cat = max(scores, key=scores.get)
    best_score = scores[best_cat]

    if best_score == 0:
        best_cat = 'other'
        confidence = 0.3
    else:
        total = sum(scores.values()) or 1
        confidence = min(0.95, round(best_score / total + 0.4, 2))

    department = DEPARTMENT_MAP.get(best_cat, 'other')

    priority = 'low'
    for level in ['critical', 'high', 'medium']:
        for kw in PRIORITY_KEYWORDS.get(level, []):
            if kw in text:
                priority = level
                break
        if priority != 'low':
            break

    matched = [kw for kw in CATEGORY_KEYWORDS.get(best_cat, []) if kw in text]

    return {
        'category': best_cat,
        'department': department,
        'priority': priority,
        'confidence': confidence,
        'keywords_matched': matched[:5],
    }
