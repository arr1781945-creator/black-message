web: sh -c 'python manage.py migrate && gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --forwarded-allow-ips="*" --proxy-headers'
