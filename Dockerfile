# Google Cloud Run Optimized Dockerfile
# Railway Terminal Detention & Sidings Management System
FROM python:3.12-slim

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    APP_HOME=/app

WORKDIR $APP_HOME

# Copy application files
COPY . ./

# Pre-seed and verify SQLite database inside container
RUN python init_db.py

# Cloud Run defaults to port 8080
EXPOSE 8080

# Run the server
CMD ["python", "-u", "server.py"]

