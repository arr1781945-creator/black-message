# devops/Dockerfile
FROM python:3.11-slim-bookworm AS base

LABEL maintainer="SecureBank Platform Team"
LABEL description="SecureBank Slack-Clone — Ultra-secure enterprise messenger"

# Security: non-root user
RUN groupadd -r sbslack && useradd -r -g sbslack -d /app -s /sbin/nologin sbslack

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev libssl-dev libpq-dev \
    git curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .
RUN chown -R sbslack:sbslack /app

USER sbslack

ENV DJANGO_SETTINGS_MODULE=core.settings
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
