const axios = require('axios');
const yts = require('yt-search');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const os = require('os');
const { Octokit } = require('@octokit/rest');
const moment = require('moment-timezone');
const { File } = require('megajs');
const apkdl = require('./lib/apkdl');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cheerio = require('cheerio');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, getsize, formatBytes, fetchBuffer, formatSize, getFile } = require('./lib/functions');
const Photo360 = require('abir-photo360-apis');
const FormData = require("form-data");

const {
  default: makeWASocket,
  getAggregateVotesInPollMessage,
  useMultiFileAuthState,
  DisconnectReason,
  getDevice,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  getContentType,
  Browsers,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateForwardMessageContent,
  proto,
  delay
} = require('baileys');



// GitHub Octokit initialization
let octokit;
if (process.env.GITHUB_TOKEN) {
    octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });
}
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

// Memory optimization: Use weak references for sockets
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';

// Memory optimization: Cache frequently used data
let adminCache = null;
let adminCacheTime = 0;
const ADMIN_CACHE_TTL = 300000; // 5 minutes

// Initialize directories
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// Memory optimization: Improved admin loading with caching
function loadAdmins() {
    try {
        const now = Date.now();
        if (adminCache && now - adminCacheTime < ADMIN_CACHE_TTL) {
            return adminCache;
        }
        
        if (fs.existsSync(defaultConfig.ADMIN_LIST_PATH)) {
            adminCache = JSON.parse(fs.readFileSync(defaultConfig.ADMIN_LIST_PATH, 'utf8'));
            adminCacheTime = now;
            return adminCache;
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

// Memory optimization: Clean up unused variables and optimize loops
async function cleanDuplicateFiles(number) {
    try {
        if (!octokit) return;
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith(`creds_${sanitizedNumber}_`) && file.name.endsWith('.json')
        ).sort((a, b) => {
            const timeA = parseInt(a.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
            const timeB = parseInt(b.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
            return timeB - timeA;
        });

        // Keep only the first (newest) file, delete the rest
        if (sessionFiles.length > 1) {
            for (let i = 1; i < sessionFiles.length; i++) {
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: `session/${sessionFiles[i].name}`,
                    message: `Delete duplicate session file for ${sanitizedNumber}`,
                    sha: sessionFiles[i].sha
                });
                console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }
    } catch (error) {
        console.error(`Failed to clean duplicate files for ${number}:`, error);
    }
}

// Memory optimization: Reduce memory usage in message sending
async function sendAdminConnectMessage(socket, number) {
    const admins = loadAdmins();
    const caption = `Bot Connected
    
    📞 Number: ${number}
    
    Bots: Connected
    
    > _*Powered By Manaofc*_`;

    // Send messages sequentially to avoid memory spikes
    for (const admin of admins) {
        try {
            await socket.sendMessage(
                `${admin}@s.whatsapp.net`,
                {
                    image: { url: defaultConfig.IMAGE_PATH },
                    caption
                }
            );
            // Add a small delay to prevent rate limiting and memory buildup
            await delay(100);
        } catch (error) {
            console.error(`Failed to send connect message to admin ${admin}:`, error);
        }
    }
}


// Memory optimization: Throttle status handlers
function setupStatusHandlers(socket, userConfig) {
    let lastStatusInteraction = 0;
    const STATUS_INTERACTION_COOLDOWN = 10000; // 10 seconds
    
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant) return;
        
        // Throttle status interactions to prevent spam
        const now = Date.now();
        if (now - lastStatusInteraction < STATUS_INTERACTION_COOLDOWN) {
            return;
        }

        try {
            if (userConfig.AUTO_RECORDING === 'true' && message.key.remoteJid) {
                await socket.sendPresenceUpdate("recording", message.key.remoteJid);
            }

            if (userConfig.AUTO_VIEW_STATUS === 'true') {
                let retries = parseInt(userConfig.MAX_RETRIES) || 3;
                while (retries > 0) {
                    try {
                        await socket.readMessages([message.key]);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to read status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (parseInt(userConfig.MAX_RETRIES) || 3 - retries));
                    }
                }
            }

            if (userConfig.AUTO_LIKE_STATUS === 'true') {
                const emojis = Array.isArray(userConfig.AUTO_LIKE_EMOJI) ? 
                    userConfig.AUTO_LIKE_EMOJI : defaultConfig.AUTO_LIKE_EMOJI;
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                let retries = parseInt(userConfig.MAX_RETRIES) || 3;
                while (retries > 0) {
                    try {
                        await socket.sendMessage(
                            message.key.remoteJid,
                            { react: { text: randomEmoji, key: message.key } },
                            { statusJidList: [message.key.participant] }
                        );
                        lastStatusInteraction = now;
                        console.log(`Reacted to status with ${randomEmoji}`);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to react to status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (parseInt(userConfig.MAX_RETRIES) || 3 - retries));
                    }
                }
            }
        } catch (error) {
            console.error('Status handler error:', error);
        }
    });
}

