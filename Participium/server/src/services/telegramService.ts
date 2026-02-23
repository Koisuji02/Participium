import {CONFIG} from "@config"
import { Telegraf } from "telegraf";
import { getTelegramChatId } from "./authService";
const bot = new Telegraf(CONFIG.TELEGRAM_CONFIG.TOKEN);

export async function sendTelegramMessage(userID: number, message: string): Promise<void> {
    const chatId = await getTelegramChatId(userID);
    if (chatId) {
        await bot.telegram.sendMessage(chatId, message);
    } else {
        console.warn(`No Telegram chat ID found for user ID: ${userID}`);
    }
}