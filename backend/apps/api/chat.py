"""
Rule-based multilingual chatbot for CivicRedress.
Handles: complaint filing help, tracking, FAQs, category detection, status explanations.
Supports: English (en), Kannada (kn), Hindi (hi).
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.grievances.ai_router import classify_grievance

# ── Multilingual response strings ────────────────────────────────────────────

STRINGS = {
    'en': {
        'greeting': "Hi! I'm CivicBot 🤖 — your assistant for civic complaints. I can help you:\n• File a new complaint\n• Track your complaint status\n• Understand how the system works\n• Answer questions about civic services\n\nWhat would you like help with?",
        'how_to_file': "To file a complaint:\n1. Go to **File Complaint** in the menu\n2. Upload a photo — AI will auto-detect the issue\n3. Add a title and location\n4. Submit — you'll get an Application ID instantly\n\nYour complaint is auto-routed to the right department! 🎯",
        'how_to_track': "To track your complaint:\n1. Click **Track** in the menu\n2. Enter your Application ID (e.g. GRV-GAR-12345678)\n3. See real-time status updates, officer comments, and timeline\n\nYou can also scan the QR code from your complaint card! 📱",
        'status_pending': "**Pending / Filed** ⏳ — Your complaint has been received and is waiting for an officer to review it.",
        'status_review': "**Under Review** 🔍 — An officer is currently reviewing your complaint.",
        'status_approved': "**Approved** ✅ — Your complaint has been approved and work will begin soon.",
        'status_progress': "**In Progress** ⚙️ — Work is actively happening to resolve your issue.",
        'status_resolved': "**Resolved** ✓ — Your issue has been resolved. Please rate your experience!",
        'status_rejected': "**Rejected** ❌ — Your complaint was rejected. Check the rejection reason in the complaint details.",
        'status_escalated': "**Escalated** 🔺 — Your complaint has been escalated for priority attention.",
        'departments': "Our system routes complaints to these departments:\n• ⚡ **Electricity** — power outages, meter issues, sparking\n• 💧 **Water** — supply, leaks, contamination\n• 🏗️ **Municipal** — roads, garbage, parks, encroachment\n• 👮 **Police** — noise, public safety\n• 🏥 **Health** — health hazards\n• 🚌 **Transport** — public transport issues",
        'ai_detect': "Our AI automatically detects the complaint category from your photo and description. It uses keyword analysis to route your complaint to the right department with a confidence score. The higher the score, the more accurate the routing! 🤖",
        'response_time': "Typical response times:\n• **Critical** issues (accidents, flooding): 24 hours\n• **High** priority (no water/power): 2–3 days\n• **Medium** priority (repairs, maintenance): 5–7 days\n• **Low** priority: 10–14 days",
        'contact': "For urgent emergencies, please contact:\n• Police: 100\n• Fire: 101\n• Ambulance: 108\n• BBMP Helpline: 1533\n• Water Board: 1916\n• Electricity: 1912",
        'ai_result': "Based on your description, this looks like a **{category}** issue (confidence: {confidence}%).\n\nIt will be routed to the **{department}** department with **{priority}** priority.\n\nWant to file this complaint? Go to **File Complaint** in the menu! 🚀",
        'not_understood': "I'm not sure I understood that. Here's what I can help with:\n• Type **file** to learn how to file a complaint\n• Type **track** to learn how to track\n• Type **status** to understand status meanings\n• Type **departments** to see all departments\n• Type **emergency** for emergency contacts\n• Or describe your issue and I'll classify it for you!",
        'language_set': "Language set to English 🇬🇧",
        'classify_prompt': "I detected this might be a **{category}** issue. Want me to explain more or help you file a complaint?",
    },
    'kn': {
        'greeting': "ನಮಸ್ಕಾರ! ನಾನು CivicBot 🤖 — ನಾಗರಿಕ ದೂರುಗಳಿಗೆ ನಿಮ್ಮ ಸಹಾಯಕ. ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• ಹೊಸ ದೂರು ಸಲ್ಲಿಸಲು\n• ದೂರಿನ ಸ್ಥಿತಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಲು\n• ವ್ಯವಸ್ಥೆ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ ಎಂದು ತಿಳಿಯಲು\n\nನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು?",
        'how_to_file': "ದೂರು ಸಲ್ಲಿಸಲು:\n1. ಮೆನುವಿನಲ್ಲಿ **ದೂರು ಸಲ್ಲಿಸಿ** ಕ್ಲಿಕ್ ಮಾಡಿ\n2. ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ — AI ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಮಸ್ಯೆ ಪತ್ತೆ ಮಾಡುತ್ತದೆ\n3. ಶೀರ್ಷಿಕೆ ಮತ್ತು ಸ್ಥಳ ಸೇರಿಸಿ\n4. ಸಲ್ಲಿಸಿ — ತಕ್ಷಣ ಅರ್ಜಿ ID ಸಿಗುತ್ತದೆ 🎯",
        'how_to_track': "ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು:\n1. ಮೆನುವಿನಲ್ಲಿ **ಟ್ರ್ಯಾಕ್** ಕ್ಲಿಕ್ ಮಾಡಿ\n2. ಅರ್ಜಿ ID ನಮೂದಿಸಿ (ಉದಾ: GRV-GAR-12345678)\n3. ನೈಜ-ಸಮಯ ಸ್ಥಿತಿ ನೋಡಿ 📱",
        'status_pending': "**ಸಲ್ಲಿಸಲಾಗಿದೆ** ⏳ — ನಿಮ್ಮ ದೂರು ಸ್ವೀಕರಿಸಲಾಗಿದೆ, ಅಧಿಕಾರಿ ಪರಿಶೀಲಿಸಲಿದ್ದಾರೆ.",
        'status_review': "**ಪರಿಶೀಲನೆಯಲ್ಲಿ** 🔍 — ಅಧಿಕಾರಿ ನಿಮ್ಮ ದೂರು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದಾರೆ.",
        'status_approved': "**ಅನುಮೋದಿಸಲಾಗಿದೆ** ✅ — ದೂರು ಅನುಮೋದಿಸಲಾಗಿದೆ, ಶೀಘ್ರದಲ್ಲೇ ಕೆಲಸ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.",
        'status_progress': "**ಪ್ರಗತಿಯಲ್ಲಿ** ⚙️ — ನಿಮ್ಮ ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲು ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ.",
        'status_resolved': "**ಪರಿಹರಿಸಲಾಗಿದೆ** ✓ — ನಿಮ್ಮ ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ರೇಟ್ ಮಾಡಿ!",
        'status_rejected': "**ತಿರಸ್ಕರಿಸಲಾಗಿದೆ** ❌ — ದೂರು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ. ಕಾರಣ ದೂರಿನ ವಿವರಗಳಲ್ಲಿ ನೋಡಿ.",
        'status_escalated': "**ಎಸ್ಕಲೇಟ್ ಮಾಡಲಾಗಿದೆ** 🔺 — ಆದ್ಯತೆಯ ಗಮನಕ್ಕಾಗಿ ಎಸ್ಕಲೇಟ್ ಮಾಡಲಾಗಿದೆ.",
        'departments': "ನಮ್ಮ ವ್ಯವಸ್ಥೆ ಈ ಇಲಾಖೆಗಳಿಗೆ ದೂರು ಕಳುಹಿಸುತ್ತದೆ:\n• ⚡ **ವಿದ್ಯುತ್** — ವಿದ್ಯುತ್ ಕಡಿತ, ಮೀಟರ್\n• 💧 **ನೀರು** — ಪೂರೈಕೆ, ಸೋರಿಕೆ\n• 🏗️ **ಪಾಲಿಕೆ** — ರಸ್ತೆ, ತ್ಯಾಜ್ಯ, ಉದ್ಯಾನ\n• 👮 **ಪೊಲೀಸ್** — ಶಬ್ದ, ಸಾರ್ವಜನಿಕ ಸುರಕ್ಷತೆ",
        'ai_detect': "ನಮ್ಮ AI ನಿಮ್ಮ ಫೋಟೋ ಮತ್ತು ವಿವರಣೆಯಿಂದ ದೂರಿನ ವರ್ಗವನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪತ್ತೆ ಮಾಡುತ್ತದೆ 🤖",
        'response_time': "ಸಾಮಾನ್ಯ ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ:\n• **ತುರ್ತು** ಸಮಸ್ಯೆಗಳು: 24 ಗಂಟೆ\n• **ಹೆಚ್ಚಿನ** ಆದ್ಯತೆ: 2–3 ದಿನ\n• **ಮಧ್ಯಮ** ಆದ್ಯತೆ: 5–7 ದಿನ\n• **ಕಡಿಮೆ** ಆದ್ಯತೆ: 10–14 ದಿನ",
        'contact': "ತುರ್ತು ಸಂಪರ್ಕ:\n• ಪೊಲೀಸ್: 100\n• ಅಗ್ನಿಶಾಮಕ: 101\n• ಆಂಬ್ಯುಲೆನ್ಸ್: 108\n• BBMP: 1533\n• ನೀರು ಮಂಡಳಿ: 1916\n• ವಿದ್ಯುತ್: 1912",
        'ai_result': "ನಿಮ್ಮ ವಿವರಣೆ ಆಧಾರದ ಮೇಲೆ, ಇದು **{category}** ಸಮಸ್ಯೆ ಎಂದು ತೋರುತ್ತದೆ ({confidence}% ವಿಶ್ವಾಸ).\n\n**{department}** ಇಲಾಖೆಗೆ **{priority}** ಆದ್ಯತೆಯೊಂದಿಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.\n\nದೂರು ಸಲ್ಲಿಸಲು ಮೆನುವಿನಲ್ಲಿ **ದೂರು ಸಲ್ಲಿಸಿ** ಕ್ಲಿಕ್ ಮಾಡಿ! 🚀",
        'not_understood': "ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• **ದೂರು** — ದೂರು ಸಲ್ಲಿಸುವ ವಿಧಾನ\n• **ಟ್ರ್ಯಾಕ್** — ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡುವ ವಿಧಾನ\n• **ಸ್ಥಿತಿ** — ಸ್ಥಿತಿ ಅರ್ಥ\n• **ತುರ್ತು** — ತುರ್ತು ಸಂಪರ್ಕ\n• ಅಥವಾ ನಿಮ್ಮ ಸಮಸ್ಯೆ ವಿವರಿಸಿ!",
        'language_set': "ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ 🇮🇳",
        'classify_prompt': "ಇದು **{category}** ಸಮಸ್ಯೆ ಎಂದು ತೋರುತ್ತದೆ. ದೂರು ಸಲ್ಲಿಸಲು ಸಹಾಯ ಬೇಕೇ?",
    },
    'hi': {
        'greeting': "नमस्ते! मैं CivicBot 🤖 हूँ — नागरिक शिकायतों के लिए आपका सहायक। मैं मदद कर सकता हूँ:\n• नई शिकायत दर्ज करने में\n• शिकायत की स्थिति ट्रैक करने में\n• सिस्टम को समझने में\n\nआपको किस चीज़ में मदद चाहिए?",
        'how_to_file': "शिकायत दर्ज करने के लिए:\n1. मेनू में **शिकायत दर्ज करें** पर क्लिक करें\n2. फ़ोटो अपलोड करें — AI स्वचालित रूप से समस्या पहचानेगा\n3. शीर्षक और स्थान जोड़ें\n4. सबमिट करें — तुरंत आवेदन ID मिलेगा 🎯",
        'how_to_track': "शिकायत ट्रैक करने के लिए:\n1. मेनू में **ट्रैक** पर क्लिक करें\n2. आवेदन ID दर्ज करें (जैसे: GRV-GAR-12345678)\n3. रियल-टाइम स्थिति देखें 📱",
        'status_pending': "**दर्ज / लंबित** ⏳ — आपकी शिकायत प्राप्त हो गई है, अधिकारी समीक्षा करेंगे।",
        'status_review': "**समीक्षाधीन** 🔍 — अधिकारी आपकी शिकायत की समीक्षा कर रहे हैं।",
        'status_approved': "**स्वीकृत** ✅ — शिकायत स्वीकृत हो गई है, जल्द ही काम शुरू होगा।",
        'status_progress': "**प्रगति में** ⚙️ — आपकी समस्या हल करने का काम चल रहा है।",
        'status_resolved': "**हल हुआ** ✓ — आपकी समस्या हल हो गई है। कृपया रेटिंग दें!",
        'status_rejected': "**अस्वीकृत** ❌ — शिकायत अस्वीकृत हुई। कारण शिकायत विवरण में देखें।",
        'status_escalated': "**एस्केलेट किया** 🔺 — प्राथमिकता के आधार पर एस्केलेट किया गया है।",
        'departments': "हमारा सिस्टम इन विभागों को शिकायत भेजता है:\n• ⚡ **बिजली** — बिजली कटौती, मीटर\n• 💧 **जल** — आपूर्ति, रिसाव\n• 🏗️ **नगर पालिका** — सड़क, कचरा, पार्क\n• 👮 **पुलिस** — शोर, सार्वजनिक सुरक्षा",
        'ai_detect': "हमारा AI आपकी फ़ोटो और विवरण से शिकायत की श्रेणी स्वचालित रूप से पहचानता है 🤖",
        'response_time': "सामान्य प्रतिक्रिया समय:\n• **गंभीर** समस्याएं: 24 घंटे\n• **उच्च** प्राथमिकता: 2–3 दिन\n• **मध्यम** प्राथमिकता: 5–7 दिन\n• **कम** प्राथमिकता: 10–14 दिन",
        'contact': "आपातकालीन संपर्क:\n• पुलिस: 100\n• अग्निशमन: 101\n• एम्बुलेंस: 108\n• BBMP: 1533\n• जल बोर्ड: 1916\n• बिजली: 1912",
        'ai_result': "आपके विवरण के आधार पर, यह **{category}** समस्या लगती है ({confidence}% विश्वास)।\n\n**{department}** विभाग को **{priority}** प्राथमिकता के साथ भेजा जाएगा।\n\nशिकायत दर्ज करने के लिए मेनू में **शिकायत दर्ज करें** पर क्लिक करें! 🚀",
        'not_understood': "मुझे समझ नहीं आया। मैं मदद कर सकता हूँ:\n• **शिकायत** — दर्ज करने का तरीका\n• **ट्रैक** — ट्रैक करने का तरीका\n• **स्थिति** — स्थिति का अर्थ\n• **आपातकाल** — आपातकालीन संपर्क\n• या अपनी समस्या बताएं!",
        'language_set': "भाषा हिंदी में बदल दी गई है 🇮🇳",
        'classify_prompt': "यह **{category}** समस्या लगती है। क्या आप शिकायत दर्ज करना चाहते हैं?",
    },
}

# ── Intent detection ──────────────────────────────────────────────────────────

INTENT_PATTERNS = {
    'greeting':    ['hi', 'hello', 'hey', 'namaste', 'namaskar', 'help', 'start', 'ನಮಸ್ಕಾರ', 'ಹಲೋ', 'नमस्ते', 'हेलो'],
    'file':        ['file', 'submit', 'complaint', 'report', 'new complaint', 'how to file', 'ದೂರು', 'ಸಲ್ಲಿಸಿ', 'शिकायत', 'दर्ज'],
    'track':       ['track', 'status', 'where', 'application id', 'grv', 'ಟ್ರ್ಯಾಕ್', 'ಸ್ಥಿತಿ', 'ट्रैक', 'स्थिति'],
    'status_pending':   ['pending', 'filed', 'submitted', 'waiting', 'ಸಲ್ಲಿಸಲಾಗಿದೆ', 'ಕಾಯುತ್ತಿದೆ', 'लंबित'],
    'status_review':    ['under review', 'reviewing', 'review', 'ಪರಿಶೀಲನೆ', 'समीक्षा'],
    'status_approved':  ['approved', 'accept', 'ಅನುಮೋದಿಸ', 'स्वीकृत'],
    'status_progress':  ['in progress', 'progress', 'working', 'ಪ್ರಗತಿ', 'प्रगति'],
    'status_resolved':  ['resolved', 'done', 'complete', 'fixed', 'ಪರಿಹರಿಸ', 'हल'],
    'status_rejected':  ['rejected', 'reject', 'denied', 'ತಿರಸ್ಕರಿಸ', 'अस्वीकृत'],
    'status_escalated': ['escalated', 'escalate', 'ಎಸ್ಕಲೇಟ್', 'एस्केलेट'],
    'departments':      ['department', 'which department', 'who handles', 'ಇಲಾಖೆ', 'विभाग'],
    'ai':               ['ai', 'artificial intelligence', 'auto detect', 'how does ai', 'ಕೃತಕ', 'कृत्रिम'],
    'response_time':    ['how long', 'time', 'days', 'when', 'deadline', 'ಎಷ್ಟು ದಿನ', 'कितने दिन'],
    'emergency':        ['emergency', 'urgent', 'contact', 'phone', 'number', 'helpline', 'ತುರ್ತು', 'आपातकाल'],
    'lang_en':          ['english', 'en', 'switch to english'],
    'lang_kn':          ['kannada', 'kn', 'ಕನ್ನಡ', 'switch to kannada'],
    'lang_hi':          ['hindi', 'hi', 'हिंदी', 'switch to hindi'],
}


def detect_intent(text: str) -> str:
    lower = text.lower().strip()
    for intent, patterns in INTENT_PATTERNS.items():
        for p in patterns:
            if p in lower:
                return intent
    return 'classify'


def get_response(message: str, lang: str = 'en') -> dict:
    lang = lang if lang in STRINGS else 'en'
    s = STRINGS[lang]
    intent = detect_intent(message)

    # Language switch intents
    if intent == 'lang_en':
        return {'reply': STRINGS['en']['language_set'], 'lang': 'en', 'intent': intent}
    if intent == 'lang_kn':
        return {'reply': STRINGS['kn']['language_set'], 'lang': 'kn', 'intent': intent}
    if intent == 'lang_hi':
        return {'reply': STRINGS['hi']['language_set'], 'lang': 'hi', 'intent': intent}

    # Direct intent matches
    intent_map = {
        'greeting':         s['greeting'],
        'file':             s['how_to_file'],
        'track':            s['how_to_track'],
        'status_pending':   s['status_pending'],
        'status_review':    s['status_review'],
        'status_approved':  s['status_approved'],
        'status_progress':  s['status_progress'],
        'status_resolved':  s['status_resolved'],
        'status_rejected':  s['status_rejected'],
        'status_escalated': s['status_escalated'],
        'departments':      s['departments'],
        'ai':               s['ai_detect'],
        'response_time':    s['response_time'],
        'emergency':        s['contact'],
    }

    if intent in intent_map:
        return {'reply': intent_map[intent], 'lang': lang, 'intent': intent}

    # Fallback: try to classify the message as a grievance
    result = classify_grievance(message, message)
    if result['category'] != 'other' and result['confidence'] > 0.4:
        reply = s['ai_result'].format(
            category=result['category'].replace('_', ' ').title(),
            confidence=round(result['confidence'] * 100),
            department=result['department'].replace('_', ' ').title(),
            priority=result['priority'].title(),
        )
        return {'reply': reply, 'lang': lang, 'intent': 'classify', 'ai_result': result}

    return {'reply': s['not_understood'], 'lang': lang, 'intent': 'unknown'}


# ── API view ──────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def chat_view(request):
    message = (request.data.get('message') or '').strip()
    lang = request.data.get('lang', 'en')
    if not message:
        return Response({'error': 'message required'}, status=400)
    result = get_response(message, lang)
    return Response(result)
