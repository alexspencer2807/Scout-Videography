"""World Cup 2026 Fan Zone — multi-user leaderboard backed by Firestore.

All fan data (registrations, predictions, trivia best scores) lives in
Firestore so every visitor sees the same shared leaderboard. When Firestore is
unavailable (local dev, tests, or a transient outage) the same API keeps
working against an in-memory store via get_db() returning None — see
extensions.get_db().

Prediction picks use the same vocabulary as the front-end (static/js/worldcup.js):
    "A" = home/team-A win, "D" = draw, "B" = away/team-B win.
The admin scoring endpoint speaks the same codes so picks actually match.
"""
import os
import json

from flask import Blueprint, request, jsonify, render_template, current_app

from extensions import get_db
from blueprints.worldcup_data import match_by_id

worldcup_bp = Blueprint("worldcup", __name__)

USERS = "worldcup_users"
PREDICTIONS = "worldcup_predictions"
COACH_PREDS = "worldcup_coach_predictions"

# ---------------------------------------------------------------------------
# In-memory fallback store (used whenever Firestore is unavailable).
# Lives for the lifetime of the process — fine for dev/tests.
# ---------------------------------------------------------------------------
_mem_users = {}        # email -> dict
_mem_preds = {}        # f"{email}_{match_id}" -> dict
_mem_coach = {}        # match_id -> Coach Scout prediction dict

# Backend selection. Having a Firestore *client* doesn't guarantee the database
# exists or is reachable (e.g. local dev with gcloud creds but no DB, or a
# permissions gap), so we probe once with a cheap read and cache the decision.
# In production (Cloud Run + a created Firestore DB) the probe succeeds and all
# data is shared; otherwise we transparently use the in-memory store.
_backend = None        # None = undecided, "fs" = Firestore, "mem" = in-memory
_fs_client = None


def _fs():
    """Return a usable Firestore client, or None to use the in-memory store."""
    global _backend, _fs_client
    if _backend == "fs":
        return _fs_client
    if _backend == "mem":
        return None
    db = get_db()
    if db is None:
        _backend = "mem"
        return None
    try:
        next(db.collection(USERS).limit(1).stream(), None)  # cheap probe
        _fs_client, _backend = db, "fs"
        return db
    except Exception as e:
        print(f"[worldcup] Firestore unreachable — using in-memory store: {e}")
        _backend = "mem"
        return None


def _blank_user(name, email, instagram, backing):
    return {
        "name": name,
        "email": email,
        "instagram": instagram,
        "backing": backing,
        "prediction_points": 0,
        "trivia_best": 0,
        "bracket_points": 0,
        "total_points": 0,
    }


# ---------------------------------------------------------------------------
# Store operations — each branches on whether a Firestore client is available.
# ---------------------------------------------------------------------------
def store_register(name, email, instagram, backing):
    """Create the user on first registration; otherwise refresh profile fields
    only (never reset accumulated points)."""
    db = _fs()
    if db is not None:
        from google.cloud import firestore
        ref = db.collection(USERS).document(email)
        snap = ref.get()
        if snap.exists:
            ref.update({"name": name, "instagram": instagram, "backing": backing})
        else:
            doc = _blank_user(name, email, instagram, backing)
            doc["registered_at"] = firestore.SERVER_TIMESTAMP
            ref.set(doc)
        return
    # memory
    existing = _mem_users.get(email)
    if existing:
        existing.update({"name": name, "instagram": instagram, "backing": backing})
    else:
        _mem_users[email] = _blank_user(name, email, instagram, backing)


def store_save_prediction(email, match_id, pick, score_a, score_b):
    doc = {
        "email": email,
        "match_id": match_id,
        "pick": pick,
        "score_a": score_a,
        "score_b": score_b,
        "scored": False,
        "points": 0,
    }
    db = _fs()
    if db is not None:
        from google.cloud import firestore
        doc["timestamp"] = firestore.SERVER_TIMESTAMP
        db.collection(PREDICTIONS).document(f"{email}_{match_id}").set(doc)
        return
    _mem_preds[f"{email}_{match_id}"] = doc


