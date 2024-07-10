const TelegramApi = require("node-telegram-bot-api");
const coursesList = require("./coursesList");
const faqList = require("./faqList");
require("dotenv").config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const providerToken = process.env.PROVIDER_TOKEN;
const inviteLink = process.env.TELEGRAM_INVITE_LINK;

const bot = new TelegramApi(token, { polling: true });

bot.setMyCommands([
  { command: "/start", description: "Приветствие" },
  { command: "/courses", description: "Посмотреть список доступных курсов" },
  { command: "/enroll", description: "Записаться на курс" },
  { command: "/faq", description: "Часто задаваемые вопросы" },
  { command: "/contact", description: "Связаться с Ариной" },
]);

bot.context = {}; // Контекст для хранения последних сообщений

const start = () => {
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
    } else {
      await bot.sendMessage(chatId, "Извините, я не понимаю эту команду.");
    }
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (bot.context[chatId] && bot.context[chatId].lastMessageId) {
      try {
        await bot.deleteMessage(chatId, bot.context[chatId].lastMessageId);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }

    switch (data) {
      case "view_courses":
        await handleCoursesCommand(chatId);
        break;
      case "enroll_course":
        await handleEnrollCommand(chatId);
        break;
      case "view_faq":
        await handleFaqCommand(chatId);
        break;
      case "contact_arina":
        await handleContactCommand(chatId);
        break;
      case "back":
        await sendWelcomeMessage(chatId);
        break;
      default:
        if (data.startsWith("course_")) {
          await handleCourseDetails(chatId, data);
        } else if (data.startsWith("enroll_")) {
          await handleEnrollConfirmation(chatId, data);
        } else if (data.startsWith("confirm_")) {
          await handleSendInvoice(chatId, data);
        }
        break;
    }
  });

  bot.on("pre_checkout_query", async (query) => {
    await bot.answerPreCheckoutQuery(query.id, true);
  });

  bot.on("successful_payment", async (msg) => {
    const chatId = msg.chat.id;
    const courseIndex = parseInt(
      msg.successful_payment.invoice_payload.split("_")[1],
      10
    );
    const course = coursesList[courseIndex];

    await bot.sendMessage(
      chatId,
      `Спасибо за оплату! Вы успешно записались на курс: ${course.title}`
    );

    await bot.sendMessage(
      chatId,
      `Присоединяйтесь к нашему закрытому каналу: ${inviteLink}`
    );
  });
};

const sendWelcomeMessage = async (chatId) => {
  if (bot.context[chatId] && bot.context[chatId].lastMessageId) {
    try {
      await bot.deleteMessage(chatId, bot.context[chatId].lastMessageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  }

  const sentMessage = await bot.sendMessage(
    chatId,
    "Добро пожаловать! Выберите действие:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Посмотреть список доступных курсов",
              callback_data: "view_courses",
            },
          ],
          [{ text: "Записаться на курс", callback_data: "enroll_course" }],
          [{ text: "Часто задаваемые вопросы", callback_data: "view_faq" }],
          [{ text: "Связаться с Ариной", callback_data: "contact_arina" }],
        ],
      },
    }
  );

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleCoursesCommand = async (chatId) => {
  const courseButtons = coursesList.map((course, index) => ({
    text: course.title,
    callback_data: `course_${index}`,
  }));

  const sentMessage = await bot.sendMessage(chatId, "Выберите курс:", {
    reply_markup: {
      inline_keyboard: courseButtons
        .map((button) => [button])
        .concat([[{ text: "Назад", callback_data: "back" }]]),
    },
  });

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleCourseDetails = async (chatId, data) => {
  const courseIndex = parseInt(data.split("_")[1], 10);
  const course = coursesList[courseIndex];
  let courseDetails = `${course.title}\n\n`;
  course.items.forEach((item) => {
    courseDetails += `   - ${item}\n`;
  });

  const sentMessage = await bot.sendMessage(chatId, courseDetails, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Перейти к записи", callback_data: `enroll_${courseIndex}` },
          { text: "Отмена", callback_data: "back" },
        ],
      ],
    },
  });

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleFaqCommand = async (chatId) => {
  const faqMessage = faqList
    .map((faq, index) => {
      let faqDetails = `${index + 1}. ${faq.title}\n`;
      faq.items.forEach((item) => {
        faqDetails += `   - ${item}\n`;
      });
      return faqDetails;
    })
    .join("\n\n");

  const sentMessage = await bot.sendMessage(
    chatId,
    `Ответы на часто задаваемые вопросы:\n\n${faqMessage}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Назад",
              callback_data: "back",
            },
          ],
        ],
      },
    }
  );
  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleContactCommand = async (chatId) => {
  if (bot.context[chatId] && bot.context[chatId].lastMessageId) {
    try {
      await bot.deleteMessage(chatId, bot.context[chatId].lastMessageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  }

  const sentMessage = await bot.sendMessage(chatId, "Чтобы связаться @Kaira_21", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Назад",
            callback_data: "back",
          },
        ],
      ],
    },
  });

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleEnrollCommand = async (chatId) => {
  const enrollButtons = coursesList.map((course, index) => ({
    text: course.title,
    callback_data: `enroll_${index}`,
  }));

  const sentMessage = await bot.sendMessage(
    chatId,
    "Выберите курс для записи:",
    {
      reply_markup: {
        inline_keyboard: enrollButtons.map((button) => [button]),
      },
    }
  );

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleEnrollConfirmation = async (chatId, data) => {
  const courseIndex = parseInt(data.split("_")[1], 10);
  const course = coursesList[courseIndex];

  const sentMessage = await bot.sendMessage(
    chatId,
    `Вы выбрали курс "${course.title}". Подтвердите запись на курс.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Подтвердить", callback_data: `confirm_${courseIndex}` }],
          [{ text: "Отмена", callback_data: "back" }],
        ],
      },
    }
  );
  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleSendInvoice = async (chatId, data) => {
  const courseIndex = parseInt(data.split("_")[1], 10);
  const course = coursesList[courseIndex];
  const payload = `invoice_${courseIndex}`;
  const description = "Полное руководство по магическому отливанию свинца";
  const coursePrice = 10000;
  const currency = "RUB";
  const prices = [{ label: course.title, amount: coursePrice }];

  try {
    await bot.sendInvoice(
      chatId,
      course.title,
      description,
      payload,
      providerToken,
      currency,
      prices,
      {
        need_name: true,
        send_email_to_provider: true,
        provider_data: JSON.stringify({
          receipt: {
            items: [
              {
                description: course.title,
                quantity: "1.00",
                amount: {
                  value: (coursePrice / 100).toFixed(2),
                  currency: "RUB",
                },
                vat_code: 1,
              },
            ],
          },
        }),
        pay: true,
      }
    );
  } catch (error) {
    console.error("Error sending invoice:", error);
  }
};

start();
