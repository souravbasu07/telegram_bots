const BOT_TOKEN = "7486235972:AAEQuXEok6UxleqPwsq4gAwGrFYPf30iyvM";

import { Telegraf, Markup, Format, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { bold } from 'telegraf/format';
import { Stage, WizardScene } from 'telegraf/scenes';

let correctAnswer;

const pollWizard = new WizardScene(
    "pollwizard",
    (ctx) => {
        const queryData = ctx.callbackQuery.data;
        ctx.wizard.state.type = queryData;

        if (queryData === "create_poll") {
            ctx.reply("Enter the question to create the poll");
        } else if (queryData === "create_quiz") {
            ctx.reply("Enter the question to create the quiz");
        } else {
            ctx.reply("Invalid type selected!");

            return ctx.scene.leave();
        }

        return ctx.wizard.next();
    },
    (ctx) => {
        ctx.wizard.state.question = ctx.message.text;
        ctx.reply("Enter the answers divided by comma (,)")

        return ctx.wizard.next();
    },
    (ctx) => {
        const pollOptions = ctx.message.text.split(",").map(option => option.trim());
        if (ctx.wizard.state.type === "create_poll") {
            ctx.replyWithPoll(ctx.wizard.state.question, pollOptions, {
                is_anonymous: false
            });
        } else if (ctx.wizard.state.type === "create_quiz") {
            ctx.wizard.state.options = pollOptions;
            ctx.reply("Which is the correct answer ? Enter the number.");

            return ctx.wizard.next();
        }
    },
    (ctx) => {
        const correctAnswerIndex = parseInt(ctx.message.text) - 1;
        correctAnswer = correctAnswerIndex;
        if (isNaN(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex > ctx.wizard.state.options.length - 1) {
            ctx.reply("Invalid option selected!");

            return ctx.scene.leave();
        }
        ctx.replyWithQuiz(ctx.wizard.state.question, ctx.wizard.state.options, {
            correct_option_id: correctAnswerIndex,
            is_anonymous: false
        });

        return ctx.scene.leave();
    }
);

const MathWizard = new WizardScene(
    "mathwizard",
    (ctx) => {
        ctx.reply("Select any math operation", mathKeyboard);

        return ctx.wizard.next();
    },
    (ctx) => {
        const type = ctx.callbackQuery.data;

        ctx.wizard.state.type = type;

        if (type === "sum") {
            ctx.reply("Enter all numbers to add. Use comma(,) after each number.");
        } else if (type === "subtract") {
            ctx.reply("Enter 2 numbers. Subtract 2nd number from 1st. Use comma(,) after each number.");
        } else if (type === "multiply") {
            ctx.reply("Enter all numbers to multiply. Use comma(,) after each number.")
        } else if (type === "divide") {
            ctx.reply("Enter 2 numbers. Divide 1st number by 2nd. Use comma(,) after each number.");
        }

        return ctx.wizard.next();
    },
    (ctx) => {
        const type = ctx.wizard.state.type;

        if (type === "sum") {
            const nums = ctx.message.text.split(",").map(num => parseFloat(num.trim()));
            ctx.reply(add(nums));
        } else if (type === "subtract") {
            const nums = ctx.message.text.split(",").map(num => parseFloat(num.trim()));
            ctx.reply(subtract(nums[0], nums[1]));
        } else if (type === "multiply") {
            const nums = ctx.message.text.split(",").map(num => parseFloat(num.trim()));
            ctx.reply(multiply(nums));
        } else if (type === "divide") {
            const nums = ctx.message.text.split(",").map(num => parseFloat(num.trim()));
            ctx.reply(divide(nums[0], nums[1]));
        }

        return ctx.scene.leave();
    }
)

function add(nums) {
    console.log(nums);
    return nums.reduce((acc, curr) => acc + curr, 0);
};

function subtract(a, b) {
    return a - b;
};

function multiply(nums) {
    return nums.reduce((acc, cur) => acc * cur, 1)
};

function divide(a, b) {
    return a / b;
};

const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("Create poll", "create_poll"),
    Markup.button.callback("Create quiz", "create_quiz"),
    Markup.button.callback("Math Operations", "math_ops")
]);

const mathKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Sum", "sum"),
    Markup.button.callback("Subtract", "subtract"),
    Markup.button.callback("Multiply", "multiply"),
    Markup.button.callback("Divide", "divide")
]);

const stage = new Stage([pollWizard, MathWizard]);

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

bot.use(stage.middleware());

bot.start(ctx => {
    ctx.reply("Select an option", keyboard);
});

bot.action(/create_poll|create_quiz/, (ctx) => {
    ctx.scene.enter("pollwizard");
});

bot.action("math_ops", (ctx) => {
    ctx.scene.enter("mathwizard");
});

bot.hears('mention', (ctx) => {
    console.log(ctx.from)
    ctx.reply(Format.mention(bold`${ctx.from.first_name}`, ctx.from))
});

bot.on("poll_answer", (ctx) => {
    const answer = ctx.pollAnswer;

    console.log(answer);

    if (answer.option_ids[0] === correctAnswer) {
        ctx.telegram.sendMessage(answer.user.id, `Congrats! [${answer.user.first_name}](tg://user?id=${answer.user.id})`,
            { parse_mode: 'Markdown' })
    } else {
        ctx.telegram.sendMessage(answer.user.id, "Please try again!")
    }
})

// bot.action("create_quiz", ctx => {
//     ctx.scene.enter("pollwizard")
// });

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));