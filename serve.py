#!/usr/bin/env python3
"""
serve.py — Servidor local HTTPS para probar Don Chepe WebAR desde un teléfono Android.

WebXR (cámara + AR) solo funciona en contextos seguros (HTTPS o localhost).
Este script:
  1. Detecta la IP de tu computador en la red local (Wi-Fi).
  2. Genera un certificado autofirmado (con 'cryptography' u 'openssl').
  3. Sirve el proyecto por HTTPS en https://<IP>:8443/
  4. Imprime un QR en la terminal (si está instalado 'qrcode') y lo expone en /__lan.json
     para que index.html muestre el QR correcto.

Uso:
    python serve.py                 # HTTPS en el puerto 8443
    python serve.py --port 9000
    python serve.py --http          # HTTP simple (sirve para el visor 3D en el PC, no para AR en el teléfono)

Solo usa la biblioteca estándar de Python; 'cryptography' y 'qrcode' son opcionales:
    pip install cryptography qrcode
"""
import argparse
import datetime
import functools
import http.server
import ipaddress
import json
import os
import shutil
import socket
import ssl
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CERT_DIR = os.path.join(ROOT, ".cert")


def lan_ip():
    """IP local usada para salir a la red (no envía tráfico)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def make_cert(ip):
    os.makedirs(CERT_DIR, exist_ok=True)
    cert, key = os.path.join(CERT_DIR, "cert.pem"), os.path.join(CERT_DIR, "key.pem")
    stamp = os.path.join(CERT_DIR, "ip.txt")
    if os.path.exists(cert) and os.path.exists(key) and os.path.exists(stamp) and open(stamp).read() == ip:
        return cert, key
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID

        k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Don Chepe WebAR (local)")])
        san = x509.SubjectAlternativeName([
            x509.DNSName("localhost"),
            x509.IPAddress(ipaddress.ip_address(ip)),
            x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        ])
        now = datetime.datetime.now(datetime.timezone.utc)
        c = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(k.public_key())
             .serial_number(x509.random_serial_number())
             .not_valid_before(now - datetime.timedelta(days=1))
             .not_valid_after(now + datetime.timedelta(days=825))
             .add_extension(san, critical=False).sign(k, hashes.SHA256()))
        with open(key, "wb") as f:
            f.write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL,
                                    serialization.NoEncryption()))
        with open(cert, "wb") as f:
            f.write(c.public_bytes(serialization.Encoding.PEM))
    except ImportError:
        if not shutil.which("openssl"):
            sys.exit("No hay 'cryptography' ni 'openssl'. Instala uno:  pip install cryptography")
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "825",
                        "-keyout", key, "-out", cert, "-subj", "/CN=Don Chepe WebAR (local)",
                        "-addext", f"subjectAltName=DNS:localhost,IP:{ip},IP:127.0.0.1"],
                       check=True, capture_output=True)
    with open(stamp, "w") as f:
        f.write(ip)
    return cert, key


class Handler(http.server.SimpleHTTPRequestHandler):
    public_url = ""
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json", ".mp3": "audio/mpeg", ".json": "application/json",
        ".svg": "image/svg+xml", ".wasm": "application/wasm",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/__lan.json"):
            body = json.dumps({"url": self.public_url}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s  %s\n" % (self.address_string(), fmt % args))


def print_qr(url):
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.print_ascii(invert=True)
    except ImportError:
        print("  (instala 'qrcode' para ver el QR aquí:  pip install qrcode)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=None)
    ap.add_argument("--http", action="store_true", help="servir sin TLS")
    ap.add_argument("--host", default="0.0.0.0")
    a = ap.parse_args()

    ip = lan_ip()
    port = a.port or (8080 if a.http else 8443)
    scheme = "http" if a.http else "https"
    Handler.public_url = f"{scheme}://{ip}:{port}/"
    httpd = http.server.ThreadingHTTPServer((a.host, port), functools.partial(Handler, directory=ROOT))
    if not a.http:
        cert, key = make_cert(ip)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cert, key)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    ar = Handler.public_url + "ar.html"
    print("\n  Don Chepe WebAR")
    print("  ───────────────")
    print(f"  PC (visor 3D):   {scheme}://localhost:{port}/viewer.html")
    print(f"  Inicio + QR:     {scheme}://localhost:{port}/")
    print(f"  Teléfono (AR):   {ar}\n")
    print_qr(ar)
    if not a.http:
        print("  Certificado autofirmado: en el teléfono Chrome mostrará una advertencia.")
        print("  Pulsa 'Configuración avanzada' → 'Acceder a <IP> (sitio no seguro)'.\n")
    print("  El teléfono y el PC deben estar en la misma red Wi-Fi. Ctrl+C para detener.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor detenido.")


if __name__ == "__main__":
    main()
