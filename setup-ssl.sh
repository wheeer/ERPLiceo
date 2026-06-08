#!/bin/bash
# Script para instalar y configurar Certbot (SSL) en Ubuntu EC2
echo "🚀 Iniciando proceso de seguridad (HTTPS) para erpliceo.ddns.net..."

# 1. Instalar Certbot
echo "📦 Instalando Certbot..."
sudo apt update
sudo apt install -y certbot

# 2. Detener contenedores (para liberar el puerto 80)
echo "🛑 Deteniendo el servidor web temporalmente..."
sudo docker compose -f docker-compose.prod.yml down

# 3. Generar el certificado
echo "🔐 Generando el certificado oficial (Let's Encrypt)..."
sudo certbot certonly --standalone -d erpliceo.ddns.net --register-unsafely-without-email --agree-tos

# 4. Volver a levantar el proyecto con la nueva configuración
echo "🏗️ Reconstruyendo los contenedores con NGINX Seguro..."
sudo docker compose -f docker-compose.prod.yml up -d --build

echo "✅ ¡Listo! Tu página ahora tiene el candado verde de seguridad."
