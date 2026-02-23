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
from .start import BASE_URL, TELEGRAM_REPORT_URL,sessions, _httpx_with_retry
from urllib.parse import urlparse
# Conversation states for this file
WAITING_ID_TO_FOLLOW = 10
WAITING_ID_TO_UNFOLLOW = 11

STR_NEXT = "What would you like to do next?"
STR_LOGIN_ALERT = "You must first log in with /login."
STR_EXPIRED_SESSION = "❌ Unauthorized. Your session has expired. Please /login again."

#keyboard

def build_receive_notification_keyboard(id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Follow", callback_data=f"start_follow_{id}"),
                InlineKeyboardButton("Stop Following", callback_data=f"stop_follow_{id}"),
            ]
        ]
    )


async def handle_back_to_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        str_next,
        reply_markup=build_main_menu()
    )
def build_rep_msg(rpt: Dict) -> str:
    
    report_id = rpt.get('id')
    title = rpt.get('title')
    state = rpt.get('state')

    # Start building the message text
    text_parts = []
    if report_id:
        text_parts.append(f"📝 *Report ID:* {report_id}")
    if title:
        text_parts.append(f"📄 *Title:* {title}")

    # Safely get description
    description = rpt.get("document", {}).get("description")
    if description:
        if len(description) > 100:
            description = description[:100] + "..."
        text_parts.append(f"ℹ️ *Description:* {description}")

    if state:
        text_parts.append(f"📢 *State:* `{state}`")
    
    rpt_text = "\n".join(text_parts)
    return rpt_text

