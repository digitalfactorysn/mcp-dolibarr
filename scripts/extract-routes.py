#!/usr/bin/env python3
"""Génère src/security/dolibarr-routes.json à partir des sources Dolibarr.

Usage (chaque checkout doit contenir htdocs/**/class/api_*.class.php) :
    python3 -I scripts/extract-routes.py 23.0.3=/chemin/dolibarr-23.0.3 24.0.1=/chemin/dolibarr-24.0.1 \
        > src/security/dolibarr-routes.json

Pour chaque route on mémorise :
  - method / path  (les variables de chemin sont normalisées en "{}") ;
  - versions       (versions de Dolibarr où la route existe) ;
  - params         (noms des paramètres hors chemin : query pour GET/DELETE, corps JSON pour POST/PUT) ;
  - body           (true si la méthode reçoit tout le corps dans $request_data : champs libres).

Le serveur MCP n'appelle que ces routes (liste blanche), avec ces paramètres : un
paramètre qui serait ignoré en silence par Dolibarr est refusé explicitement.
test/routes.test.mjs vérifie que tous les appels du code y figurent.

Règles de routage Restler reproduites :
  - annotation "@url VERBE chemin" -> chemin explicite relatif à la ressource ;
  - sans annotation : index->GET /, get->GET /{id}, post->POST /, put->PUT /{id},
    delete->DELETE /{id}, getXxx/postXxx... -> VERBE /xxx (minuscules) ;
  - nom de ressource = nom de classe en minuscules (htdocs/api/index.php).
"""
import glob
import json
import os
import re
import sys


def norm(path: str) -> str:
    return re.sub(r"\{[^}]*\}", "{}", path).strip().strip("/")


def param_names(sig: str):
    """Noms des paramètres d'une signature PHP (gère les valeurs par défaut array(...))."""
    parts, depth, cur, quote = [], 0, "", None
    for ch in sig:
        if quote:
            cur += ch
            if ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
            cur += ch
        elif ch in "([":
            depth += 1
            cur += ch
        elif ch in ")]":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    names = []
    for p in parts:
        m = re.search(r"\$(\w+)", p)
        if m:
            names.append(m.group(1))
    return names


FUNC = re.compile(
    r"(/\*\*(?:(?!\*/).)*?\*/)\s*((?:public|protected|private)\s+)?function\s+(\w+)\s*\(([^)]*)\)",
    re.S,
)


def parse_checkout(root: str) -> dict:
    """{(verbe, chemin): {"params": [...], "body": bool}}"""
    routes = {}

    def add(verb, raw_path, plist):
        pathvars = set(re.findall(r"\{(\w+)\}", raw_path))
        extra = [x for x in plist if x not in pathvars]
        body = "request_data" in extra
        extra = [x for x in extra if x != "request_data"]
        routes[(verb, norm(raw_path))] = {"params": extra, "body": body}

    for f in glob.glob(os.path.join(root, "htdocs", "**", "api_*.class.php"), recursive=True):
        if "/modulebuilder/template/" in f:
            continue  # gabarit de module, pas une API du coeur
        src = open(f, encoding="utf-8", errors="replace").read()
        m = re.search(r"^class\s+(\w+)", src, re.M)
        if not m:
            continue
        res = m.group(1).lower()
        for blk in FUNC.finditer(src):
            doc, vis, fn, sig = blk.group(1), blk.group(2), blk.group(3), blk.group(4)
            if (vis and vis.strip() != "public") or fn.startswith("_"):
                continue  # seules les méthodes publiques sont exposées par Restler
            plist = param_names(sig)
            urls = re.findall(r"@url[ \t]+(GET|POST|PUT|DELETE|PATCH)[ \t]*([^\s*]*)", doc)
            if urls:
                for verb, p in urls:
                    add(verb, res + "/" + p.strip("/"), plist)
                continue
            if fn == "index":
                add("GET", res, plist)
            elif fn == "get":
                add("GET", res + "/{id}", plist)
            elif fn == "post":
                add("POST", res, plist)
            elif fn == "put":
                add("PUT", res + "/{id}", plist)
            elif fn == "delete":
                add("DELETE", res + "/{id}", plist)
            else:
                mm = re.match(r"^(get|post|put|delete|patch)(.+)$", fn.lower())
                if mm:
                    verb, tail = mm.group(1).upper(), mm.group(2)
                    raw = res + "/" + tail
                    # GET/DELETE automatiques : paramètres obligatoires (sans défaut) = segments de chemin
                    if verb in ("GET", "DELETE"):
                        for p in plist:
                            if re.search(r"\$" + p + r"\s*(,|$)", sig):
                                raw += "/{" + p + "}"
                    add(verb, raw, plist)
    return routes


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    merged = {}
    versions = []
    for arg in sys.argv[1:]:
        ver, path = arg.split("=", 1)
        versions.append(ver)
        for key, info in parse_checkout(path).items():
            cur = merged.setdefault(key, {"versions": set(), "params": set(), "body": False})
            cur["versions"].add(ver)
            cur["params"].update(info["params"])
            cur["body"] = cur["body"] or info["body"]
    out = {
        "generatedFrom": versions,
        "routes": [
            {
                "method": v,
                "path": p,
                "versions": sorted(info["versions"]),
                "params": sorted(info["params"]),
                "body": info["body"],
            }
            for (v, p), info in sorted(merged.items(), key=lambda kv: (kv[0][1], kv[0][0]))
        ],
    }
    json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
