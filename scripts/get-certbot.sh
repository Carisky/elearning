#!/usr/bin/env bash
set -euo pipefail

domain="akademia.tsl-silesia.com.pl"
email="${CERTBOT_EMAIL:-}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vhost_source="$root_dir/apache/$domain.conf"
vhost_target="/etc/apache2/sites-available/$domain.conf"

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is not installed. Install certbot and python3-certbot-apache first."
  exit 1
fi

if [[ ! -f "$vhost_source" ]]; then
  echo "Apache vhost config not found at $vhost_source"
  exit 1
fi

if command -v a2enmod >/dev/null 2>&1; then
  sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
fi

if command -v a2ensite >/dev/null 2>&1; then
  sudo install -m 0644 "$vhost_source" "$vhost_target"
  sudo a2ensite "$domain.conf"
fi

if command -v apache2ctl >/dev/null 2>&1; then
  sudo apache2ctl configtest
fi

sudo systemctl reload apache2

args=(
  --apache
  -d "$domain"
  --redirect
  --agree-tos
  --no-eff-email
)

if [[ -n "$email" ]]; then
  args+=(-m "$email")
else
  args+=(--register-unsafely-without-email)
fi

sudo certbot "${args[@]}"
sudo systemctl reload apache2