def store_save_trivia(email, score):
    """Keep the user's best trivia score; bump total_points by the improvement."""
    db = _fs()
    if db is not None:
        from google.cloud import firestore
        ref = db.collection(USERS).document(email)
        snap = ref.get()
        if not snap.exists:
            return False
        best = snap.to_dict().get("trivia_best", 0) or 0
        if score > best:
            ref.update({
                "trivia_best": score,
                "total_points": firestore.Increment(score - best),
            })
        return True
    user = _mem_users.get(email)
    if not user:
        return False
    best = user.get("trivia_best", 0) or 0
    if score > best:
        user["total_points"] = user.get("total_points", 0) + (score - best)
        user["trivia_best"] = score
    return True


def store_leaderboard(limit=20):
    db = _fs()
    if db is not None:
        from google.cloud import firestore
        q = (db.collection(USERS)
             .order_by("total_points", direction=firestore.Query.DESCENDING)
             .limit(limit))
        users = [d.to_dict() for d in q.stream()]
    else:
        users = sorted(_mem_users.values(),
                       key=lambda u: u.get("total_points", 0), reverse=True)[:limit]

    board = []
    for u in users:
        board.append({
            "name": u.get("name", "Anonymous"),
            "instagram": u.get("instagram", ""),
            "backing": u.get("backing", ""),
            "prediction_points": u.get("prediction_points", 0),
            "trivia_best": u.get("trivia_best", 0),
            "bracket_points": u.get("bracket_points", 0),
            "total_points": u.get("total_points", 0),
        })
    board.sort(key=lambda x: x["total_points"], reverse=True)
    for i, entry in enumerate(board):
        entry["rank"] = i + 1
    return board


def store_get_user(email):
    db = _fs()
    if db is not None:
        ref = db.collection(USERS).document(email)
        snap = ref.get()
        if not snap.exists:
            return None
        data = snap.to_dict()
        preds = [p.to_dict() for p in
                 db.collection(PREDICTIONS).where("email", "==", email).stream()]
        return data, preds
    user = _mem_users.get(email)
    if not user:
        return None
    preds = [p for p in _mem_preds.values() if p.get("email") == email]
    return user, preds


def store_score_match(match_id, winner, actual_a, actual_b):
    """Score every unscored prediction for a match and update user totals.
    +3 correct winner, +5 bonus for an exact scoreline."""

    def points_for(pred):
        pts = 0
        if pred.get("pick") == winner:
            pts += 3
        if pred.get("score_a") == actual_a and pred.get("score_b") == actual_b:
            pts += 5
        return pts

    db = _fs()
    scored = 0
    if db is not None:
        from google.cloud import firestore
        preds = (db.collection(PREDICTIONS)
                 .where("match_id", "==", match_id)
                 .where("scored", "==", False).stream())
        batch = db.batch()
        for pdoc in preds:
            pred = pdoc.to_dict()
            pts = points_for(pred)
            batch.update(pdoc.reference, {
                "scored": True, "points": pts,
                "actual_winner": winner,
                "actual_score_a": actual_a, "actual_score_b": actual_b,
            })
            # set(merge=True) rather than update(): the user may have made
            # predictions before their Firestore profile existed, so the doc
            # might not be there yet. update() would raise NotFound; merge
            # creates it if missing and increments otherwise.
            batch.set(db.collection(USERS).document(pred.get("email")), {
                "prediction_points": firestore.Increment(pts),
                "total_points": firestore.Increment(pts),
            }, merge=True)
            scored += 1
        batch.commit()
        return scored
    # memory
    for pred in _mem_preds.values():
        if pred.get("match_id") != match_id or pred.get("scored"):
            continue
        pts = points_for(pred)
        pred.update({"scored": True, "points": pts, "actual_winner": winner,
                     "actual_score_a": actual_a, "actual_score_b": actual_b})
        email = pred.get("email")
        user = _mem_users.get(email)
        if not user:                       # orphan prediction — create the profile
            user = _mem_users[email] = {"email": email, "prediction_points": 0, "total_points": 0}
        user["prediction_points"] = user.get("prediction_points", 0) + pts
        user["total_points"] = user.get("total_points", 0) + pts
        scored += 1
    return scored


