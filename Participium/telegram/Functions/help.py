from __future__ import annotations
import os
from typing import List, Dict
from telegram import InputFile
import aiofiles
import io
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from .login import build_main_menu
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
from .start import BASE_URL, TELEGRAM_FAQ_URL,sessions, _httpx_with_retry
from urllib.parse import urlparse


#Keyboard for help menu
def build_help_menu() -> InlineKeyboardMarkup:
    keyboard = [
        [
            InlineKeyboardButton("🤖 Basic Commands", callback_data="basic_commands"),
        ],
        [
            InlineKeyboardButton("❓ FAQ", callback_data="faq"),
        ],
        [
            InlineKeyboardButton("🔧 Contact Support", callback_data="contact_support"),
        ],
        [
            InlineKeyboardButton("🔙 Back to Main Menu", callback_data="back_main_menu")
        ],
        
    ]
    return InlineKeyboardMarkup(keyboard)

async def handle_help_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Help' button press from the main menu."""
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "Here is the help menu. Choose an option:",
        reply_markup=build_help_menu()
    )

#Handler for /help command
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Here is the help menu. Choose an option:",
        reply_markup=build_help_menu()
    )

#Handler for help menu callbacks
async def handle_basic_commands(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    help_text = (
        "🤖 *Basic Commands:*\n"
        "/start - Start the bot and login\n"
        "/login - Authenticate your Telegram account\n"
        "/help - Show this help message\n"
    )
    await query.edit_message_text(help_text, parse_mode='Markdown', reply_markup=build_help_menu()) 

async def handle_faq(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    try:
        response = await _httpx_with_retry("GET", TELEGRAM_FAQ_URL)
    except Exception as e:
        await query.edit_message_text(f"Error connecting to server: {e}")
        return
    if response.status_code == 200:
        faq_items = response.json()
        faq_text = "❓ *Frequently Asked Questions:*\n\n"
        for item in faq_items:
            faq_text += f"*Q: {item['question']}*\nA: {item['answer']}\n\n"
        await query.edit_message_text(faq_text, parse_mode='Markdown', reply_markup=build_help_menu())
    else:
        await query.edit_message_text("❌ Error retrieving FAQ from server.", reply_markup=build_help_menu())   

async def handle_contact_support(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    contact_text = (
        "🔧 *Contact Support:*\n"
        "If you need further assistance, please contact our support team at email@placeholder.com"
    )
    await query.edit_message_text(contact_text, parse_mode='Markdown', reply_markup=build_help_menu())  

async def handle_back_to_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "✅ Returning to main menu. Choose a functionality:",
        reply_markup=build_main_menu()
    )
