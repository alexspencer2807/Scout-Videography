"""Server-side mirror of the FIFA World Cup 2026 group-stage fixture map.

The front-end keeps the full schedule in static/js/worldcup.js. The backend only
needs enough to turn a match id (e.g. "M1") into its two team codes so it can
build a Coach Scout prediction prompt. Keyed by FIFA match number, which is what
the front-end's MATCH_ANALYSIS entries (`no`) line up against.

Rows: [home_code, away_code, matchday, match_no, date_iso]
"""

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


def _date_label(iso):
    y, mo, d = iso.split("-")
    return f"{int(d)} {_MONTHS[int(mo) - 1]}"


MATCHES_BY_NO = {}
for _group, _rows in _SCHED.items():
    for _home, _away, _md, _no, _iso in _rows:
        MATCHES_BY_NO[_no] = {
            "no": _no, "home": _home, "away": _away, "group": _group,
            "md": _md, "date_iso": _iso, "date_label": _date_label(_iso),
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