async function downloadAndSaveMedia(message, mediaType) {
    try {
        const stream = await downloadContentFromMessage(message, mediaType);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
    } catch (error) {
        //console.error('Download Media Error:', error);
        throw error;
    }
}
// Setup command handlers for a single socket/session
function setupCommandHandlers(socket, number, userConfig) {
    const commandCooldowns = new Map();
    const COMMAND_COOLDOWN = 1000; // 1 second per user

    // Command registry
    const commands = [];

    function cmd(info, func) {
        info.function = func;
        if (!info.desc) info.desc = "";
        if (!info.category) info.category = "misc";
        if (!info.filename) info.filename = "Not Provided";
        if (!info.fromMe) info.fromMe = false;
        if (!info.dontAddCommandList) info.dontAddCommandList = false;
        commands.push(info);
        return info;
    }

  //====================
  const cos = '```';
    const basePath = path.join(__dirname, "database");
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath);

    function ensureFolder(folder) {
        const folderPath = path.join(basePath, folder);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
    }

    function readJSON(folder, file, defaultData = []) {
        ensureFolder(folder);
        const filePath = path.join(basePath, folder, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    function writeJSON(folder, file, data) {
        ensureFolder(folder);
        const filePath = path.join(basePath, folder, file);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ---------------- CMD STORE ----------------
    async function updateCMDStore(MsgID, CmdID) {
        try {
            let olds = readJSON("Non-Btn", "data.json", []);
            olds.push({ [MsgID]: CmdID });
            writeJSON("Non-Btn", "data.json", olds);
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async function isbtnID(MsgID) {
        try {
            let olds = readJSON("Non-Btn", "data.json", []);
            return olds.some((item) => item[MsgID]);
        } catch {
            return false;
        }
    }

    async function getCMDStore(MsgID) {
        try {
            let olds = readJSON("Non-Btn", "data.json", []);
            for (const item of olds) {
                if (item[MsgID]) return item[MsgID];
            }
            return null;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    function getCmdForCmdId(CMD_ID_MAP, cmdId) {
        const result = CMD_ID_MAP.find((entry) => entry.cmdId === cmdId);
        return result ? result.cmd : null;
    }
// ---------------- BUTTON MESSAGE -----------------

const NON_BUTTON = true; // Implement a switch to on/off this feature...

socket.buttonMessage = async (jid, msgData, quotemek) => {

if (!NON_BUTTON) {
          await socket.sendMessage(jid, msgData);
        } else {

let result = "";
const CMD_ID_MAP = [];

msgData.buttons.forEach((button, bttnIndex) => {

const mainNumber = `${bttnIndex + 1}`;

result += `\n◈ *${mainNumber} - ${button.buttonText.displayText}*`;

CMD_ID_MAP.push({
cmdId: mainNumber,
cmd: button.buttonId
});

});

const buttonMessage = `

${msgData.caption || msgData.text}

*╭─────────────────❥➻*
*╎*  ${cos}🔢 Reply Below Number:${cos}
*╰─────────────────❥➻*

${result}

${msgData.footer || ""}
`;

const btnimg = msgData.image
? { url: msgData.image }
: { url: defaultConfig.IMAGE_PATH };

const imgmsg = await socket.sendMessage(
jid,
{ image: btnimg, caption: buttonMessage },
{ quoted: quotemek }
);

await updateCMDStore(imgmsg.key.id, CMD_ID_MAP);
}
};


// ---------------- LIST MESSAGE -----------------
      socket.listMessage = async (jid, msgData, quotemek) => {
        if (!NON_BUTTON) {
          await socket.sendMessage(jid, msgData);
        } else {
          let result = "";
          const CMD_ID_MAP = [];

          msgData.sections.forEach((section, sectionIndex) => {
            const mainNumber = `${sectionIndex + 1}`;
            result += `\n*${mainNumber} :* ${section.title}\n`;

            section.rows.forEach((row, rowIndex) => {
              const subNumber = `${mainNumber}.${rowIndex + 1}`;
              const rowHeader = `◦  ${subNumber} - ${row.title}`;
              result += `${rowHeader}\n`;
              CMD_ID_MAP.push({ cmdId: subNumber, cmd: row.rowId });
            });
          });

          const listimg = msgData.image
            ? { url: msgData.image }
            : { url: defaultConfig.IMAGE_PATH };

          const listMessage = `
${msgData.text}

*╭─────────────────❥➻*
*╎*  ${cos}🔢 Reply Below Number:${cos}
*╰─────────────────❥➻*

${result}

${msgData.footer}`;

          const text = await socket.sendMessage(
            jid,
            { image: listimg, caption: listMessage },
            { quoted: quotemek || mek }
          );

          await updateCMDStore(text.key.id, CMD_ID_MAP);
        }
      };
////////////////////////////////////////
//////////// ( COMMAND ADD ) ///////////
///////////////////////////////////////

                ///////////////////
////////////// MAIN COMMAND ////////////////
            ////////////////////
  
                ///////////////////
////////////// DOWNLOAD COMMAND ////////////////
            ////////////////////

    /* ================== SONG SEARCH ================== */
    
       /////////////////
/////// SEARCH COMMAND ////////
      /////////////////



         /////////////////
  ////// CONVART COMMAND //////
  //.   //////////////////
  
cmd({
    pattern: "imgbb",
    react: "🖇",
    desc: "Upload image to imgbb and get direct link",
    category: "convert",
    use: ".imgbb (reply to image)",
    filename: __filename
}, async (socket, mek, m, { from, q, reply }) => {
    try {

        // 🔑 Your IMGBB API KEY
        const API_KEY = "cbcd92dd23fdcd54a15d4eb0e62a0308";

        // Get quoted message (reply image)
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || "";

        // Check if it's an image
        if (!mime.startsWith("image")) {
            return reply("❌ Please reply to an image.");
        }

        // Download image buffer
        const buffer = await quoted.download();

        if (!buffer) {
            return reply("❌ Failed to download image.");
        }

        // Convert image to base64
        const base64Image = buffer.toString("base64");

        // Prepare form data
        const form = new FormData();
        form.append("image", base64Image);

        // Upload to IMGBB
        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${API_KEY}`,
            form,
            {
                headers: form.getHeaders()
            }
        );

        const data = response.data;

        // Check success
        if (!data || !data.success) {
            return reply("❌ Image upload failed.");
        }

        // Extract URLs
        const imageUrl = data.data.url;
        const viewerUrl = data.data.url_viewer;
        const deleteUrl = data.data.delete_url;

        // Reply result
        return reply(
            `✅ *Image Uploaded Successfully!*\n\n` +
            `🔗 Direct URL:\n${imageUrl}\n\n` +
            `🌐 Viewer URL:\n${viewerUrl}\n\n` +
            `🗑 Delete URL:\n${deleteUrl}`
        );

    } catch (error) {
        console.error(error);
        reply("❌ Error: " + error.message);
    }
});
         /////////////////
///////// LOGO COMMAND ////////
      /////////////////

const cache = new Map();

/* ================================
   Logo Effects List
================================ */

const effects = {
    naruto: {
        url: 'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
        desc: 'Naruto Shippuden style text effect'
    },
    dragonball: {
        url: 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
        desc: 'Dragon Ball style text effect'
    },
    onepiece: {
        url: 'https://en.ephoto360.com/create-one-piece-logo-style-text-effect-online-814.html',
        desc: 'One Piece logo style text effect'
    },
    marvel: {
        url: 'https://en.ephoto360.com/create-3d-marvel-logo-style-text-effect-online-811.html',
        desc: 'Marvel logo style text effect'
    },
    deadpool: {
        url: 'https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html',
        desc: 'Deadpool logo style text effect'
    },
    harrypotter: {
        url: 'https://en.ephoto360.com/create-harry-potter-logo-style-text-effect-online-815.html',
        desc: 'Harry Potter style text effect'
    },
    neon: {
        url: 'https://en.ephoto360.com/write-text-on-3d-neon-sign-board-online-805.html',
        desc: '3D Neon sign board text'
    },
    glitch: {
        url: 'https://en.ephoto360.com/create-a-glitch-text-effect-online-812.html',
        desc: 'Glitch text effect'
    },
    rainbow: {
        url: 'https://en.ephoto360.com/create-rainbow-text-effects-online-801.html',
        desc: 'Rainbow text effect'
    },
    gold: {
        url: 'https://en.ephoto360.com/create-golden-metal-text-effect-online-804.html',
        desc: 'Golden metal text effect'
    },
    silver: {
        url: 'https://en.ephoto360.com/create-silver-metal-text-effect-online-806.html',
        desc: 'Silver metal text effect'
    },
    diamond: {
        url: 'https://en.ephoto360.com/create-diamond-text-effect-online-807.html',
        desc: 'Diamond text effect'
    },
    fire: {
        url: 'https://en.ephoto360.com/create-burning-fire-text-effect-online-802.html',
        desc: 'Burning fire text effect'
    },
    water: {
        url: 'https://en.ephoto360.com/create-underwater-text-effect-online-803.html',
        desc: 'Underwater text effect'
    },
    smoke: {
        url: 'https://en.ephoto360.com/create-smoky-text-effect-online-799.html',
        desc: 'Smoky text effect'
    },
    graffiti: {
        url: 'https://en.ephoto360.com/create-graffiti-text-effects-online-795.html',
        desc: 'Graffiti text effect'
    },
    sand: {
        url: 'https://en.ephoto360.com/write-text-on-the-beach-sand-online-794.html',
        desc: 'Beach sand text'
    },
    sky: {
        url: 'https://en.ephoto360.com/write-text-on-the-cloud-sky-online-793.html',
        desc: 'Cloud sky text'
    },
    space: {
        url: 'https://en.ephoto360.com/create-galaxy-text-effect-online-792.html',
        desc: 'Galaxy text effect'
    }
};

/* ================================
   Logo Generator Function
================================ */

async function createLogo(effectUrl, text) {
    const cacheKey = effectUrl + text;

    if (cache.has(cacheKey)) {
        return { success: true, imageUrl: cache.get(cacheKey) };
    }

    try {
        const generator = new Photo360(effectUrl);
        generator.setName(text);

        const result = await Promise.race([
            generator.execute(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 20000)
            )
        ]);

        if (result.status && result.imageUrl) {
            cache.set(cacheKey, result.imageUrl);
            return { success: true, imageUrl: result.imageUrl };
        }

        return { success: false, error: "Generation failed" };

    } catch (err) {
        return { success: false, error: err.message };
    }
}

/* ================================
   Auto Commands for Each Effect
================================ */

Object.entries(effects).forEach(([effectName, effectInfo]) => {

    cmd({
        pattern: effectName,
        desc: effectInfo.desc,
        category: "logo",
        react: "🎨",
        filename: __filename
    },
    async (socket, mek, m, { from, q, reply }) => {
        try {
            if (!q)
                return reply(`❌ Example:\n.${effectName} YourText`);

            const text = q.trim();
            await reply(`⏳ Creating *${effectName}* logo...`);

            const result = await createLogo(effectInfo.url, text);

            if (!result.success)
                return reply(`❌ ${result.error}`);

            await socket.sendMessage(from, {
                image: { url: result.imageUrl },
                caption: `🎨 *${effectName.toUpperCase()} LOGO*\n\n✏️ Text : ${text}`
            });

        } catch (err) {
            console.log(err);
            reply("❌ Error generating logo");
        }
    });

});

/* ================================
   Logo List Command
================================ */

cmd({
    pattern: "logolist",
    desc: "Show all logo effects",
    category: "logo",
    react: "📋",
    filename: __filename
},
async (socket, mek, m, { reply }) => {
    let txt = "🎨 *Available Logo Effects*\n\n";
    Object.keys(effects).forEach(name => txt += `• .${name}\n`);
    txt += "\nExample:\n.naruto Uzumaki";
    reply(txt);
});

/* ================================
   Random Logo
================================ */

cmd({
    pattern: "logorandom",
    desc: "Random logo effect",
    category: "logo",
    react: "🎲",
    filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {
    if (!q)
        return reply("Example:\n.logo random Hello");

    const text = q.trim();
    const keys = Object.keys(effects);
    const random = keys[Math.floor(Math.random() * keys.length)];

    const result = await createLogo(effects[random].url, text);
    if (!result.success)
        return reply("❌ Failed");

    await socket.sendMessage(from, {
        image: { url: result.imageUrl },
        caption: `🎲 *RANDOM LOGO*\n\nEffect : ${random}\nText : ${text}`
    });
});

/* ================================
   Batch Logos (Fast Parallel)
================================ */

cmd({
    pattern: "logobatch",
    desc: "Generate multiple logos",
    category: "logo",
    react: "⚡",
    filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {
    if (!q)
        return reply("Example:\n.logo batch naruto,neon,gold Hello");

    const [effectsListStr, ...textArr] = q.split(" ");
    const list = effectsListStr.split(",");
    const text = textArr.join(" ").trim();

    if (!text || list.length === 0)
        return reply("❌ Invalid format");

    const tasks = list.map(async effect => {
        if (!effects[effect]) return null;
        const result = await createLogo(effects[effect].url, text);
        return { effect, result };
    });

    const results = await Promise.all(tasks);

    for (const item of results) {
        if (!item || !item.result.success) continue;

        await socket.sendMessage(from, {
            image: { url: item.result.imageUrl },
            caption: `✨ ${item.effect}\nText : ${text}`
        });

        await new Promise(r => setTimeout(r, 1500));
    }

    reply("✅ Batch finished");
});
       /////////////////
/////// other command ////////
      /////////////////

  cmd({
    pattern: "vv",
    alias: ["viewonce"],
    use: ".vv",
    desc: "Download view once media",
    category: "others",
    react: "👁️",
    filename: __filename
},
async (socket, mek, m, { from, reply }) => {
    try {

        const msg = mek

        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return reply("❌ Please reply to a ViewOnce message.");
        }

        const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;

        let mediaType;

        if (quotedMsg.imageMessage) mediaType = "image";
        else if (quotedMsg.videoMessage) mediaType = "video";
        else if (quotedMsg.audioMessage) mediaType = "audio";
        else return reply("❌ Unsupported media type.");

        const stream = await downloadContentFromMessage(
            quotedMsg.imageMessage || quotedMsg.videoMessage || quotedMsg.audioMessage,
            mediaType
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (mediaType === "image") {
            await socket.sendMessage(from, { image: buffer }, { quoted: mek });
        }

        else if (mediaType === "video") {
            await socket.sendMessage(from, { video: buffer }, { quoted: mek });
        }

        else if (mediaType === "audio") {
            await socket.sendMessage(from, {
                audio: buffer,
                mimetype: quotedMsg.audioMessage.mimetype || "audio/mpeg"
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("VV Error:", e);
        reply("❌ Error while fetching ViewOnce media.");
    }
});

cmd({
    pattern: "save",
    alias: ["send"],
    use: ".save",
    desc: "Save replied status",
    category: "others",
    react: "💾",
    filename: __filename
},
async (socket, mek, m, { from, reply }) => {

    try {

        const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg) {
            return reply("❌ Please reply to a status message.");
        }

        await socket.sendMessage(from, {
            react: { text: "💾", key: mek.key }
        });

        if (quotedMsg.imageMessage) {

            const buffer = await downloadAndSaveMedia(quotedMsg.imageMessage, "image");

            await socket.sendMessage(from, {
                image: buffer,
                caption: quotedMsg.imageMessage.caption || "✅ Status Saved"
            }, { quoted: mek });

        }

        else if (quotedMsg.videoMessage) {

            const buffer = await downloadAndSaveMedia(quotedMsg.videoMessage, "video");

            await socket.sendMessage(from, {
                video: buffer,
                caption: quotedMsg.videoMessage.caption || "✅ Status Saved"
            }, { quoted: mek });

        }

        else if (quotedMsg.conversation || quotedMsg.extendedTextMessage) {

            const text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;

            await socket.sendMessage(from, {
                text: `✅ *Status Saved*\n\n${text}`
            }, { quoted: mek });

        }

        else {

            await socket.sendMessage(from, quotedMsg, { quoted: mek });

        }

    } catch (error) {

        console.error("Save Error:", error);
        reply("❌ Failed to save status.");

    }
});

  cmd({
    pattern: "githubstalk",
    desc: "Fetch detailed GitHub user profile including profile picture.",
    category: "others",
    react: "📚",
    filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Please provide a GitHub username.");

        const username = q.split(' ')[0]; // Get the first word as username
        const apiUrl = `https://api.github.com/users/${username}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        let userInfo = `👨‍💻 *MANAOFC LITE GITSTALK* 👨‍💻
        
👤 *User Name*: ${data.name || data.login}

🔗 *GitHub URL*: [Link](${data.html_url})

📝 *Bio*: ${data.bio || 'Not available'}

🏙️ *Location*: ${data.location || 'Unknown'}

📊 *Public Repos*: ${data.public_repos}

👥 *Followers*: ${data.followers} | Following: ${data.following}

📅 *Created Date*: ${new Date(data.created_at).toDateString()}

🔭 *Public Gists*: ${data.public_gists}

> _*Powered By Manaofc*_`;

        await socket.sendMessage(from, { image: { url: data.avatar_url }, caption: userInfo }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`Error fetching data 🤕: ${e.response ? e.response.data.message : e.message}`);
    }
});

  cmd({
    pattern: "img2url",
    alias: ["imgtourl",  "url"],
    react: "🖇",
    desc: "Convert image to URL",
    category: "tools",
    use: ".tourl (reply to image)",
    filename: __filename
}, async (socket, mek, m, { from, prefix, q, reply }) => {
    try {
        // get quoted message or current message
        let mediaMessage = m.quoted ? m.quoted : m;

        // get mime type
        let mime = (mediaMessage.msg || mediaMessage).mimetype || "";

        if (!mime.startsWith("image")) {
            return reply("🌻 Please reply to an image.");
        }

        // download image
        let mediaBuffer = await mediaMessage.download();

        // unique temp file
        let tempPath = path.join(os.tmpdir(), `img_upload_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, mediaBuffer);

        // create form data
        let form = new FormData();
        form.append("image", fs.createReadStream(tempPath));

        // upload to imgbb
        let response = await axios.post(
            "https://api.imgbb.com/1/upload?key=a0669ccae966e3f7cfe5122eb7194b4a",
            form,
            { headers: { ...form.getHeaders() } }
        );

        fs.unlinkSync(tempPath); // delete temp file

        if (!response.data?.data?.url) throw new Error("❌ Failed to upload image.");

        let imageUrl = response.data.data.url;

        await reply(
`*MANISHA-MD-V6 IMG URL 📸*
${mediaBuffer.length} Byte(s)

*URL-IMG* 🖇️
${imageUrl}

> _*Powered By Manaofc*_`
        );

    } catch (error) {
        console.error(error);
        reply(String(error));
    }
});
  
              ///////////////////
////////////// SETTINGS COMMAND ////////////////
            ////////////////////

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

if (!userConfig) userConfig = {};

userConfig[configKey] = configValue;

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

              ///////////////////
////////////// OWNER COMMAND ////////////////
            ////////////////////

  cmd({
    pattern: "owner",
    desc: "Display owner contact information.",
    react: "🌝",
    use: ".owner",
    category: "owner",
    filename: __filename
},
async (socket, mek, m, { from, reply }) => {
    try {
        const vcard = 
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'FN:MANAOFC\n' +
            'ORG:MANAOFC\n' +
            'TEL;type=CELL;type=VOICE;waid=94759934522:+94759934522\n' +
            'EMAIL:manishasasmith27@gmail.com\n' +
            'END:VCARD';

        await socket.sendMessage(from, { 
            contacts: { 
                displayName: "manaofc", 
                contacts: [{ vcard }] 
            },  
            quoted: mek 
        });
    } catch (e) {
        console.error(e);
        reply('⚠️ An error occurred while fetching owner information.');
    }
});

              ///////////////////
////////////// MOVIE COMMAND ////////////////
            ////////////////////
  cmd(
  {
    pattern: "cinesubz",
    react: "🎬",
    alias: ["movie"],
    category: "movie",
    use: ".cinesubz deadpool",
    filename: __filename,
  },
  async (socket, mek, m, { from, prefix, q, reply }) => {
    try {
      if (!q) return reply("❌ Please give a movie name!");

      const res = await fetch(`https://api-dark-shan-yt.koyeb.app/movie/cinesubz-search?q=${encodeURIComponent(q)}&apikey=b8bac21967ae1a95`);

      const json = await res.json();

      if (!json.status || !json.data || json.data.length === 0) {
        return reply("❌ Movie not found!");
      }

      const data = json.data;

      // BUTTONS
      const rows = data.slice(0, 10).map((v, i) => ({
        buttonId: `${prefix}cinfo ${v.link}`,
        buttonText: {
          displayText: `${i + 1}. ${v.title.substring(0, 40)}`,
        },
        type: 1,
      }));

      const buttonMessage = {
        image: defaultConfig.IMAGE_PATH,
        caption: `*MANAOFC LITE CINESUBZ DOWNLOAD 🎬*`,
        footer: "> _*Powered By Manaofc*_",
        buttons: rows,
        headerType: 4,
      };

      await socket.buttonMessage(from, buttonMessage, mek);
    } catch (e) {
      console.error(e);
      reply("❌ ERROR!");
    }
  }
);

// ================= INFO COMMAND =================

cmd(
  {
    pattern: "cinfo",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename,
  },
  async (socket, mek, m, { from, prefix, q, reply }) => {
    try {
      if (!q) return reply("❌ Need movie URL!");

      const res = await fetch(`https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=${encodeURIComponent(q)}&apikey=b8bac21967ae1a95`);

      const json = await res.json();

      if (!json.status || !json.data) {
        return reply("❌ Movie info not found!");
      }

      const movie = json.data;

      let desc = `🎬 *${movie.title}*\n\n`;
      desc += `⭐ Rating: ${movie.rating || "N/A"}\n`;
      desc += `📅 Year: ${movie.year || "N/A"}\n`;
      desc += `⏱ Duration: ${movie.duration || "N/A"}\n`;
      desc += `🎞 Quality: ${movie.quality || "N/A"}\n`;
      desc += `🌍 Language: ${movie.tag || "N/A"}\n\n`;
      desc += `📥 *Select Download Quality Below*`;

      const buttons = movie.downloads.slice(0, 10).map((d) => ({
        buttonId: `${prefix}download ${d.link}`,
        buttonText: {
          displayText: `${d.quality} (${d.size})`,
        },
        type: 1,
      }));

      const buttonMessage = {
        image: movie.image,
        caption: desc,
        footer: "> _*Powered By Manaofc*_",
        buttons,
        headerType: 4,
      };

      await socket.buttonMessage(from, buttonMessage, mek);
    } catch (e) {
      console.error(e);
      reply("❌ ERROR!");
    }
  }
);

// ================= DOWNLOAD COMMAND =================

cmd(
  {
    pattern: "download",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename,
  },
  async (socket, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Need download URL!");

      const res = await fetch(`https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=${encodeURIComponent(q)}&apikey=b8bac21967ae1a95`);

      const json = await res.json();

      if (!json.status || !json.data) {
        return reply("❌ Download failed!");
      }

      const data = json.data;

      // DIRECT LINK
      const direct =
        data.download.find((v) => v.name === "unknown") ||
        data.download[0];

      if (!direct?.url) {
        return reply("❌ Direct download link not found!");
      }

      let txt = `📥 *Download Ready*\n\n`;
      txt += `🎬 Title: ${data.title}\n`;
      txt += `💾 Size: ${data.size}\n\n`;
      txt += `🔗 ${direct.url}`;

      await reply(txt);

      // SEND FILE
      await socket.sendMessage(
        from,
        {
          document: { url: direct.url },
          mimetype: "video/mp4",
          fileName: data.title,
          caption: "🎬 Movie Download",
        },
        { quoted: mek }
      );
    } catch (e) {
      console.error(e);
      reply("❌ ERROR!");
    }
  }
);
    /* ================== MESSAGE HANDLER ================== */
    socket.ev.on("messages.upsert", async ({ messages }) => {
        const mek = messages[0];
        if (!mek.message || mek.key.remoteJid === "status@broadcast") return;
      
        try {
          const type = getContentType(mek.message);
          const from = mek.key.remoteJid; 
          const sender = mek.key.participant || from;
          /////////////////////////
            // === BODY EXTRACTION WITH QUOTED BUTTON SUPPORT ===
            const body =
                type === "conversation"
                    ? mek.message.conversation
                    : mek.message?.extendedTextMessage?.contextInfo?.hasOwnProperty("quotedMessage") &&
                      (await isbtnID(mek.message?.extendedTextMessage?.contextInfo?.stanzaId)) &&
                      getCmdForCmdId(
                          await getCMDStore(mek.message?.extendedTextMessage?.contextInfo?.stanzaId),
                          mek?.message?.extendedTextMessage?.text
                      )
                    ? getCmdForCmdId(
                          await getCMDStore(mek.message?.extendedTextMessage?.contextInfo?.stanzaId),
                          mek?.message?.extendedTextMessage?.text
                      )
                    : type === "extendedTextMessage"
                    ? mek.message.extendedTextMessage.text
                    : type === "imageMessage" && mek.message.imageMessage.caption
                    ? mek.message.imageMessage.caption
                    : type === "videoMessage" && mek.message.videoMessage.caption
                    ? mek.message.videoMessage.caption
                    : "";

            const prefix = userConfig.PREFIX || '.';
            const isCmd = body.startsWith(prefix);
            if (!isCmd) return;

            const command = body.slice(prefix.length).trim().split(" ").shift().toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(" ");

            // Reply helper
            const reply = async (text) => {
                await socket.sendMessage(from, { text }, { quoted: mek });
            };

            // Rate limiting
            //sender එක මෙතනට ඇඩ් කරන්න
            const now = Date.now();
            if (commandCooldowns.has(sender)) {
                const diff = now - commandCooldowns.get(sender);
                if (diff < COMMAND_COOLDOWN) {
                    return reply(`⏳ Please wait ${((COMMAND_COOLDOWN - diff) / 1000).toFixed(1)}s before using another command.`);
                }
            }
            commandCooldowns.set(sender, now);

            // Find and execute command
            const cmdObj = commands.find(c => c.pattern === command || (c.alias && c.alias.includes(command)));
            if (!cmdObj) return reply(`❌ Unknown command: ${command}\nUse ${prefix}menu to see available commands.`);

          // === REACTION SUPPORT ===
          if (cmdObj.react) {
            await socket.sendMessage(from, {
              react: { text: cmdObj.react, key: mek.key }
            });
          }
            await cmdObj.function(socket, mek, mek, { from, prefix, q, args, reply });

        } catch (error) {
            console.error("Command handler error:", error);
            await socket.sendMessage(mek.key.remoteJid, {
                text: `❌ An error occurred while processing your command. Please try again.`
            }, { quoted: mek });
        }
    });
    // Cleanup old cooldowns every 10s
    setInterval(() => {
        const now = Date.now();
        for (const [user, time] of commandCooldowns) {
            if (now - time > COMMAND_COOLDOWN * 5) commandCooldowns.delete(user);
        }
    }, 10000);
}
    
//========================    
// Memory optimization: Throttle message handlers
function setupMessageHandlers(socket, userConfig) {
    let lastPresenceUpdate = 0;
    const PRESENCE_UPDATE_COOLDOWN = 5000; // 5 seconds
    
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        // Throttle presence updates
        const now = Date.now();
        if (now - lastPresenceUpdate < PRESENCE_UPDATE_COOLDOWN) {
            return;
        }

        if (userConfig.AUTO_RECORDING === 'true') {
            try {
                await socket.sendPresenceUpdate('recording', msg.key.remoteJid);
                lastPresenceUpdate = now;
                console.log(`Set recording presence for ${msg.key.remoteJid}`);
            } catch (error) {
                console.error('Failed to set recording presence:', error);
            }
        }
    });
}

// Memory optimization: Batch GitHub operations
async function deleteSessionFromGitHub(number) {
    try {
        if (!octokit) return;
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file =>
            file.name.includes(sanitizedNumber) && file.name.endsWith('.json')
        );

        // Delete files in sequence to avoid rate limiting
        for (const file of sessionFiles) {
            await octokit.repos.deleteFile({
                owner,
                repo,
                path: `session/${file.name}`,
                message: `Delete session for ${sanitizedNumber}`,
                sha: file.sha
            });
            await delay(500); // Add delay between deletions
        }
    } catch (error) {
        console.error('Failed to delete session from GitHub:', error);
    }
}

// Memory optimization: Cache session data
const sessionCache = new Map();
const SESSION_CACHE_TTL = 300000; // 5 minutes

async function restoreSession(number) {
    try {
        if (!octokit) return null;
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        // Check cache first
        const cached = sessionCache.get(sanitizedNumber);
        if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
            return cached.data;
        }
        
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file =>
            file.name === `creds_${sanitizedNumber}.json`
        );

        if (sessionFiles.length === 0) return null;

        const latestSession = sessionFiles[0];
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: `session/${latestSession.name}`
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const sessionData = JSON.parse(content);
        
        // Cache the session data
        sessionCache.set(sanitizedNumber, {
            data: sessionData,
            timestamp: Date.now()
        });
        
        return sessionData;
    } catch (error) {
        console.error('Session restore failed:', error);
        return null;
    }
}

