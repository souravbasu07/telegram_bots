import axios from "axios";
import { session, Telegraf } from "telegraf";
import { Stage, WizardScene } from "telegraf/scenes";

const BOT_TOKEN = "7486235972:AAEQuXEok6UxleqPwsq4gAwGrFYPf30iyvM";

const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: { q: '53.1,-0.13' },
    headers: {
        'x-rapidapi-key': '54d0da9d66mshc2a6cd54a2f8aa0p1d3ee9jsn4df04c0d3d1d',
        'x-rapidapi-host': 'weatherapi-com.p.rapidapi.com'
    }
};

const WeatherWizard = new WizardScene(
    "weatherwizard",
    async (ctx) => {
        ctx.reply("Enter the city")
    },
    async (ctx) => {
        try {
            const response = await axios.request(options);
            console.log(response.data);
        } catch (error) {
            console.error(error);
        }
        return ctx.scene.leave();
    }
)

const bot = new Telegraf(BOT_TOKEN);
const stage = new Stage([WeatherWizard]);
bot.use(session());
bot.use(stage.middleware());
bot.command("weather", ctx => {
    ctx.reply("Welcome to Weather bot!");
    ctx.scene.enter("weatherwizard");
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));