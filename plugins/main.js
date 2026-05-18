cmd({
    pattern: "ping",
    alias: ["speed", "pong"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (socket, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = Date.now();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        // Ensure reaction and text emojis are different
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        // Send reaction to user message
        await socket.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = Date.now();
        const responseTime = end - start; // in milliseconds

        const text = `> _*Powered By Manaofc*_ ⚡\n\n🏓 *Pong!* ${reactionEmoji}\n⏱️ Response Time: *${responseTime} ms*`;

        // Send image with caption
        await socket.sendMessage(from, {
            image: { url: defaultConfig.IMAGE_PATH },
            caption: text
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});

cmd({
  pattern: "menu",
  react: "📃",
  alias: ["panel","list","commands"],
  desc: "Get bot's command list.",
  category: "main",
  use: '.menu',
  filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

if(os.hostname().length == 12 ) hostname = 'replit'
else if(os.hostname().length == 36) hostname = 'heroku'
else if(os.hostname().length == 8) hostname = 'koyeb'
else hostname = os.hostname()
let monspace ='```'
const buttons = [
{buttonId: prefix + 'downmenu' , buttonText: {displayText: 'DOWNLOAD MENU'}, type: 1},
{buttonId: prefix + 'searchmenu' , buttonText: {displayText: 'SEARCH MENU'}, type: 1},
{buttonId: prefix + 'convertmenu' , buttonText: {displayText: 'CONVERT MENU'}, type: 1},
{buttonId: prefix + 'logomenu' , buttonText: {displayText: 'LOGO MENU'}, type: 1},
{buttonId: prefix + 'othersmenu' , buttonText: {displayText: 'OTHERS MENU'}, type: 1},
{buttonId: prefix + 'ownermenu' , buttonText: {displayText: 'OWNER MENU'}, type: 1},
{buttonId: prefix + 'moviemenu' , buttonText: {displayText: 'MOVIE MENU'}, type: 1},
]
const buttonMessage = {
  image: defaultConfig.IMAGE_PATH,
  caption: `
*╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」──○●►*
*│◈ ᴏᴡɴᴇʀ : manaofc*
*│◈ ᴠᴇʀꜱɪᴏɴ : V.6*
*│◈ ʀᴜɴᴛɪᴍᴇ : ${runtime(process.uptime())}*
*│◈ ʀᴀᴍ ᴜꜱᴀɢᴇ : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB*
*╰─────────────────○●►*
`,
  footer: '> _*Powered By Manaofc*_ ',
  buttons: buttons,
  headerType: 4
}
return await socket.buttonMessage(from, buttonMessage, mek)
} catch (e) {
reply('*Error !!*')
console.log(e)
}
})

cmd({
    pattern: "downmenu",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*📥 MANAOFC LITE DOWNLOAD MENU. 📥*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'download'){
  if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};

let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
  let buttonMessaged = {
    image: defaultConfig.IMAGE_PATH,
    caption: menuc,
    footer: '> _*Powered By Manaofc*_ ',
    headerType: 4,
    buttons: generatebutton
  };
  return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
  reply('*ERROR !!*')
  console.log(e)
}
})

cmd({
    pattern: "searchmenu",
    react: "🔍",
    dontAddCommandList: true,
    filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*🔍 MANAOFC LITE SEARCH MENU. 🔍*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'search'){
  if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
  let buttonMessaged = {
    image: defaultConfig.IMAGE_PATH,
    caption: menuc,
    footer: '> _*Powered By Manaofc*_ ',
    headerType: 4,
    buttons: generatebutton
  };
  return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
  reply('*ERROR !!*')
  console.log(e)
}
})

cmd({
    pattern: "convertmenu",
    react: "🪄",
    dontAddCommandList: true,
    filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*🪄 MANAOFC LITE  CONVERT MENU. 🪄*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'convert'){
  if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
  let buttonMessaged = {
    image: defaultConfig.IMAGE_PATH,
    caption: menuc,
    footer: '> _*Powered By Manaofc*_ ',
    headerType: 4,
    buttons: generatebutton
  };
  return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
  reply('*ERROR !!*')
  console.log(e)
}
})

cmd({
  pattern: "logomenu",
  react: "🌌",
  dontAddCommandList: true,
  filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {
let menuc = `
*🌌 MANAOFC LITE LOGO MENU. 🌌*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'logo'){
if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
let buttonMessaged = {
  image: defaultConfig.IMAGE_PATH,
  caption: menuc,
  footer: '> _*Powered By Manaofc*_ ',
  headerType: 4,
  buttons: generatebutton
};
return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
reply('*ERROR !!*')
console.log(e)
}
})
  
cmd({
    pattern: "othersmenu",
    react: "🎐",
    dontAddCommandList: true,
    filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*🎐  MANAOFC LITE OTHER MENU. 🎐*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'others'){
if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
  let buttonMessaged = {
    image: defaultConfig.IMAGE_PATH,
    caption: menuc,
    footer: '> _*Powered By Manaofc*_ ',
    headerType: 4,
    buttons: generatebutton
  };
  return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
  reply('*ERROR !!*')
  console.log(e)
}
})

cmd({
  pattern: "ownermenu",
  react: "🗣️",
  dontAddCommandList: true,
  filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*🗣️ MANAOFC LITE OWNER MENU. 🗣️*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'owner'){
if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
let buttonMessaged = {
  image: defaultConfig.IMAGE_PATH,
  caption: menuc,
  footer: '> _*Powered By Manaofc*_ ',
  headerType: 4,
  buttons: generatebutton
};
return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
reply('*ERROR !!*')
console.log(e)
}
})

cmd({
  pattern: "moviemenu",
  react: "🎬",
  dontAddCommandList: true,
  filename: __filename
},
async(socket, mek, m, { from, prefix, q, reply }) => {
  try {

let menuc = `
*🎬MANAOFC LITE MOVIE MENU. 🎬*\n\n`
for (let i=0;i<commands.length;i++) { 
if(commands[i].category === 'movie'){
if(!commands[i].dontAddCommandList){
menuc += `*╭──────────────────❥*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰──────────────────❥*\n\n
`
}}};
let generatebutton = [{
    buttonId: `${prefix}ping`,
    buttonText: {
        displayText: 'GET BOT\'S PING'
    },
    type: 1
  }]
let buttonMessaged = {
  image: defaultConfig.IMAGE_PATH,
  caption: menuc,
  footer: '> _*Powered By Manaofc*_ ',
  headerType: 4,
  buttons: generatebutton
};
return await socket.buttonMessage(from, buttonMessaged, mek);
} catch (e) {
reply('*ERROR !!*')
console.log(e)
}
})

