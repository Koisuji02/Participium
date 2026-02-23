
from __future__ import annotations
import os
from typing import List, Dict
from telegram import InputFile
import aiofiles
import io
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
    ConversationHandler,
    CallbackQueryHandler,
    ContextTypes,
)
import httpx
import asyncio
from urllib.parse import urlparse


async def _httpx_with_retry(method: str, url: str, **kwargs):
    # Piccolo retry esponenziale per DNS/timeout
    attempts = 3
    delay = 0.5
    last_exc = None
    async with httpx.AsyncClient(timeout=5) as client:
        for i in range(attempts):
            try:
                return await client.request(method, url, **kwargs)
            except httpx.ConnectError as e:
                last_exc = e
            except httpx.ReadTimeout as e:
                last_exc = e
            except httpx.TransportError as e:
                last_exc = e
            await asyncio.sleep(delay * (2 ** i))
    raise last_exc


def _normalize_server_url(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return "http://localhost:5000"
    if not raw.startswith(("http://", "https://")):
        # default a http se porta 5000 (tipico dev server)
        raw = f"http://{raw}"
    parsed = urlparse(raw)
    if not parsed.scheme:
        raw = f"http://{raw}"
    return raw


        



async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Welcome to the Participium Bot! Use /login to authenticate. \n For help, use /help.")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "ParticipiumLogo.webp")
    if os.path.exists(image_path):
        # Use asynchronous file I/O to read the image
        async with aiofiles.open(image_path, "rb") as f:
            content = await f.read()
        bio = io.BytesIO(content)
        bio.name = os.path.basename(image_path)
        await update.message.reply_sticker(sticker=bio)
    else:
        print(f"Warning: Image not found at {image_path}")



server_base_url = "http://127.0.0.1:5000" # Use IP to avoid DNS issues
SERVER_URL = _normalize_server_url(os.getenv("SERVER_URL", server_base_url))
BASE_URL = SERVER_URL.rstrip("/") + "/api/v1"
TELEGRAM_REPORT_URL = BASE_URL + "/telegram/reports/"
TELEGRAM_FAQ_URL = BASE_URL + "/faqs/"
sessions: Dict[int, str] = {}