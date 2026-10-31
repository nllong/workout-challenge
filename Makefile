.DEFAULT_GOAL := dev

PYTHON ?= python3
HOST ?= 127.0.0.1
PORT ?= 8080

.PHONY: dev setup help

dev: setup
	@printf 'Daily: http://%s:%s\nPress Ctrl+C to stop.\n' "$(HOST)" "$(PORT)"
	@"$(PYTHON)" -m http.server "$(PORT)" --bind "$(HOST)"

setup:
	@command -v "$(PYTHON)" >/dev/null 2>&1 || { printf 'Python 3 is required. Install it or set PYTHON=/path/to/python3.\n' >&2; exit 1; }
	@"$(PYTHON)" -c 'import sys; sys.exit(0 if sys.version_info.major == 3 else "Python 3 is required.")'

help:
	@printf '%s\n' 'make dev                 Start the local app (port 8080).' 'make dev PORT=8081       Use a different port.' 'make setup               Check Python 3; no app dependencies are needed.'
