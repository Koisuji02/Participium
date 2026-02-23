FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY bot_config.py .
COPY Functions/ ./Functions/

# Avvia il bot
CMD ["python3", "bot_config.py"]