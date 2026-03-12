import argparse
import http.server
import os
import socketserver
from pathlib import Path
from urllib.parse import urlparse


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        request_path = parsed.path or "/"

        # If it's a real file on disk, serve it normally.
        local_path = Path(self.translate_path(request_path))
        if local_path.exists() and local_path.is_file():
            return super().do_GET()

        # If it looks like a static asset request (has an extension), keep normal behavior (404).
        if "." in Path(request_path).name:
            return super().do_GET()

        # SPA fallback: serve index.html for client-side routes.
        self.path = "/index.html"
        return super().do_GET()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve a Vite/React SPA build with history API fallback.")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--dir", default=str(Path(__file__).with_name("dist")))
    args = parser.parse_args()

    directory = os.path.abspath(args.dir)
    handler = lambda *a, **kw: SpaHandler(*a, directory=directory, **kw)

    with socketserver.ThreadingTCPServer((args.host, args.port), handler) as httpd:
        httpd.allow_reuse_address = True
        print(f"Serving {directory} on http://{args.host}:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
