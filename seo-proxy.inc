# Wspólne ustawienia dla adresów renderowanych przez API (nginx.conf).
proxy_pass http://homepage_api:3001;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 3s;
proxy_read_timeout 10s;
proxy_intercept_errors on;
error_page 500 502 503 504 = @spa;
