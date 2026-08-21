#!/usr/bin/env python3
"""Validate one JSON value against a component schema in the local OpenAPI document."""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import jsonschema
import yaml

warnings.filterwarnings("ignore", category=DeprecationWarning, module="jsonschema")

if len(sys.argv) != 2:
    raise SystemExit("usage: validate-openapi-schema.py <ComponentSchemaName>")

root = Path(__file__).resolve().parent.parent
path = root / "openapi" / "viral-api.v1.yaml"
document = yaml.safe_load(path.read_text(encoding="utf-8"))
payload = json.load(sys.stdin)
name = sys.argv[1]
if name not in document.get("components", {}).get("schemas", {}):
    raise SystemExit(f"unknown OpenAPI component schema: {name}")

# The OpenAPI document uses JSON Schema 2020-12 constructs and one local,
# generated JSON contract. The explicit base URI lets jsonschema resolve both
# internal #/components refs and ./generated/channel-publish-fields.v1.json.
resolver = jsonschema.RefResolver(base_uri=path.as_uri(), referrer=document)
schema = {"$ref": f"#/components/schemas/{name}"}
jsonschema.Draft202012Validator(schema, resolver=resolver).validate(payload)
