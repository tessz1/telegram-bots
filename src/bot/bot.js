const TelegramApi = require("node-telegram-bot-api");
const { sendWelcomeMessage } = require("/command");
const { handleCoursesCommand } = require("/command");
const { handleFaqCommand } = require("/command");
const { handleContactCommand } = require("/command");
const { handleEnrollCommand } = require("/command");
const { handleStore } = require("/command");
const { handleConsultation } = require("/command");
const { handleDiagnostic } = require("/command");

const token = process.env.TELEGRAM_BOT_TOKEN; // token for authentication(.env file).
const bot = new TelegramApi(token, { polling: true });

bot.setMyCommands([ // commands for the bot
  { command: "/start", description: "Приветствие" },
  { command: "/courses", description: "Посмотреть список доступных курсов" },
  { command: "/enroll", description: "Записаться на курс" },
  { command: "/faq", description: "Часто задаваемые вопросы" },
  { command: "/contact", description: "Связаться с Ариной" },
  { command: "/store", description: "Магический магазин" },
  { command: "/consultation", description: "Консультация" },
  { command: "/diagnostic", description: "Диагностика" },
]);

const start = () => { // start the bot from the beginning
    bot.on("message", async (msg) => {
      const text = msg.text;
      const chatId = msg.chat.id;
  
      if (text === "/start") {
        await sendWelcomeMessage(chatId);
      } else if (text === "/courses") {
        await handleCoursesCommand(chatId);
      } else if (text === "/faq") {
        await handleFaqCommand(chatId);
      } else if (text === "/contact") {
        await handleContactCommand(chatId);
      } else if (text === "/enroll") {
        await handleEnrollCommand(chatId);
      } else if (text === "/store") {
        await handleStore(chatId);
      } else if (text === "/consultation") {
        await handleConsultation(chatId);
      } else if (text === "/diagnostic") {
        await handleDiagnostic(chatId);
      } else {
        await bot.sendMessage(chatId, "Извините, я не понимаю эту команду.");
      }
    });
}

start()

// The bot will start listening for incoming messages and execute the appropriate command handler based on the received text.
////////////////////////////////