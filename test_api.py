import urllib.request
import json

try:
    req = urllib.request.urlopen("http://127.0.0.1:8000/api/asistencia/5/2026/?empleadoId=11111111-1")
    res = req.read().decode('utf-8')
    print("Response:", res)
except Exception as e:
    print("Error:", e)