async def handle_view_reports(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)
    if not token:
        await query.edit_message_text(STR_LOGIN_ALERT)
        return
    try:
        response = await _httpx_with_retry(
            "GET",
            f"{BASE_URL}/telegram/reports",
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code == 200:
            reports = response.json()
            if isinstance(reports, dict):
                reports = reports.get("reports", [])

            if not reports:
                await query.message.reply_text(
                    "No reports found. Choose an option:",
                    reply_markup=build_main_menu()
                )
                return

            # Edit the original message to indicate reports are being sent
            await query.message.reply_text("Here are the reports found:")

            # Send each report as a new message
            for rpt in reports:
                rpt_text = build_rep_msg(rpt)
                
                # Build keyboard for each report
                keyboard = build_receive_notification_keyboard(rpt.get('id'))
                
                # Use reply_text to send a new message for each report
                await query.message.reply_text(
                    text=rpt_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
            
            # After sending all reports, send the main menu
            await query.message.reply_text(
                STR_NEXT,
                reply_markup=build_main_menu()
            )

        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.edit_message_text(STR_EXPIRED_SESSION)
        else:
            await query.edit_message_text(f"❌ Error retrieving reports: {response.text}")
    except Exception as e:
        await query.edit_message_text(f"Error connecting to server: {e}")


async def handle_follow_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Follow' button callback."""
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)
    if not token:
        await query.message.reply_text(STR_LOGIN_ALERT)
        return

    try:
        report_id = int(query.data.replace("start_follow_", ""))
        response = await _httpx_with_retry(
            "POST",
            f"{TELEGRAM_REPORT_URL}{report_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code in (200, 201):
            await query.message.reply_text("✅ You are now following this report. You will receive status updates.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 409:  # Conflict
            await query.message.reply_text("ℹ️ You are already following this report.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.message.reply_text(STR_EXPIRED_SESSION)
        else:
            await query.message.reply_text(f"❌ Error: {response.text}")
    except Exception as e:
        await query.message.reply_text(f"An error occurred: {e}")


async def handle_unfollow_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Stop Following' button callback."""
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)

    if not token:
        await query.message.reply_text(STR_LOGIN_ALERT)
        return

    try:
        report_id = int(query.data.replace("stop_follow_", ""))
        response = await _httpx_with_retry(
            "DELETE",
            f"{TELEGRAM_REPORT_URL}{report_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code in (200, 204):
            await query.message.reply_text("✅ You have stopped following this report.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 404: 
            await query.message.reply_text("ℹ️ You were not following this report.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.message.reply_text(STR_EXPIRED_SESSION)
        else:
            await query.message.reply_text(f"❌ Error: {response.text}")
    except Exception as e:
        await query.message.reply_text(f"An error occurred: {e}")
        
        
        
        
async def handle_follow_all_personal_reports(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Follow All Personal Reports' command."""
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)

    if not token:
        await query.message.reply_text(STR_LOGIN_ALERT)
        return

    try:
        response = await _httpx_with_retry(
            "POST",
            f"{TELEGRAM_REPORT_URL}",
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code in (200, 201):
            await query.message.reply_text("✅ You are now following all your personal reports.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 409:  # Conflict
            await query.message.reply_text("ℹ️ You are already following all your personal reports.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.message.reply_text(STR_EXPIRED_SESSION)
        else:
            await query.message.reply_text(f"❌ Error: {response.text}")
    except Exception as e:
        await query.message.reply_text(f"An error occurred: {e}")
        
async def handle_unfollow_all_personal_reports(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 'Unfollow All Personal Reports' command."""
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)

    if not token:
        await query.message.reply_text(STR_LOGIN_ALERT)
        return
    print("Unfollow all personal reports callback triggered.")
    print("URL: {}".format(f"{TELEGRAM_REPORT_URL}"))
    try:
        response = await _httpx_with_retry(
            "DELETE",
            f"{TELEGRAM_REPORT_URL}",
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code in (200, 204):
            await query.message.reply_text("✅ You have stopped following all your personal reports.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 404: 
            await query.message.reply_text("ℹ️ You were not following any personal reports.")
            await query.message.reply_text(STR_NEXT, reply_markup=build_main_menu())
        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.message.reply_text(STR_EXPIRED_SESSION)
        else:
            await query.message.reply_text(f"❌ Error: {response.text}")
        
    except Exception as e:
        await query.message.reply_text(f"An error occurred: {e}")
        

async def handle_manage_notifications(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)
    if not token:
        await query.edit_message_text(STR_LOGIN_ALERT)
        return
    keyboard = [
        [
            InlineKeyboardButton("Follow All My Reports", callback_data="follow_all_personal_reports"),
            InlineKeyboardButton("Unfollow All My Reports", callback_data="unfollow_all_personal_reports"),
        ],
        [
            InlineKeyboardButton("Follow Report by ID", callback_data="follow_report_by_id"),
            InlineKeyboardButton("Unfollow Report by ID", callback_data="unfollow_report_by_id"),
        ],
        [
            InlineKeyboardButton("⬅️ Back to Main Menu", callback_data="back_main_menu"),
        ]
    ]
    await query.edit_message_text(
        "Manage your report notifications:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def ask_for_id_to_follow(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Entry point for the 'follow by ID' conversation. Asks the user for an ID."""
    query = update.callback_query
    await query.answer()
    keyboard = [
        [InlineKeyboardButton("⬅️ Back", callback_data="back_to_notification_menu")]
    ]
    await query.edit_message_text(
        "Please send the Report ID you wish to follow.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_ID_TO_FOLLOW


async def receive_id_to_follow(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receives the ID, performs the follow action, and ends the conversation."""
    message = update.message
    if message and message.text and message.text.isdigit():
        report_id = int(message.text)
        chat_id = update.effective_chat.id
        token = sessions.get(chat_id)
        if not token:
            await message.reply_text(STR_LOGIN_ALERT)
            return ConversationHandler.END

        response = await _httpx_with_retry(
            "POST",
            f"{TELEGRAM_REPORT_URL}{report_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code in (200, 201):
            await message.reply_text(f"✅ You are now following report {report_id}.")
        elif response.status_code == 409:
            await message.reply_text(f"ℹ️ You are already following report {report_id}.")
        else:
            await message.reply_text("❌ Error")
    else:
        await message.reply_text("Invalid ID. Please send a numeric ID.")
        return WAITING_ID_TO_FOLLOW # Stay in the same state to allow user to retry

    # On success, show the main menu again
    await message.reply_text(STR_NEXT, reply_markup=build_main_menu())
    return ConversationHandler.END


async def ask_for_id_to_unfollow(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Entry point for the 'unfollow by ID' conversation. Asks the user for an ID."""
    query = update.callback_query
    await query.answer()
    keyboard = [
        [InlineKeyboardButton("⬅️ Back", callback_data="back_to_notification_menu")]
    ]
    await query.edit_message_text(
        "Please send the Report ID you wish to unfollow.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_ID_TO_UNFOLLOW


async def receive_id_to_unfollow(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Receives the ID, performs the unfollow action, and ends the conversation."""
    message = update.message
    if message and message.text and message.text.isdigit():
        report_id = int(message.text)
        chat_id = update.effective_chat.id
        token = sessions.get(chat_id)
        if not token:
            await message.reply_text(STR_LOGIN_ALERT)
            return ConversationHandler.END

        response = await _httpx_with_retry(
            "DELETE",
            f"{TELEGRAM_REPORT_URL}{report_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code in (200, 204):
            await message.reply_text(f"✅ You have stopped following report {report_id}.")
        elif response.status_code == 404:
            await message.reply_text(f"ℹ️ You were not following report {report_id}.")
        else:
            await message.reply_text(f"❌ Error: {response.text}")
    else:
        await message.reply_text("Invalid ID. Please send a numeric ID.")
        return WAITING_ID_TO_UNFOLLOW # Stay in the same state

    await message.reply_text(STR_NEXT, reply_markup=build_main_menu())
    return ConversationHandler.END