# ---------------------------------------------------------------------------
# Coach Scout predictions (AI-generated, shared) — store + Gemini generation
# ---------------------------------------------------------------------------
def store_save_coach_prediction(match_id, doc):
    db = _fs()
    if db is not None:
        from google.cloud import firestore
        d = dict(doc)
        d["updated_at"] = firestore.SERVER_TIMESTAMP
        db.collection(COACH_PREDS).document(match_id).set(d)
        return
    _mem_coach[match_id] = doc


def store_coach_predictions():
    db = _fs()
    if db is not None:
        docs = [d.to_dict() for d in db.collection(COACH_PREDS).stream()]
    else:
        docs = list(_mem_coach.values())
    docs.sort(key=lambda d: d.get("no", 0))
    # Drop the server timestamp — it isn't JSON-serialisable and the UI ignores it.
    return [{k: v for k, v in d.items() if k != "updated_at"} for d in docs]


def store_get_coach_prediction(match_id):
    """Return one cached Coach Scout prediction (JSON-safe), or None."""
    db = _fs()
    if db is not None:
        snap = db.collection(COACH_PREDS).document(match_id).get()
        if not snap.exists:
            return None
        d = snap.to_dict()
    else:
        d = _mem_coach.get(match_id)
    if not d:
        return None
    return {k: v for k, v in d.items() if k != "updated_at"}


# --- Generic admin CRUD over a collection (read / update / delete) ----------
def _json_safe(d):
    """Coerce a Firestore/memory doc to JSON-serialisable values (timestamps -> ISO)."""
    out = {}
    for k, v in (d or {}).items():
        out[k] = v.isoformat() if hasattr(v, "isoformat") else v
    return out


def store_list(collection, mem):
    db = _fs()
    rows = []
    if db is not None:
        for doc in db.collection(collection).stream():
            r = _json_safe(doc.to_dict())
            r["_id"] = doc.id
            rows.append(r)
    else:
        for k, v in mem.items():
            r = _json_safe(v)
            r["_id"] = k
            rows.append(r)
    return rows


def store_update(collection, mem, doc_id, fields):
    db = _fs()
    if db is not None:
        try:
            db.collection(collection).document(doc_id).update(fields)
            return True
        except Exception:
            return False  # e.g. document doesn't exist
    if doc_id in mem:
        mem[doc_id].update(fields)
        return True
    return False


def store_delete(collection, mem, doc_id):
    db = _fs()
    if db is not None:
        db.collection(collection).document(doc_id).delete()
        return True
    return mem.pop(doc_id, None) is not None


_PLAYERS_CACHE = None


def _players():
    """Load the team/player dataset once from the static JSON file."""
    global _PLAYERS_CACHE
    if _PLAYERS_CACHE is None:
        path = os.path.join(current_app.static_folder, "data", "worldcup-players.json")
        with open(path, encoding="utf-8") as f:
            _PLAYERS_CACHE = (json.load(f) or {}).get("teams", {})
    return _PLAYERS_CACHE


COACH_SYSTEM_PROMPT = (
    "You are Coach Scout, the AI football analyst for Scout Videography Jamaica. "
    "You give punchy, knowledgeable pre-match predictions for the FIFA World Cup 2026. "
    "Tone: confident, warm and expert — like a top TV pundit. Keep the analysis to "
    "2-3 crisp sentences. Be decisive about the scoreline."
)


def _team_brief(code, team):
    players = team.get("players", []) or []
    watch = next((p for p in players if p.get("player_to_watch")), players[0] if players else {})
    stars = ", ".join(
        f"{p.get('name')} ({p.get('position')}, {p.get('club')})" for p in players[:4]
    )
    return (
        f"{team.get('name')} [{code}] — FIFA #{team.get('fifa_ranking', '?')}, "
        f"coach {team.get('coach', '?')}. Key players: {stars or 'n/a'}. "
        f"Star man: {watch.get('name', 'n/a')}."
    )


