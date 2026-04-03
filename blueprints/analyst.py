import os
import json
from flask import Blueprint, render_template, request, Response

analyst_bp = Blueprint("analyst", __name__)


SYSTEM_PROMPT = """You are the Scout AI Analyst — a football performance analysis assistant for Scout Videography Jamaica, based in Kingston & St. Andrew.

YOUR ROLE:
You help young footballers (ages 12-22), their parents, and coaches understand performance data and improve their game through targeted recommendations.

YOUR TONE:
- Cheerful, encouraging, approachable — like a supportive coach, not a professor
- Use simple language. Explain technical terms immediately
- Be specific and actionable
- Reference Rezzil drills by name: Fast Pass Decision, Colour React, First Touch Challenge, Finishing Drill, Pitch Scan
- Celebrate strengths before discussing areas to improve
- Always end with a clear next step
- Keep responses concise — 3-4 short paragraphs max

WHAT YOU KNOW:
- Scout uses Veo cameras for AI-powered match recording (full pitch, 180 degree coverage, HD)
- VR training uses HTC Vive Pro headset with Rezzil Player software
- Rezzil is used by Manchester City, Leicester City, and other professional clubs
- Three drill categories: Cognitive (decision speed, reaction time, peripheral awareness), Technical (first touch, passing, finishing), Tactical (positioning, game reading, spatial awareness)
- The development loop: Record (Veo) -> Analyse (AI) -> Train (Rezzil) -> Repeat
- Service area: Kingston, St. Andrew, and surrounding parishes in Jamaica
- Prices: Single match $10,000 JMD, 3-match $25,000, 5-match $40,000, 30-min game $5,000
- Add-ons: Highlight reel $20,000, Live streaming $2,000, AI Analytics report $10,000
- Average reaction time benchmark for U-18 midfielders: 340ms
- Instagram: @scoutvideoja, WhatsApp: 8768092519

WHAT YOU CANNOT DO:
- Diagnose injuries or give medical advice
- Make promises about scholarships or professional contracts
- Discuss competitors
- Discuss anything outside football performance analysis"""


@analyst_bp.route("/analyse")
def analyse():
    """Render the AI Analyst page."""
    return render_template("analyse.html")


@analyst_bp.route("/analyse/api/chat", methods=["POST"])
def chat():
    """
    Streaming chat endpoint using Gemini API with Server-Sent Events.

    Expects JSON:
    {
        "message": "user message text",
        "conversation": [{"role": "user", "content": "..."}, {"role": "model", "content": "..."}]
    }

    Returns SSE stream with chunks formatted as:
    data: {"text": "chunk text"}\n\n

    Ends with:
    data: [DONE]\n\n
    """
    def generate():
        try:
            # Parse request
            data = request.get_json()
            user_message = data.get("message", "")
            conversation_history = data.get("conversation", [])

            # Check for API key
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                yield 'data: {"error": "The AI Analyst is not configured yet. Please contact us on Instagram @scoutvideoja or WhatsApp 8768092519 to get started."}\n\n'
                yield 'data: [DONE]\n\n'
                return

            # Import Gemini SDK
            from google import genai

            # Create client
            client = genai.Client(api_key=api_key)

            # Build conversation history (last 10 messages)
            history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history

            # Build content list for the API call
            # Format: [{"role": "user", "parts": [{"text": "..."}]}, {"role": "model", "parts": [{"text": "..."}]}]
            contents = []
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                contents.append({
                    "role": role,
                    "parts": [{"text": content}]
                })

            # Add current user message
            contents.append({
                "role": "user",
                "parts": [{"text": user_message}]
            })

            # Configure generation
            config = {
                "temperature": 0.7,
                "max_output_tokens": 1024,
                "system_instruction": SYSTEM_PROMPT
            }

            # Stream response
            response_stream = client.models.generate_content_stream(
                model="gemini-2.0-flash-exp",
                contents=contents,
                config=config
            )

            # Stream chunks back as SSE
            for chunk in response_stream:
                if hasattr(chunk, 'text') and chunk.text:
                    chunk_data = json.dumps({"text": chunk.text})
                    yield f'data: {chunk_data}\n\n'

            # Signal completion
            yield 'data: [DONE]\n\n'

        except Exception as e:
            # Send error as SSE
            error_data = json.dumps({"error": f"Sorry, something went wrong: {str(e)}"})
            yield f'data: {error_data}\n\n'
            yield 'data: [DONE]\n\n'

    return Response(generate(), mimetype="text/event-stream")
