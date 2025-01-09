const { inlineKeyboard } = require("telegraf/markup");

const { bot } = require("./bot");

const { sendMessage } = require("./sendMessage");

const faqList = require("./faqList"); // faq list for messages
const coursesList = require("../../coursesList");

bot.context = {};

const deletePreviousMessage = async (chatId) => {
  // fuction delete previous message in chat list
  if (bot.context[chatId] && bot.context[chatId].lastMessageId) {
    try {
      await bot.deleteMessage(chatId, bot.context[chatId].lastMessageId);
    } catch (error) {
      console.error("Failed to delete message:", error.message);
    }
  }
};

const sendWelcomeMessage = async (chatId) => {
  await deletePreviousMessage(chatId);
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

const handleCoursesCommand = async (chatId) => {
  // handle courses comman
  await deletePreviousMessage(chatId);
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
  // handle course details
  await deletePreviousMessage(chatId);
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
          {
            text: "Перейти к записи",
            callback_data: `enroll_${courseIndex}`,
          },
          { text: "Отмена", callback_data: "back" },
        ],
      ],
    },
  });
  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
};

handleFaqCommand = async (chatId) => {
  await deletePreviousMessage(chatId);
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
    `Ответы на часто задаваемые вопроосы\n\n${faqMessage}`,
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

handleContactCommand = async (chatId) => {
  await deletePreviousMessage(chatId);

  const sentMessage = await bot.sendMessage(
    chatId,
    "Контакт: @Kaira_21\n\nДля записи на диагностику и личную консультацию, пожалуйста, напишите помощнику: @Arina_manager1",
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


    const sentMessage = await bot.sendMessage(
      chatId,
      "Выберите курс для записи",
      {
        reply_markup: {
          inline_keyboard: enrollButtons.map((button) => [button]),
        }
      }
  }))
  bot.context[chatId] = { lastMessageId: sentMessage.message_id };
}