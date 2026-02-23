from __future__ import annotations
import os
from typing import List, Dict
from telegram import InputFile
import aiofiles
import io
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    ContextTypes,
)
import httpx
from urllib.parse import urlparse
import asyncio
from .start import BASE_URL, sessions, _httpx_with_retry   




def build_main_menu() -> InlineKeyboardMarkup:
    """Build main menu with available functionalities."""
    keyboard = [
        [InlineKeyboardButton("📝 Create Report", callback_data="start_report")],
        [InlineKeyboardButton("📊 View My Active Reports", callback_data="view_reports")],
        [InlineKeyboardButton("🔔 Manage Notifications", callback_data="manage_notifications")],
        [InlineKeyboardButton("❓ Help", callback_data="help_menu")],
        # Add more functionalities here in the future
    ]
    return InlineKeyboardMarkup(keyboard)




async def handle_login(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    username = update.effective_user.username
    try:
        response = await _httpx_with_retry("POST", f"{BASE_URL}/auth/telegram", json={"username": username, "chat_id": chat_id})
    except Exception as e:
        await query.edit_message_text(f"Error connecting to server: {e}")
        return
    if response.status_code == 200:
        token = response.json()
        sessions[chat_id] = token
        await query.edit_message_text(
            "✅ Login successful! Choose a functionality:",
            reply_markup=build_main_menu()
        )
    else:
        await query.edit_message_text("❌ Error during login. Make sure you have registered your Telegram username.")
        

async def retrieve_account(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    username = update.effective_user.username
    try:
        response = await _httpx_with_retry("POST", f"{BASE_URL}/auth/telegram", json={"username": username, "chatId": chat_id})
    except Exception as e:
        await update.message.reply_text(f"Error connecting to server: {e}")
        return
    if response.status_code == 200:
        token = response.json()
        sessions[chat_id] = token
        await update.message.reply_text(
            "✅ Login successful! Choose a functionality:",
            reply_markup=build_main_menu()
        )
    else:
        await update.message.reply_text("Error during login. Make sure you have registered your Telegram username.")
        

async def logout(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Logout user and clear session."""
    chat_id = update.effective_chat.id
    if chat_id in sessions:
        sessions.pop(chat_id, None)
        await update.message.reply_text("✅ Logged out successfully. Use /login to authenticate again.")
    else:
        await update.message.reply_text("❌ You are not logged in.")