// Memory optimization: Cache user config
const userConfigCache = new Map();
const USER_CONFIG_CACHE_TTL = 300000; // 5 minutes

async function loadUserConfig(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        // Check cache first
        const cached = userConfigCache.get(sanitizedNumber);
        if (cached && Date.now() - cached.timestamp < USER_CONFIG_CACHE_TTL) {
            return cached.data;
        }
        
        let configData = { ...defaultConfig };
        
        if (octokit) {
            try {
                const configPath = `session/config_${sanitizedNumber}.json`;
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: configPath
                });

                const content = Buffer.from(data.content, 'base64').toString('utf8');
                const userConfig = JSON.parse(content);
                
                // Merge with default config
                configData = { ...configData, ...userConfig };
            } catch (error) {
                console.warn(`No configuration found for ${number}, using default config`);
            }
        }
        
        // Set owner number to the user's number if not set
        if (!configData.OWNER_NUMBER) {
            configData.OWNER_NUMBER = sanitizedNumber;
        }
        
        // Cache the config
        userConfigCache.set(sanitizedNumber, {
            data: configData,
            timestamp: Date.now()
        });
        
        return configData;
    } catch (error) {
        console.warn(`Error loading config for ${number}, using default config:`, error);
        return { ...defaultConfig, OWNER_NUMBER: number.replace(/[^0-9]/g, '') };
    }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        if (octokit) {
            const configPath = `session/config_${sanitizedNumber}.json`;
            let sha;

            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: configPath
                });
                sha = data.sha;
            } catch (error) {
                // File doesn't exist yet, no sha needed
            }

            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: configPath,
                message: `Update config for ${sanitizedNumber}`,
                content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
                sha
            });
        }
        
        // Update cache
        userConfigCache.set(sanitizedNumber, {
            data: newConfig,
            timestamp: Date.now()
        });
        
        console.log(`Updated config for ${sanitizedNumber}`);
    } catch (error) {
        console.error('Failed to update config:', error);
        throw error;
    }
}

