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
    try {
        const res = await fetch(`http://software.diu.edu.bd:8006/result?grecaptcha=&semesterId=${semester}&studentId=${studentId}`);
        const resultsData = await res.json();

        return resultsData;
    } catch (error) {
        console.log(error);
    }
};

async function fetchAllSemesters(studentId) {
    try {
        const res = await fetch(`http://software.diu.edu.bd:8006/result/semesterList`);
        const allSemesters = await res.json();

        const studentInfo = await fetchStudent(studentId);

        const filteredSemesters = allSemesters.filter(semester => semester.semesterId >= studentInfo.semesterId);

        console.log(filteredSemesters);

        const allResults = [];

        for (const semester of filteredSemesters) {
            const result = await fetchResult(studentId, semester.semesterId);

            if (result.length > 0) {
                allResults.push(result);
            }
        }

        return allResults;
    } catch (error) {
        console.log(error);
    }
}

const ResultWizard = new WizardScene(
    "resultwizard",
    (ctx) => {
        ctx.reply("Enter your Student ID");

        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.wizard.state.studentId = ctx.message.text;
        ctx.reply("Select result type", keyboard);

        return ctx.wizard.next();
    },
    async (ctx) => {
        const type = ctx.callbackQuery.data;
        ctx.wizard.state.type = type;

        const studentId = ctx.wizard.state.studentId;
        const studentInfo = await fetchStudent(studentId);
        ctx.wizard.state.studentInfo = studentInfo;

        if (type === "all") {
            try {
                const allResults = await fetchAllSemesters(studentId);

                for (const results of allResults) {
                    const studentInfo = results.map((result) => {
                        return `Subject Name: ${result.courseTitle}\ncourse ID: ${result.courseId}\ngrade: ${result.gradeLetter}`
                    }).join("\n\n");

                    const semesterName = `${results[0].semesterName}-${results[0].semesterYear}`;

                    const sgpaObj = results.reduce((acc, cur) => {
                        return { totalPoints: acc.totalPoints + (cur.totalCredit * cur.pointEquivalent), totalCredits: acc.totalCredits + cur.totalCredit }
                    }, { totalPoints: 0, totalCredits: 0 })

                    const sgpa = (sgpaObj.totalPoints / sgpaObj.totalCredits).toFixed(2);

                    console.log(semesterName);

                    await ctx.reply(`${ctx.wizard.state.studentInfo.studentName}\n\nSemester Name: ${semesterName}\n\n${studentInfo}\n\nsGPA: ${sgpa}`);
                }

                ctx.reply("Check another result", Markup.inlineKeyboard([Markup.button.callback("Check", "check")]));

                return ctx.scene.leave();

            } catch (error) {
                console.log(error);
            }
        } else if (type === "select") {
            try {
                const keyboard = await fetchSemester(studentId);
                ctx.reply("Select your semester", keyboard);

                return ctx.wizard.next();

            } catch (error) {
                console.log(error);
            }
        } else if (type === "cgpa") {
            try {
                const allResults = await fetchAllSemesters(studentId);
                // console.log(allResults);

                let sgpa = [];

                for (const results of allResults) {
                    const sgpaObj = results.reduce((acc, cur) => {
                        return { totalPoints: acc.totalPoints + (cur.totalCredit * cur.pointEquivalent), totalCredits: acc.totalCredits + cur.totalCredit }
                    }, { totalPoints: 0, totalCredits: 0 })

                    sgpa.push(sgpaObj);
                }

                console.log(sgpa);

                const totalCredits = sgpa.reduce((acc, cur) => acc + cur.totalCredits, 0);
                const totalPoints = sgpa.reduce((acc, cur) => acc + cur.totalPoints, 0);

                const cgpa = (totalPoints / totalCredits).toFixed(2);
                ctx.reply(cgpa);
                ctx.reply("Check another result", Markup.inlineKeyboard([Markup.button.callback("Check", "check")]));

                return ctx.scene.leave();
            } catch (error) {
                console.log(error);
            }
        }

    },
    async (ctx) => {
        if (ctx.wizard.state.type === "select") {
            const semester = ctx.callbackQuery.data;
            ctx.wizard.state.semester = semester;

            try {
                const resultData = await fetchResult(ctx.wizard.state.studentId, semester);

                if (!resultData.length) {
                    ctx.reply("Result not found! Try again!");
                    return ctx.scene.leave();
                }

                const semesterName = `${resultData[0].semesterName}-${resultData[0].semesterYear}`;

                const studentInfo = resultData.map((result) => {
                    return `Subject Name: ${result.courseTitle}\ncourse ID: ${result.courseId}\ngrade: ${result.gradeLetter}`
                }).join("\n\n");

                const sgpaObj = resultData.reduce((acc, cur) => {
                    return { totalPoints: acc.totalPoints + (cur.totalCredit * cur.pointEquivalent), totalCredits: acc.totalCredits + cur.totalCredit }
                }, { totalPoints: 0, totalCredits: 0 })

                const sgpa = (sgpaObj.totalPoints / sgpaObj.totalCredits).toFixed(2);

                ctx.reply(`${ctx.wizard.state.studentInfo.studentName}\n\nSemester Name: ${semesterName}\n\n${studentInfo}\n\nsGPA: ${sgpa}`);

                ctx.reply("Check another result", Markup.inlineKeyboard([Markup.button.callback("Check", "check")]));
            } catch (error) {
                console.log(error);
            }
        };

        return ctx.scene.leave();
    },
);

const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("All Semester", "all"),
    Markup.button.callback("Select Semester", "select"),
    Markup.button.callback("Check cGPA", "cgpa")
]);

const bot = new Telegraf(BOT_TOKEN);
const stage = new Stage([ResultWizard]);
bot.use(session());
bot.use(stage.middleware());
bot.command("result", ctx => {
    ctx.scene.enter("resultwizard")
});

bot.action("check", (ctx) => {
    ctx.scene.enter("resultwizard");
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));