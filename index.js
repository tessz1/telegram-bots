const TelegramApi = require("node-telegram-bot-api");
const coursesList = require("./coursesList");
const db = require("./database");
const express = require("express");
const faqList = require("./faqList");
require("dotenv").config();
const app = express();
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
  { command: "/store", description: "Магический магазин" },
  { command: "/consultation", description: "Консультация" },
  { command: "/diagnostic", description: "Диагностика" },
]);

bot.context = {};

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

  bot.on("callback_query", async (query) => {
    const username = query.from.username;
    const firstName = query.from.first_name;
    const lastName = query.from.last_name;
    const date = new Date().toISOString();
    const userID = query.from.id;

    const insertQuery = `INSERT INTO users(userId, username, firstname, lastname, date)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
    username=excluded.username,
    firstName=excluded.firstName,
    lastName=excluded.lastName,
    date=excluded.date`;

    db.run(
      insertQuery,
      [userID, username, firstName, lastName, date],
      function (err) {
        if (err) {
          return console.error(err.message);
        }
      }
    );

    const chatId = query.message.chat.id;
    const data = query.data;

    if (bot.context[chatId] && bot.context[chatId].lastMessageId) {
      try {
        await bot.deleteMessage(chatId, bot.context[chatId].lastMessageId);
        delete bot.context[chatId].lastMessageId;
      } catch (error) {
        console.error("Failed to delete message:", error.message);
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
      case "handleConsultation":
        await handleConsultation(chatId);
        break;
      case "handleDiagnostic":
        await handleDiagnostic(chatId);
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
      console.error("Failed to delete message:", error.message);
    }
  }
  const sentMessage = await bot.sendMessage(
    chatId,
    "Приветствую тебя, мой гость!🌟 \n\nПроходи, присаживайся удобно в кресло перед камином. Я налью тебе ароматный 🍵 чай и ты расскажешь мне все, что тебя беспокоит… Если есть желание помочь себе самому или своим близким, я научу тебя.\n\nМы вместе окунёмся в Мир Волшебства! Начнём?",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📚 Посмотреть список доступных курсов",
              callback_data: "view_courses",
            },
          ],
          [{ text: "✏️ Записаться на курс", callback_data: "enroll_course" }],
          [{ text: "❓ Часто задаваемые вопросы", callback_data: "view_faq" }],
          [
            {
              text: "🗣 Запись на консультацию",
              callback_data: "handleConsultation",
            },
          ],
          [
            {
              text: "🔍 Записать на диагностику",
              callback_data: "handleDiagnostic",
            },
          ],
          [
            {
              text: " 📞 Связь с нами",
              callback_data: "contact_arina",
            },
          ],
        ],
      },
    }
  );

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleConsultation = async (chatId) => {
  const sentMessage = await bot.sendMessage(
    chatId,
    "На личной консультации опредеяется проблема негативных влияний, пути их устранения.\n\nДля записи напишите помощнику @Arina_manager1\n\nСтоимость консультации 2000 рублей.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Отмена",
              callback_data: "back",
            },
          ],
        ],
      },
    }
  );

  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

const handleDiagnostic = async (chatId) => {
  const sentMessage = await bot.sendMessage(
    chatId,
    "Полный анализ и дагностика текущих энергетических потоков.\n\nОпределение блоков. Диагностика негативных магических воздействий.\n\nДиагностика: \n\n✅ Воске\n\n✅ Оракле\n\n✅ Свинце\n\nДля записи напишите помощнику @Arina_manager1\n\nСтоимость диагностики 2000 рублей.",
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

const handleStore = async (chatId) => {
  const sentMessage = await bot.sendMessage(chatId, "Скоро 🔜");

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
      console.error("Failed to delete message:", error.message);
    }
  }

  const sentMessage = await bot.sendMessage(
    chatId,
    "Контакт:  @Kaira_21\n\nДля записи на диагностику и личную консультацию, пожалуйста, напишите помощнику: @Arina_manager1",
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

  await bot.sendInvoice(
    chatId,
    `Оплата курса "${course.title}"`,
    `Запись на курс "${course.title}".`,
    `course_${courseIndex}`,
    providerToken,
    "RUB",
    [{ label: `Оплата курса "${course.title}"`, amount: 2000 * 100 }],
    []
  );
};

start();

// Setting up Express server to get user count
app.get("/user-count", (req, res) => {
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (err) {
      res.status(500).send("Error");
      return console.error(err.message);
    }
    res.send(`Total users: ${row.count}`);
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