// Memory optimization: Improve auto-restart logic
function setupAutoRestart(socket, number) {
    let restartAttempts = 0;
    const MAX_RESTART_ATTEMPTS = 5;
    const RESTART_DELAY_BASE = 10000; // 10 seconds
    
    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
            // Delete session from GitHub when connection is lost
            await deleteSessionFromGitHub(number);
            
            if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
                console.log(`Max restart attempts reached for ${number}, giving up`);
                activeSockets.delete(number.replace(/[^0-9]/g, ''));
                socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                return;
            }
            
            restartAttempts++;
            const delayTime = RESTART_DELAY_BASE * Math.pow(2, restartAttempts - 1); // Exponential backoff
            
            console.log(`Connection lost for ${number}, attempting to reconnect in ${delayTime/1000} seconds (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
            
            await delay(delayTime);
            
            try {
                const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                await EmpirePair(number, mockRes);
            } catch (error) {
                console.error(`Reconnection attempt ${restartAttempts} failed for ${number}:`, error);
            }
        } else if (connection === 'open') {
            // Reset restart attempts on successful connection
            restartAttempts = 0;
        }
    });
}

// Memory optimization: Improve pairing process
async function EmpirePair(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    // Check if already connected
    if (activeSockets.has(sanitizedNumber)) {
        if (!res.headersSent) {
            res.send({ 
                status: 'already_connected',
                message: 'This number is already connected'
            });
        }
        return;
    }

    await cleanDuplicateFiles(sanitizedNumber);

    const restoredCreds = await restoreSession(sanitizedNumber);
    if (restoredCreds) {
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
        console.log(`Successfully restored session for ${sanitizedNumber}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });

    try {
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.windows('Chrome')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        // Load user config
        const userConfig = await loadUserConfig(sanitizedNumber);
        
        setupStatusHandlers(socket, userConfig);
        setupCommandHandlers(socket, sanitizedNumber, userConfig);
        setupMessageHandlers(socket, userConfig);
        setupAutoRestart(socket, sanitizedNumber);

        if (!socket.authState.creds.registered) {
            let retries = parseInt(userConfig.MAX_RETRIES) || 3;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to request pairing code: ${retries}, error.message`, retries);
                    await delay(2000 * ((parseInt(userConfig.MAX_RETRIES) || 3) - retries));
                }
            }
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        socket.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            
            if (octokit) {
                let sha;
                try {
                    const { data } = await octokit.repos.getContent({
                        owner,
                        repo,
                        path: `session/creds_${sanitizedNumber}.json`
                    });
                    sha = data.sha;
                } catch (error) {
                    // File doesn't exist yet, no sha needed
                }

                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: `session/creds_${sanitizedNumber}.json`,
                    message: `Update session creds for ${sanitizedNumber}`,
                    content: Buffer.from(fileContent).toString('base64'),
                    sha
                });
                console.log(`Updated creds for ${sanitizedNumber} in GitHub`);
            }
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                try {
                    await delay(3000);
                    
                    const userJid = jidNormalizedUser(socket.user.id);

                    activeSockets.set(sanitizedNumber, socket);

                    await socket.sendMessage(userJid, {
    image: {
        url: userConfig.IMAGE_PATH || defaultConfig.IMAGE_PATH
    },
    caption: `MANAOFC LITE BOT CONNECTED

✅ Successfully connected!

🔢 Number: ${sanitizedNumber}

✨ Bot is now active and ready to use!

📌 Type ${userConfig.PREFIX || '.'}menu to view all commands

> _*Powered By Manaofc*_`
});

                    await sendAdminConnectMessage(socket, sanitizedNumber);

                    let numbers = [];
                    if (fs.existsSync(NUMBER_LIST_PATH)) {
                        numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
                    }
                    if (!numbers.includes(sanitizedNumber)) {
                        numbers.push(sanitizedNumber);
                        fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
                    }
                } catch (error) {
                    console.error('Connection error:', error);
                    exec(`pm2 restart ${process.env.PM2_NAME || '𝐀𝐫𝐬𝐥𝐚𝐧-𝐌𝐃-𝐌𝐢𝐧𝐢-𝐅𝚁𝙴𝙴-𝐁𝙾𝚃-session'}`);
                }
            }
        });
    } catch (error) {
        console.error('Pairing error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
    }
}

// API Routes - Only essential routes kept
router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }

    if (activeSockets.has(number.replace(/[^0-9]/g, ''))) {
        return res.status(200).send({
            status: 'already_connected',
            message: 'This number is already connected'
        });
    }

    await EmpirePair(number, res);
});

router.get('/active', (req, res) => {
    res.status(200).send({
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys())
    });
});

// Memory optimization: Limit concurrent connections
const MAX_CONCURRENT_CONNECTIONS = 5;
let currentConnections = 0;

router.get('/connect-all', async (req, res) => {
    try {
        if (!fs.existsSync(NUMBER_LIST_PATH)) {
            return res.status(404).send({ error: 'No numbers found to connect' });
        }

        const numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH));
        if (numbers.length === 0) {
            return res.status(404).send({ error: 'No numbers found to connect' });
        }

        const results = [];
        const connectionPromises = [];
        
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            
            // Limit concurrent connections
            if (currentConnections >= MAX_CONCURRENT_CONNECTIONS) {
                results.push({ number, status: 'queued' });
                continue;
            }
            
            currentConnections++;
            connectionPromises.push((async () => {
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                    await EmpirePair(number, mockRes);
                    results.push({ number, status: 'connection_initiated' });
                } catch (error) {
                    results.push({ number, status: 'failed', error: error.message });
                } finally {
                    currentConnections--;
                }
            })());
        }
        
        await Promise.all(connectionPromises);
        
        res.status(200).send({
            status: 'success',
            connections: results
        });
    } catch (error) {
        console.error('Connect all error:', error);
        res.status(500).send({ error: 'Failed to connect all bots' });
    }
});

// Memory optimization: Limit concurrent reconnections
router.get('/reconnect', async (req, res) => {
    try {
        if (!octokit) {
            return res.status(500).send({ error: 'GitHub integration not configured' });
        }
        
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith('creds_') && file.name.endsWith('.json')
        );

        if (sessionFiles.length === 0) {
            return res.status(404).send({ error: 'No session files found in GitHub repository' });
        }

        const results = [];
        const reconnectPromises = [];
        
        for (const file of sessionFiles) {
            const match = file.name.match(/creds_(\d+)\.json/);
            if (!match) {
                console.warn(`Skipping invalid session file: ${file.name}`);
                results.push({ file: file.name, status: 'skipped', reason: 'invalid_file_name' });
                continue;
            }

            const number = match[1];
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            
            // Limit concurrent reconnections
            if (currentConnections >= MAX_CONCURRENT_CONNECTIONS) {
                results.push({ number, status: 'queued' });
                continue;
            }
            
            currentConnections++;
            reconnectPromises.push((async () => {
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                    await EmpirePair(number, mockRes);
                    results.push({ number, status: 'connection_initiated' });
                } catch (error) {
                    console.error(`Failed to reconnect bot for ${number}:`, error);
                    results.push({ number, status: 'failed', error: error.message });
                } finally {
                    currentConnections--;
                }
            })());
        }
        
        await Promise.all(reconnectPromises);
        
        res.status(200).send({
            status: 'success',
            connections: results
        });
    } catch (error) {
        console.error('Reconnect error:', error);
        res.status(500).send({ error: 'Failed to reconnect bots' });
    }
});

// Config management routes for HTML interface
router.get('/config/:number', async (req, res) => {
    try {
        const { number } = req.params;
        const config = await loadUserConfig(number);
        res.status(200).send(config);
    } catch (error) {
        console.error('Failed to load config:', error);
        res.status(500).send({ error: 'Failed to load config' });
    }
});

router.post('/config/:number', async (req, res) => {
    try {
        const { number } = req.params;
        const newConfig = req.body;
        
        // Validate config
        if (typeof newConfig !== 'object') {
            return res.status(400).send({ error: 'Invalid config format' });
        }
        
        // Load current config and merge
        const currentConfig = await loadUserConfig(number);
        const mergedConfig = { ...currentConfig, ...newConfig };
        
        await updateUserConfig(number, mergedConfig);
        res.status(200).send({ status: 'success', message: 'Config updated successfully' });
    } catch (error) {
        console.error('Failed to update config:', error);
        res.status(500).send({ error: 'Failed to update config' });
    }
});

// Cleanup with better memory management
process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        socket.ws.close();
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
    fs.emptyDirSync(SESSION_BASE_PATH);
    
    // Clear all caches
    adminCache = null;
    adminCacheTime = 0;
    sessionCache.clear();
    userConfigCache.clear();
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    exec(`pm2 restart ${process.env.PM2_NAME || 'BOT-session'}`);
});

// Regular memory cleanup
setInterval(() => {
    // Clean up expired cache entries
    const now = Date.now();
    
    // Clean session cache
    for (let [key, value] of sessionCache.entries()) {
        if (now - value.timestamp > SESSION_CACHE_TTL) {
            sessionCache.delete(key);
        }
    }
    
    // Clean user config cache
    for (let [key, value] of userConfigCache.entries()) {
        if (now - value.timestamp > USER_CONFIG_CACHE_TTL) {
            userConfigCache.delete(key);
        }
    }
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
}, 300000); // Run every 5 minutes

module.exports = router;
