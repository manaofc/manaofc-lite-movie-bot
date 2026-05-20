const { cmd } = require("../command");
const config = require("../config")
cmd(
  {
    pattern: "settings",
    react: "⚙️",
    alias: ["setting", "botsetting"],
    desc: "bot settings change",
    category: "owner",
    use: ".settings - *Bot Settings*",
    filename: __filename,
  },
  async (socket, mek, m, { from, prefix, q, reply }) => {
    try {
      const sections = [
        {
          title: "💫 PREFIX",
          rows: [
            { title: "PREFIX .", rowId: prefix + "set PREFIX ." },
            { title: "PREFIX /", rowId: prefix + "set PREFIX /" },
            { title: "PREFIX ?", rowId: prefix + "set PREFIX ?" },
            { title: "PREFIX !", rowId: prefix + "set PREFIX !" },
            { title: "PREFIX #", rowId: prefix + "set PREFIX #" },
            { title: "PREFIX &", rowId: prefix + "set PREFIX &" },
          ],
        },

        {
          title: "👁️ AUTO VIEW STATUS",
          rows: [
            { title: "✅ Enable Auto View Status", rowId: prefix + "set AUTO_VIEW_STATUS true" },
            { title: "❎ Disable Auto View Status", rowId: prefix + "set AUTO_VIEW_STATUS false" },
          ],
        },

        {
          title: "🛟 AUTO LIKE STATUS",
          rows: [
            { title: "✅ Enable Auto Like Status", rowId: prefix + "set AUTO_LIKE_STATUS true" },
            { title: "❎ Disable Auto Like Status", rowId: prefix + "set AUTO_LIKE_STATUS false" },
          ],
        },

        {
          title: "📱 AUTO RECORDING",
          rows: [
            { title: "✅ Enable Auto Recording", rowId: prefix + "set AUTO_RECORDING true" },
            { title: "❎ Disable Auto Recording", rowId: prefix + "set AUTO_RECORDING false" },
          ],
        },
      ];

      const desc = `⚙️ \`MANISHA-MD-V6 BOT SETTINGS\` ⚙️
    
> ◈ *ᴏᴡɴᴇʀ:* manaofc
> ◈ *ᴠᴇʀꜱɪᴏɴ:* ᴠ.6
`;

      let listset = {
        text: desc,
        footer: '> _*Powered By Manaofc*_ ',
        title: "",
        buttonText: "*🔢 Reply below number*",
        sections,
      };

      await socket.listMessage(from, listset, mek);
    } catch (e) {
      reply("*❌ Error !!*");
      console.log(e);
    }
  }
);

  
cmd({
pattern: "set",
dontAddCommandList: true,
filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {

try {

let args = q.split(" ");

const configKey = args[0]?.toUpperCase();
const configValue = args.slice(1).join(" ");

if (!configKey || !configValue) {
return reply("⚠️ Usage: .set KEY VALUE");
}

if (!config) config = {};

config[configKey] = configValue;

await socket.sendMessage(from,{
text:`✅ *Config Updated*

🔑 Key : ${configKey}
📌 Value : ${configValue}

> _*Powered By Manaofc*_`
},{quoted: mek})

}catch(e){
console.log(e)
reply("❌ Config update failed!")
}

});
