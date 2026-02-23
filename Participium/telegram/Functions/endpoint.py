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
# ------------------------------------------------------------------ #
# Configuration / State
# ------------------------------------------------------------------ #

# Conversation states
WAITING_TITLE = 1
WAITING_DESCRIPTION = 2
WAITING_CATEGORY = 3
WAITING_PHOTO = 4
WAITING_LOCATION = 5
WAITING_ANONYMOUS = 6

# Text strings used in the conversation flow
str_ch_category = "Please choose a category for your report:"
str_going_back = "Going back to the previous step."
str_send_location = "Please send your location (must be within Turin area)."

categories: List[str] = []

async def load_categories() -> None:
    """Load categories asynchronously at startup."""
    global categories
    try:
        # Remove DNS pre-check; just try to fetch
        response = await _httpx_with_retry("GET", f"{BASE_URL}/info-types")
        response.raise_for_status()
        data = response.json()
        categories = data.get("officeTypes", []) or []
        print("Loaded categories:", categories)
    except Exception as e:
        print("Failed to load categories:", e)
        categories = []

        
# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #
def build_back_cancel_row(prefix: str) -> list[InlineKeyboardButton]:
    # Ritorna una singola riga (lista di bottoni)
    return [
        InlineKeyboardButton("⬅️ Back", callback_data=f"back_{prefix}"),
        InlineKeyboardButton("❌ Cancel", callback_data="cancel_report"),
    ]
def build_cancel_button() -> InlineKeyboardButton:
    return [InlineKeyboardButton("❌ Cancel", callback_data="cancel_report")]
def build_back_cancel_keyboard(prefix: str) -> InlineKeyboardMarkup:
    # Se vuoi l'intero markup (non usarlo dentro altre tastiere)
    return InlineKeyboardMarkup([build_back_cancel_row(prefix)])

def build_category_keyboard() -> InlineKeyboardMarkup:
    keyboard = [
        [InlineKeyboardButton(label, callback_data=f"category_{i}")]
        for i, label in enumerate(categories)
    ]
    # Append la riga, non un InlineKeyboardMarkup
    keyboard.append(build_back_cancel_row("description"))
    return InlineKeyboardMarkup(keyboard)

def build_yes_no_keyboard(prefix: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✅ Yes", callback_data=f"{prefix}_yes"),
                InlineKeyboardButton("❌ No", callback_data=f"{prefix}_no"),
            ]
        ]
    )

def in_turin(latitude: float, longitude: float) -> bool:
    return 44.9 <= latitude <= 45.2 and 7.5 <= longitude <= 7.8
# ------------------------------------------------------------------ #
# Handlers
# ------------------------------------------------------------------ #

