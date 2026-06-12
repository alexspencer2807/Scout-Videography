"""Server-side mirror of the FIFA World Cup 2026 group-stage fixture map.

The front-end keeps the full schedule in static/js/worldcup.js. The backend only
needs enough to turn a match id (e.g. "M1") into its two team codes so it can
build a Coach Scout prediction prompt. Keyed by FIFA match number, which is what
the front-end's MATCH_ANALYSIS entries (`no`) line up against.

Rows: [home_code, away_code, matchday, match_no, date_iso]
"""

from datetime import datetime, timezone, timedelta

_MONTHS = ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"]

_SCHED = {
    "A": [["MEX", "RSA", 1, 1, "2026-06-11"], ["KOR", "CZE", 1, 2, "2026-06-11"],
          ["CZE", "RSA", 2, 25, "2026-06-18"], ["MEX", "KOR", 2, 28, "2026-06-18"],
          ["CZE", "MEX", 3, 53, "2026-06-24"], ["RSA", "KOR", 3, 54, "2026-06-24"]],
    "B": [["CAN", "BIH", 1, 3, "2026-06-12"], ["QAT", "SUI", 1, 8, "2026-06-13"],
          ["SUI", "BIH", 2, 26, "2026-06-18"], ["CAN", "QAT", 2, 27, "2026-06-18"],
          ["SUI", "CAN", 3, 51, "2026-06-24"], ["BIH", "QAT", 3, 52, "2026-06-24"]],
    "C": [["HAI", "SCO", 1, 5, "2026-06-13"], ["BRA", "MAR", 1, 7, "2026-06-13"],
          ["BRA", "HAI", 2, 29, "2026-06-19"], ["SCO", "MAR", 2, 30, "2026-06-19"],
          ["SCO", "BRA", 3, 49, "2026-06-24"], ["MAR", "HAI", 3, 50, "2026-06-24"]],
    "D": [["USA", "PAR", 1, 4, "2026-06-12"], ["AUS", "TUR", 1, 6, "2026-06-14"],
          ["USA", "AUS", 2, 32, "2026-06-19"], ["TUR", "PAR", 2, 31, "2026-06-20"],
          ["TUR", "USA", 3, 59, "2026-06-25"], ["PAR", "AUS", 3, 60, "2026-06-25"]],
    "E": [["CIV", "ECU", 1, 9, "2026-06-14"], ["GER", "CUW", 1, 10, "2026-06-14"],
          ["GER", "CIV", 2, 33, "2026-06-20"], ["ECU", "CUW", 2, 34, "2026-06-20"],
          ["CUW", "CIV", 3, 55, "2026-06-25"], ["ECU", "GER", 3, 56, "2026-06-25"]],
    "F": [["NED", "JPN", 1, 11, "2026-06-14"], ["SWE", "TUN", 1, 12, "2026-06-14"],
          ["NED", "SWE", 2, 35, "2026-06-20"], ["TUN", "JPN", 2, 36, "2026-06-21"],
          ["JPN", "SWE", 3, 57, "2026-06-25"], ["TUN", "NED", 3, 58, "2026-06-25"]],
    "G": [["IRN", "NZL", 1, 15, "2026-06-16"], ["BEL", "EGY", 1, 16, "2026-06-15"],
          ["BEL", "IRN", 2, 39, "2026-06-21"], ["NZL", "EGY", 2, 40, "2026-06-21"],
          ["EGY", "IRN", 3, 63, "2026-06-26"], ["NZL", "BEL", 3, 64, "2026-06-26"]],
    "H": [["KSA", "URU", 1, 13, "2026-06-15"], ["ESP", "CPV", 1, 14, "2026-06-15"],
          ["URU", "CPV", 2, 37, "2026-06-21"], ["ESP", "KSA", 2, 38, "2026-06-21"],
          ["CPV", "KSA", 3, 65, "2026-06-26"], ["URU", "ESP", 3, 66, "2026-06-26"]],
    "I": [["FRA", "SEN", 1, 17, "2026-06-16"], ["IRQ", "NOR", 1, 18, "2026-06-16"],
          ["NOR", "SEN", 2, 41, "2026-06-22"], ["FRA", "IRQ", 2, 42, "2026-06-22"],
          ["NOR", "FRA", 3, 61, "2026-06-26"], ["SEN", "IRQ", 3, 62, "2026-06-26"]],
    "J": [["ARG", "ALG", 1, 19, "2026-06-16"], ["AUT", "JOR", 1, 20, "2026-06-17"],
          ["ARG", "AUT", 2, 43, "2026-06-22"], ["JOR", "ALG", 2, 44, "2026-06-22"],
          ["ALG", "AUT", 3, 69, "2026-06-27"], ["JOR", "ARG", 3, 70, "2026-06-27"]],
    "K": [["POR", "COD", 1, 23, "2026-06-17"], ["UZB", "COL", 1, 24, "2026-06-17"],
          ["POR", "UZB", 2, 47, "2026-06-23"], ["COL", "COD", 2, 48, "2026-06-23"],
          ["COL", "POR", 3, 71, "2026-06-27"], ["COD", "UZB", 3, 72, "2026-06-27"]],
    "L": [["GHA", "PAN", 1, 21, "2026-06-17"], ["ENG", "CRO", 1, 22, "2026-06-17"],
          ["ENG", "GHA", 2, 45, "2026-06-23"], ["PAN", "CRO", 2, 46, "2026-06-23"],
          ["PAN", "ENG", 3, 67, "2026-06-27"], ["CRO", "GHA", 3, 68, "2026-06-27"]],
}