def _prediction_prompt(m, team_a, team_b):
    home, away = m["home"], m["away"]
    return (
        "Predict this FIFA World Cup 2026 group-stage match.\n"
        f"HOME: {_team_brief(home, team_a)}\n"
        f"AWAY: {_team_brief(away, team_b)}\n"
        f"Fixture: {team_a.get('name')} vs {team_b.get('name')} "
        f"(Group {m['group']}, Matchday {m['md']}).\n\n"
        "Respond with ONLY a JSON object (no markdown fences) with exactly these keys:\n"
        '{"scoreline": "<Home Name> X-Y <Away Name>", '
        '"confidence": <integer 0-100>, '
        '"keyBattle": "<Player A> vs <Player B>", '
        f'"watchCode": "{home} or {away}", '
        '"text": "<2-3 sentence Coach Scout analysis>"}'
    )


def _generate_one(raw_prompt):
    """Call Gemini and return the model's raw text (JSON expected)."""
    from google import genai
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    resp = client.models.generate_content(
        # Overridable via env so a retired model is a config change, not a redeploy.
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=[{"role": "user", "parts": [{"text": raw_prompt}]}],
        config={
            "temperature": 0.7,
            # Gemini 2.5 spends output tokens on internal "thinking"; disable it
            # and give enough room so the JSON is never truncated mid-string.
            "max_output_tokens": 2048,
            "thinking_config": {"thinking_budget": 0},
            "system_instruction": COACH_SYSTEM_PROMPT,
            "response_mime_type": "application/json",
        },
    )
    return resp.text


def _parse_prediction(raw):
    s = (raw or "").strip()
    if s.startswith("```"):
        s = s.strip("`").strip()
        if s[:4].lower() == "json":
            s = s[4:].strip()
    return json.loads(s)


