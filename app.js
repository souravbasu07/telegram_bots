import { Markup, Telegraf, session } from "telegraf";
import { Stage, WizardScene } from "telegraf/scenes";

const BOT_TOKEN = "7486235972:AAEQuXEok6UxleqPwsq4gAwGrFYPf30iyvM";

async function fetchSemester(studentId) {
    try {
        const res = await fetch(`http://software.diu.edu.bd:8006/result/semesterList`);
        const allSemesters = await res.json();

        const studentInfo = await fetchStudent(studentId);

        const filteredSemesters = allSemesters.filter(semester => semester.semesterId >= studentInfo.semesterId);

        const markupButtons = filteredSemesters.map((semester) => Markup.button.callback(`${semester.semesterName}-${semester.semesterYear}`, semester.semesterId))

        let buttons = [];

        for (let i = 0; i < markupButtons.length; i += 2) {
            const newButtonsArray = markupButtons.slice(i, i + 2);

            buttons.push(newButtonsArray);
        };

        const keyboards = Markup.inlineKeyboard(buttons.map(buttonsGroup => buttonsGroup));

        return keyboards;
    } catch (error) {
        console.log(error);
    }
};

async function fetchStudent(studentId) {
    try {
        const res = await fetch(`http://software.diu.edu.bd:8006/result/studentInfo?studentId=${studentId}`);
        const data = await res.json();

        return data;
    } catch (error) {
        console.log(error);
    }
}

async function fetchResult(studentId, semester) {
    console.log(semester, studentId);
    try {
        const res = await fetch(`http://software.diu.edu.bd:8006/result?grecaptcha=&semesterId=${semester}&studentId=${studentId}`);
        const resultsData = await res.json();

        console.log(resultsData);

        return resultsData;
    } catch (error) {
        console.log(error);
    }
};

const ResultWizard = new WizardScene(
    "resultwizard",
    (ctx) => {
        ctx.reply("Enter your Student ID");

        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.wizard.state.studentId = ctx.message.text;
        try {
            const studentInfo = await fetchStudent(ctx.message.text);
            console.log(studentInfo);
            ctx.wizard.state.studentInfo = studentInfo;

            const keyboard = await fetchSemester(ctx.message.text);
            ctx.reply("Select your semester", keyboard);
        } catch (error) {
            console.log(error);
        }

        return ctx.wizard.next();
    },
    async (ctx) => {
        const semester = ctx.callbackQuery.data;
        ctx.wizard.state.semester = semester;

        console.log(ctx.wizard.state.studentId);

        console.log(semester);
        try {
            const resultData = await fetchResult(ctx.wizard.state.studentId, semester);
            console.log(resultData);

            if (!resultData.length) {
                ctx.reply("Result not found! Try again!");
                return ctx.scene.leave();
            }

            const studentInfo = resultData.map((result) => {
                return `Subject Name: ${result.courseTitle}\ncourse ID: ${result.courseId}\nCGPA: ${result.cgpa}`
            }).join("\n\n")

            ctx.reply(`${ctx.wizard.state.studentInfo.studentName}\n\n${studentInfo}`);
        } catch (error) {
            console.log(error);
        }

        return ctx.scene.leave();
    }
);

const bot = new Telegraf(BOT_TOKEN);
const stage = new Stage([ResultWizard]);
bot.use(session());
bot.use(stage.middleware());
bot.command("result", ctx => {
    ctx.scene.enter("resultwizard")
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));