#!/usr/bin/env bash
PORT=8080
echo "Bubixo İngilizce Klonu Başlatılıyor..."
echo "Tarayıcınızda açın: http://localhost:$PORT"
cd "$(dirname "$0")"
python3 -m http.server $PORT