async def send_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    chat_id = update.effective_chat.id
    if chat_id not in sessions:
        await update.message.reply_text("You must first log in with /login.")
        return ConversationHandler.END
    # Use only the Cancel button, properly wrapped as a single row
    keyboard = [build_cancel_button()]
    await update.message.reply_text(
        "Let's start. Please send the report title.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_TITLE

async def receive_title(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data["title"] = update.message.text.strip()
    # build_back_cancel_keyboard returns InlineKeyboardMarkup; pass it directly
    await update.message.reply_text(
        "Title received. Now send the description.",
        reply_markup=build_back_cancel_keyboard("title")
    )
    return WAITING_DESCRIPTION

async def receive_description(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    description = (update.message.text or "").strip()
    if not description:
        await update.message.reply_text("Description cannot be empty. Please send a valid description.")
        return WAITING_DESCRIPTION
    if len(description) < 30:
        await update.message.reply_text("Description must be at least 30 characters. Send a more detailed description.")
        return WAITING_DESCRIPTION
    context.user_data["description"] = description
    await update.message.reply_text(str_ch_category, reply_markup=build_category_keyboard())
    return WAITING_CATEGORY

async def receive_category(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    index = int(query.data.replace("category_", ""))
    category = categories[index]
    context.user_data["category"] = category
    context.user_data["photos"] = []
    await query.edit_message_text(f"Category selected: {category}")
    keyboard= [
        build_back_cancel_row("category")
    ]
    await query.message.reply_text(
        "Send at least 1 photo (max 3). When done, send /done.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_PHOTO

async def receive_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    photos = context.user_data.setdefault("photos", [])
    if len(photos) >= 3:
        await update.message.reply_text("Already 3 photos. Processing...")
        return WAITING_PHOTO
    script_dir = os.path.dirname(os.path.abspath(__file__))
    photos_dir = os.path.join(script_dir, "photos")
    os.makedirs(photos_dir, exist_ok=True)
    photo_file = await update.message.photo[-1].get_file()
    photo_path = os.path.join(photos_dir, f"{photo_file.file_id}.jpg")
    await photo_file.download_to_drive(photo_path)
    photos.append(photo_path)
    num = len(photos)
    
    # If 3 photos, automatically move to next step
    if num >= 3:
        await update.message.reply_text(f"Photo {num}/3 received. Maximum reached!")
        keyboard= [
            build_back_cancel_row("photos")
        ]
        await update.message.reply_text(
            str_send_location,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return WAITING_LOCATION
    
    # Show Done button after first photo
    keyboard = [
        [InlineKeyboardButton("✅ Done", callback_data="done_photos")],
        build_back_cancel_row("photos")
    ]
    await update.message.reply_text(
        f"Photo {num}/3 received. Send another photo or tap Done.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_PHOTO

async def done_photos(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    # Handle both callback query and command
    if update.callback_query:
        query = update.callback_query
        await query.answer()
        num = len(context.user_data.get("photos", []))
        if num < 1:
            await query.message.reply_text("At least 1 photo required.")
            return WAITING_PHOTO
        await query.edit_message_text(f"{num} photo(s) received.")
        keyboard= [
            build_back_cancel_row("photos")
        ]
        await query.message.reply_text(
            str_send_location,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        # Handle /done command
        num = len(context.user_data.get("photos", []))
        if num < 1:
            await update.message.reply_text("At least 1 photo required.")
            return WAITING_PHOTO
        keyboard= [
            build_back_cancel_row("photos")
        ]
        await update.message.reply_text(
            str_send_location,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    return WAITING_LOCATION

async def skip_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("You must send at least 1 photo or /cancel.")
    return WAITING_PHOTO

async def receive_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    lat = update.message.location.latitude
    lng = update.message.location.longitude
    if not in_turin(lat, lng):
        await update.message.reply_text("⚠️ Location must be within Turin area. Send a valid location in Turin.")
        return WAITING_LOCATION
    context.user_data["latitude"] = lat
    context.user_data["longitude"] = lng
    # Yes/No + Back + Cancel inline keyboard
    anon_keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Yes", callback_data="anonymous_yes"),
            InlineKeyboardButton("❌ No", callback_data="anonymous_no"),
        ],
        build_back_cancel_row("location"),
    ])
    await update.message.reply_text("Do you want to send the report anonymously?", reply_markup=anon_keyboard)
    return WAITING_ANONYMOUS

async def handle_back(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Generic back navigation handler."""
    query = update.callback_query
    await query.answer()
    data = query.data  # e.g., back_description
    target = data.replace("back_", "")

    if target == "title":
        # Already at first step; just re-prompt title
        await query.edit_message_text(str_going_back)
        # Use only the Cancel button, properly wrapped
        keyboard = [build_cancel_button()]
        await query.message.reply_text(
            "Send the report title again:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        context.user_data.pop("title", None)
        context.user_data.pop("description", None)
        return WAITING_TITLE
    if target == "description":
        await query.edit_message_text(str_going_back)
        keyboard= [
            build_back_cancel_row("title")
        ]
        await query.message.reply_text(
            "Send the description again:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        context.user_data.pop("description", None)
        return WAITING_DESCRIPTION
    if target == "category":
        await query.edit_message_text(str_going_back)
        context.user_data.pop("category", None)
        context.user_data.pop("photos", None)
        await query.message.reply_text(str_ch_category, reply_markup=build_category_keyboard())
        return WAITING_CATEGORY
    if target == "photos":
        # Go back to photo collection stage
        await query.edit_message_text(str_going_back)
        keyboard= [
            build_back_cancel_row("category")
        ]
        await query.message.reply_text(
            "Send at least 1 photo (max 3). When done, send /done.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return WAITING_PHOTO
    if target == "location":
        # Back from anonymous to location
        await query.edit_message_text(str_going_back)
        keyboard= [
            build_back_cancel_row("photos")
        ]
        await query.message.reply_text(
            "Send your location again.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        context.user_data.pop("latitude", None)
        context.user_data.pop("longitude", None)
        return WAITING_LOCATION
    # Fallback: end conversation if unknown
    await query.edit_message_text("Unknown back target.")
    return ConversationHandler.END

async def receive_anonymous(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    anonymous = query.data.endswith("_yes")
    context.user_data["anonymous"] = anonymous
    chat_id = update.effective_chat.id
    token = sessions.get(chat_id)
    report_data = {
        "title": context.user_data.get("title"),
        "description": context.user_data.get("description"),
        "category": context.user_data.get("category"),
        "latitude": str(context.user_data.get("latitude")),
        "longitude": str(context.user_data.get("longitude")),
        "anonymity": "1" if anonymous else "0",
    }
    photo_paths = context.user_data.get("photos", [])
    files = []
    for p in photo_paths:
        if os.path.exists(p):
            async with aiofiles.open(p, "rb") as af:
                data = await af.read()
            bio = io.BytesIO(data)
            bio.name = os.path.basename(p)
            files.append(("photos", (os.path.basename(p), bio, "image/jpeg")))
    try:
        response = await _httpx_with_retry(
            "POST",
            f"{BASE_URL}/reports",
            data=report_data,
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code in (200, 201):
            await query.edit_message_text(f"✅ Report sent with {len(files)} photo(s)! {'(Anonymous)' if anonymous else ''}")
            await query.message.reply_text("What would you like to do next?", reply_markup=build_main_menu())
        elif response.status_code == 401:
            sessions.pop(chat_id, None)
            await query.edit_message_text("❌ Unauthorized. Your session has expired. Please /login again.")
        else:
            await query.edit_message_text(f"❌ Error sending report: {response.text}")
    finally:
        # Close buffers and remove temp files
        for _, file_tuple in files:
            file_obj = file_tuple[1]
            try:
                file_obj.close()
            except Exception:
                pass
        for p in photo_paths:
            if os.path.exists(p):
                os.remove(p)
    context.user_data.clear()
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    # Handle both command and callback query
    if update.callback_query:
        query = update.callback_query
        await query.answer()
        context.user_data.clear()
        await query.edit_message_text(
            "❌ Operation cancelled. Choose a functionality:",
            reply_markup=build_main_menu()
        )
    else:
        await update.message.reply_text("Operation cancelled.")
        context.user_data.clear()
    return ConversationHandler.END

async def show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not categories:
        await update.message.reply_text("No categories available.")
        return ConversationHandler.END
    await update.message.reply_text(str_ch_category, reply_markup=build_category_keyboard())
    return WAITING_CATEGORY

async def handle_start_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    chat_id = update.effective_chat.id
    if chat_id not in sessions:
        await query.edit_message_text("You must first log in with /login.")
        return ConversationHandler.END
    await query.edit_message_text("Starting report submission...")
    # Each row must be a sequence of InlineKeyboardButton
    keyboard = [build_cancel_button()]  # single-row with only Cancel
    await context.bot.send_message(
        chat_id=chat_id,
        text="Let's start the report submission process. Please send the report title.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return WAITING_TITLE