def _forecast_doc(m, teams):
    """Build a Coach Scout forecast doc for fixture `m` via Gemini.
    Raises on missing team data or a generation/parse failure."""
    team_a, team_b = teams.get(m["home"]), teams.get(m["away"])
    if not team_a or not team_b:
        raise ValueError(f"missing team data for {m['home']} or {m['away']}")
    parsed = _parse_prediction(_generate_one(_prediction_prompt(m, team_a, team_b)))
    watch = parsed.get("watchCode")
    if watch not in (m["home"], m["away"]):
        watch = m["home"]
    try:
        conf = max(0, min(100, int(parsed.get("confidence", 0))))
    except (TypeError, ValueError):
        conf = 0
    return {
        "no": m["no"], "match_id": f"M{m['no']}", "date": m["date_label"],
        "text": str(parsed.get("text", "")).strip(),
        "scoreline": str(parsed.get("scoreline", "")).strip(),
        "confidence": conf,
        "keyBattle": str(parsed.get("keyBattle", "")).strip(),
        "watchCode": watch,
        "home": m["home"], "away": m["away"], "group": m["group"], "md": m["md"],
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@worldcup_bp.route("/worldcup")
def worldcup():
    return render_template("worldcup.html")


@worldcup_bp.route("/api/worldcup/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    instagram = (data.get("instagram") or "").strip()
    backing = (data.get("backing") or "").strip()

    if not name or not email:
        return jsonify({"error": "Name and email required"}), 400

    store_register(name, email, instagram, backing)

    # Best-effort host notification — never block the response on email.
    try:
        from blueprints.notify import send_email
        host_email = os.getenv("EMAIL_TO") or "spencerdm@scoutvideoja.com"
        send_email(
            subject=f"New World Cup Fan Zone registration — {name or 'Unknown'}",
            body_html=(
                "<pre style='font-family:monospace;font-size:13px'>"
                f"Name     : {name}\n"
                f"Email    : {email}\n"
                f"Instagram: {instagram}\n"
                f"Backing  : {backing}</pre>"
            ),
            to_addr=host_email,
        )
    except Exception as e:
        print(f"[worldcup] notification email skipped: {e}")

    return jsonify({"status": "ok", "user_id": email})


@worldcup_bp.route("/api/worldcup/prediction", methods=["POST"])
def save_prediction():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    match_id = (data.get("match_id") or "").strip()
    pick = (data.get("pick") or "").strip()

    if not email or not match_id or not pick:
        return jsonify({"error": "Missing fields"}), 400

    def _int_or_none(v):
        try:
            return int(v) if v is not None and v != "" else None
        except (TypeError, ValueError):
            return None

    store_save_prediction(email, match_id, pick,
                          _int_or_none(data.get("score_a")),
                          _int_or_none(data.get("score_b")))
    return jsonify({"status": "ok"})


@worldcup_bp.route("/api/worldcup/trivia", methods=["POST"])
def save_trivia_score():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    try:
        score = int(data.get("score", 0) or 0)
    except (TypeError, ValueError):
        score = 0

    if not email:
        return jsonify({"error": "Email required"}), 400

    store_save_trivia(email, score)
    return jsonify({"status": "ok"})


@worldcup_bp.route("/api/worldcup/leaderboard")
def get_leaderboard():
    return jsonify({"leaderboard": store_leaderboard(20)})


@worldcup_bp.route("/api/worldcup/user/<email>")
def get_user_stats(email):
    result = store_get_user(email)
    if not result:
        return jsonify({"error": "User not found"}), 404
    data, predictions = result
    return jsonify({
        "user": {
            "name": data.get("name"),
            "instagram": data.get("instagram"),
            "backing": data.get("backing", ""),
            "prediction_points": data.get("prediction_points", 0),
            "trivia_best": data.get("trivia_best", 0),
            "bracket_points": data.get("bracket_points", 0),
            "total_points": data.get("total_points", 0),
        },
        "predictions": predictions,
    })


# --- Admin auth -------------------------------------------------------------
# Both admin actions below mutate shared data (and generate-predictions spends
# money on Gemini calls), so they require a shared secret. Fails closed: if
# WC_ADMIN_KEY isn't configured on the server, the endpoints stay locked.
def _admin_ok():
    key = os.getenv("WC_ADMIN_KEY")
    if not key:
        return False
    supplied = request.headers.get("X-Admin-Key")
    if not supplied:
        supplied = (request.get_json(silent=True) or {}).get("admin_key")
    return supplied == key


def _admin_error():
    if not os.getenv("WC_ADMIN_KEY"):
        return jsonify({"error": "Admin actions are disabled — WC_ADMIN_KEY is not set on the server"}), 503
    return jsonify({"error": "Unauthorized — a valid admin key is required"}), 401


# --- Admin: score a completed match -----------------------------------------
@worldcup_bp.route("/admin/score-matches")
def score_matches_admin():
    return render_template("admin/score-matches.html")


@worldcup_bp.route("/api/worldcup/admin/score-match", methods=["POST"])
def score_match():
    if not _admin_ok():
        return _admin_error()
    data = request.get_json(silent=True) or {}
    match_id = (data.get("match_id") or "").strip()
    winner = (data.get("winner") or "").strip()  # "A", "D", or "B"

    if not match_id or winner not in ("A", "D", "B"):
        return jsonify({"error": "match_id and winner (A/D/B) required"}), 400

    def _int(v):
        try:
            return int(v or 0)
        except (TypeError, ValueError):
            return 0

    scored = store_score_match(match_id, winner, _int(data.get("score_a")), _int(data.get("score_b")))
    return jsonify({"status": "ok", "match_id": match_id, "scored": scored})


# --- Coach Scout AI predictions ---------------------------------------------
@worldcup_bp.route("/api/worldcup/coach-predictions")
def coach_predictions():
    """Shared, AI-generated Coach Scout pre-match predictions for the Fan Zone."""
    return jsonify({"predictions": store_coach_predictions()})


@worldcup_bp.route("/api/worldcup/generate-predictions", methods=["POST"])
def generate_predictions():
    """Generate Coach Scout predictions for the given match ids via Gemini and
    save them to Firestore so they appear on the Fan Zone automatically.

    Body: {"match_ids": ["M1", "M7", ...]}
    """
    if not _admin_ok():
        return _admin_error()
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({"error": "GEMINI_API_KEY is not configured on the server"}), 503

    data = request.get_json(silent=True) or {}
    ids = data.get("match_ids")
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "match_ids (a non-empty list) is required"}), 400

    teams = _players()
    generated, matches, errors = 0, [], []

    for raw_id in ids:
        m = match_by_id(raw_id)
        if not m:
            errors.append(f"{raw_id}: unknown match id")
            continue
        mid = f"M{m['no']}"  # canonical id
        try:
            doc = _forecast_doc(m, teams)
        except Exception as e:
            errors.append(f"{mid}: generation failed ({e})")
            continue
        store_save_coach_prediction(mid, doc)
        generated += 1
        matches.append(mid)

    return jsonify({"status": "ok", "generated": generated, "matches": matches, "errors": errors})


