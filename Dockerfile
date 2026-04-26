FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    ninja-build \
    libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install liboqs from source
RUN git clone --depth 1 https://github.com/open-quantum-safe/liboqs.git && \
    cmake -S liboqs -B liboqs/build -DBUILD_SHARED_LIBS=ON && \
    cmake --build liboqs/build -j4 && \
    cmake --build liboqs/build --target install && \
    rm -rf liboqs

# Install liboqs-python
RUN pip install liboqs-python --break-system-packages 2>/dev/null || pip install liboqs-python

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:$PORT", "--workers", "2"]