# Kick-off time (US Eastern, HH:MM) per match number — mirrors the JS schedule.
_TIMES = {
    1: '15:00', 2: '22:00', 3: '15:00', 4: '21:00', 5: '21:00', 6: '00:00', 7: '18:00', 8: '15:00',
    9: '19:00', 10: '13:00', 11: '16:00', 12: '22:00', 13: '18:00', 14: '13:00', 15: '00:00', 16: '18:00',
    17: '15:00', 18: '18:00', 19: '21:00', 20: '00:00', 21: '19:00', 22: '16:00', 23: '13:00', 24: '22:00',
    25: '12:00', 26: '15:00', 27: '18:00', 28: '23:00', 29: '21:00', 30: '18:00', 31: '00:00', 32: '15:00',
    33: '16:00', 34: '20:00', 35: '13:00', 36: '00:00', 37: '18:00', 38: '12:00', 39: '15:00', 40: '21:00',
    41: '20:00', 42: '17:00', 43: '13:00', 44: '23:00', 45: '16:00', 46: '19:00', 47: '13:00', 48: '22:00',
    49: '18:00', 50: '18:00', 51: '15:00', 52: '15:00', 53: '21:00', 54: '21:00', 55: '16:00', 56: '16:00',
    57: '19:00', 58: '19:00', 59: '22:00', 60: '22:00', 61: '15:00', 62: '15:00', 63: '23:00', 64: '23:00',
    65: '20:00', 66: '20:00', 67: '17:00', 68: '17:00', 69: '22:00', 70: '22:00', 71: '19:30', 72: '19:30',
}

# US Eastern is UTC-4 in June (EDT), so kickoff_utc = ET wall-clock + 4h.
_ET_TO_UTC = timedelta(hours=4)


def _date_label(iso):
    y, mo, d = iso.split("-")
    return f"{int(d)} {_MONTHS[int(mo) - 1]}"


def _kickoff_utc(iso, hhmm):
    """Epoch seconds (UTC) for an ET kickoff on the given date."""
    y, mo, d = (int(x) for x in iso.split("-"))
    h, mi = (int(x) for x in hhmm.split(":"))
    dt = datetime(y, mo, d, h, mi) + _ET_TO_UTC
    return dt.replace(tzinfo=timezone.utc).timestamp()


MATCHES_BY_NO = {}
for _group, _rows in _SCHED.items():
    for _home, _away, _md, _no, _iso in _rows:
        _t = _TIMES.get(_no, "00:00")
        MATCHES_BY_NO[_no] = {
            "no": _no, "home": _home, "away": _away, "group": _group,
            "md": _md, "date_iso": _iso, "date_label": _date_label(_iso),
            "time_et": _t, "kickoff_utc": _kickoff_utc(_iso, _t),
        }


def match_by_id(match_id):
    """Resolve "M1" / "1" / "m1" to its fixture dict, or None if unknown."""
    s = str(match_id or "").strip().upper()
    if s.startswith("M"):
        s = s[1:]
    try:
        return MATCHES_BY_NO.get(int(s))
    except (TypeError, ValueError):
        return None