@worldcup_bp.route("/api/worldcup/coach-forecast/<match_id>")
def coach_forecast(match_id):
    """Public, cache-first single-match forecast for the Ask Coach Scout tool.

    Returns the stored forecast if one exists; otherwise generates it once via
    Gemini, caches it in Firestore, and returns it. Bounded to the 72 known
    fixtures, so total Gemini calls are capped and every repeat is a cache hit.
    """
    m = match_by_id(match_id)
    if not m:
        return jsonify({"error": "Unknown match id"}), 404
    mid = f"M{m['no']}"

    cached = store_get_coach_prediction(mid)
    if cached:
        return jsonify({"prediction": cached, "cached": True})

    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({"error": "Coach Scout is not configured yet"}), 503

    try:
        doc = _forecast_doc(m, _players())
    except Exception as e:
        return jsonify({"error": f"Generation failed: {e}"}), 502

    store_save_coach_prediction(mid, doc)
    return jsonify({"prediction": doc, "cached": False})


# --- Admin database CRUD (view / edit / delete) -----------------------------
# Editable + numeric fields are allow-listed per entity so edits can't write
# arbitrary keys. Doc ids: users=email, coach=M<no>, predictions=<email>_<id>.
DB_ENTITIES = {
    "users": {
        "col": USERS, "mem": _mem_users,
        "fields": {"name", "instagram", "backing", "trivia_best",
                   "prediction_points", "bracket_points", "total_points"},
        "nums": {"trivia_best", "prediction_points", "bracket_points", "total_points"},
    },
    "coach": {
        "col": COACH_PREDS, "mem": _mem_coach,
        "fields": {"text", "scoreline", "confidence", "keyBattle", "watchCode", "date"},
        "nums": {"confidence"},
    },
    "predictions": {
        "col": PREDICTIONS, "mem": _mem_preds,
        "fields": {"pick", "score_a", "score_b", "points", "scored"},
        "nums": {"score_a", "score_b", "points"},
    },
}


@worldcup_bp.route("/api/worldcup/admin/db/<entity>")
def admin_db_list(entity):
    if not _admin_ok():
        return _admin_error()
    e = DB_ENTITIES.get(entity)
    if not e:
        return jsonify({"error": "unknown entity"}), 404
    return jsonify({"rows": store_list(e["col"], e["mem"])})


@worldcup_bp.route("/api/worldcup/admin/db/<entity>/update", methods=["POST"])
def admin_db_update(entity):
    if not _admin_ok():
        return _admin_error()
    e = DB_ENTITIES.get(entity)
    if not e:
        return jsonify({"error": "unknown entity"}), 404
    data = request.get_json(silent=True) or {}
    doc_id = str(data.get("id") or "").strip()
    fields_in = data.get("fields")
    if not doc_id or not isinstance(fields_in, dict):
        return jsonify({"error": "id and fields are required"}), 400

    clean = {}
    for k, v in fields_in.items():
        if k not in e["fields"]:
            continue
        if k in e["nums"]:
            try:
                v = int(v)
            except (TypeError, ValueError):
                continue
        clean[k] = v
    if not clean:
        return jsonify({"error": "no editable fields supplied"}), 400
    if not store_update(e["col"], e["mem"], doc_id, clean):
        return jsonify({"error": "record not found"}), 404
    return jsonify({"status": "ok", "id": doc_id, "updated": clean})


@worldcup_bp.route("/api/worldcup/admin/db/<entity>/delete", methods=["POST"])
def admin_db_delete(entity):
    if not _admin_ok():
        return _admin_error()
    e = DB_ENTITIES.get(entity)
    if not e:
        return jsonify({"error": "unknown entity"}), 404
    data = request.get_json(silent=True) or {}
    doc_id = str(data.get("id") or "").strip()
    if not doc_id:
        return jsonify({"error": "id is required"}), 400
    if not store_delete(e["col"], e["mem"], doc_id):
        return jsonify({"error": "record not found"}), 404
    return jsonify({"status": "ok", "deleted": doc_id})
