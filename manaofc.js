const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const pino = require('pino');
const { Octokit } = require('@octokit/rest');
const moment = require('moment-timezone');
const config = require('./lib/config')
const { sms, downloadMediaMessage, downloadAndSaveMedia, saveMessage } = require("./lib/msg");
const { updateCMDStore, isbtnID, getCMDStore, getCmdForCmdId } = require("./lib/button.js");
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, getsize, formatBytes, fetchBuffer, formatSize, getFile } = require('./lib/functions');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

// Memory optimization: Streamline command handlers with rate limiting
function setupCommandHandlers(socket, number, userConfig) {
    const commandCooldowns = new Map();
    const COMMAND_COOLDOWN = 1000; // 1 second per user

   // ---------------- BUTTON MESSAGE -----------------
const cos = '```';
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
: { url: userConfig.IMAGE_PATH };

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
            : { url: userConfig.IMAGE_PATH };

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
    ////////////////// COMMAND //////////////
  

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
        image: config.IMAGE_PATH,
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
  ///////////////////// END ////////////////

socket.ev.on("messages.upsert", async (mek) => {
    try {
      mek = mek.messages[0];
      if (!mek.message) return;
      mek.message =
        getContentType(mek.message) === "ephemeralMessage"
          ? mek.message.ephemeralMessage.message
          : mek.message;
      
      const m = sms(socket, mek);
      const type = getContentType(mek.message);
      const content = JSON.stringify(mek.message);
      const from = mek.key.remoteJid;
      const quoted =
        type == "extendedTextMessage" &&
        mek.message.extendedTextMessage.contextInfo != null
          ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
          : [];
      const body =
        type === "conversation"
          ? mek.message.conversation
          : mek.message?.extendedTextMessage?.contextInfo?.hasOwnProperty(
              "quotedMessage"
            ) &&
            (await isbtnID(
              mek.message?.extendedTextMessage?.contextInfo?.stanzaId
            )) &&
            getCmdForCmdId(
              await getCMDStore(
                mek.message?.extendedTextMessage?.contextInfo?.stanzaId
              ),
              mek?.message?.extendedTextMessage?.text
            )
          ? getCmdForCmdId(
              await getCMDStore(
                mek.message?.extendedTextMessage?.contextInfo?.stanzaId
              ),
              mek?.message?.extendedTextMessage?.text
            )
          : type === "extendedTextMessage"
          ? mek.message.extendedTextMessage.text
          : type == "imageMessage" && mek.message.imageMessage.caption
          ? mek.message.imageMessage.caption
          : type == "videoMessage" && mek.message.videoMessage.caption
          ? mek.message.videoMessage.caption
          : "";
      const prefix = userConfig.PREFIX
        ? userConfig.PREFIX
        : /^./.test(body)
        ? body.match(/^./gi)
        : "#";
      const isCmd = body.startsWith(prefix);
      const command = isCmd
        ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase()
        : "";
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(" ");
      const isGroup = from.endsWith("@g.us");
      const sender = mek.key.fromMe
        ? socket.user.id.split(":")[0] + "@s.whatsapp.net" || socket.user.id
        : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split("@")[0];
      const mentionByTag =
        type == "extendedTextMessage" &&
        mek.message.extendedTextMessage.contextInfo != null
          ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
          : [];
      const pushname = mek.pushName || "NO NUMBER";
      const ownerNumber = jidNormalizedUser(socket.user.id);
      const isOwner = ownerNumber?.includes(senderNumber) || isMe;
      const isGroup =
      const isreact = m.message.reactionMessage ? true : false;
      const reply = async (text) => {
                await socket.sendMessage(from, { text }, { quoted: mek });
            };
 //==========WORKTYPE============ 
  if(!isOwner && userConfig.WORK_TYPE === "private") return
  if(!isOwner && isGroup && userConfig.WORK_TYPE === "inbox") return
  if(!isOwner && !isGroup && userConfig.WORK_TYPE === "groups") return
   
const events = require("./lib/command");
      const cmdName = isCmd
        ? body.slice(1).trim().split(" ")[0].toLowerCase()
        : false;
      if (isCmd) {
        const cmd = events.commands.find((cmd) => cmd.pattern === cmdName) ||
          events.commands.find(
            (cmd) => cmd.alias && cmd.alias.includes(cmdName));
        if (cmd) {
          if (cmd.react)
            socket.sendMessage(from, {
              react: { text: cmd.react, key: mek.key },});
          try {
            cmd.function(socket, mek, m, { from,prefix, quoted, body, isCmd, command,args,q,isGroup,sender,senderNumber,botNumber2,botNumber,pushname,isMe,isOwner,groupMetadata,groupName,participants,groupAdmins,isBotAdmins,isAdmins,reply,});
          } catch (e) {
            console.error("[PLUGIN ERROR] ", e);
          }
        }
      }
      events.commands.map(async (command) => {
        if (body && command.on === "body") {
          command.function(socket, mek, m, { });
        } else if (mek.q && command.on === "text") {
          command.function(socket, mek, m, { });
        } else if (
          (command.on === "image" || command.on === "photo") &&
          mek.type === "imageMessage"
        ) {
          command.function(socket, mek, m, { });
        } else if (command.on === "sticker" && mek.type === "stickerMessage") {
          command.function(socket, mek, m, { });
        }
      });

                 const presence = userConfig.PRESENCE;
  if (presence && presence !== "available") {
      if (presence === "composing") {
          await socket.sendPresenceUpdate("composing", from);
      } else if (presence === "recording") {
          await socket.sendPresenceUpdate("recording", from);
      } else if (presence === "unavailable") {
          await socket.sendPresenceUpdate("unavailable", from);
      } else {
          await socket.sendPresenceUpdate("available", from);
      }
  } else {
      await socket.sendPresenceUpdate("available", from);
  }

 } catch (e) {
     // const isError = String(e);
      console.log(e);
    }
  });
} // end setupCommandHandlers

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
        
        let configData = { ...config };
        
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
        if (sanitizedNumber);{
        }
        
        // Cache the config
        userConfigCache.set(sanitizedNumber, {
            data: configData,
            timestamp: Date.now()
        });
        
        return configData;
    } catch (error) {
        console.warn(`Error loading config for ${number}, using default config:`, error);
        return { ...config };
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


//===============
async function handleMessageRevocation(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;

        const messageKey = keys[0];
        const userJid = jidNormalizedUser(socket.user.id);
        const deletionTime = getSriLankaTimestamp();
        
        const message =`🗑️ MESSAGE DELETED\n\nA message was deleted from your chat.\n🧚‍♂️ From: ${messageKey.remoteJid}\n🍁 Deletion Time: ${deletionTime}\n\n> _*Powered By Manaofc*_`;

        try {
            await socket.sendMessage(userJid, {
                image: { url: userConfig.IMAGE_PATH },
                caption: message
            });
            console.log(`Notified ${number} about message deletion: ${messageKey.id}`);
        } catch (error) {
            console.error('Failed to send deletion notification:', error);
        }
    });
} 
//======================
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
        } catch (error) {
            console.error('Status handler error:', error);
        }
    });
}
//==============

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
            browser: Browsers.windows('Safari')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        // Load user config
        const userConfig = await loadUserConfig(sanitizedNumber);
        
  
        setupCommandHandlers(socket, sanitizedNumber, userConfig);
        setupAutoRestart(socket, sanitizedNumber);
        handleMessageRevocation(socket, sanitizedNumber); 

        if (!socket.authState.creds.registered) {
            let retries = parseInt(userConfig.MAX_RETRIES);
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to request pairing code: ${retries}, error.message`, retries);
                    await delay(2000 * (parseInt(userConfig.MAX_RETRIES) - retries));
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
                        image: { url: userConfig.IMAGE_PATH || config.IMAGE_PATH},
                        caption: `MANAOFC LITE BOT CONNECTED

✅ Successfully connected!

🔢 Number: ${sanitizedNumber}

✨ Bot is now active and ready to use!

📌 Type ${userConfig.PREFIX || '.'}menu to view all commands

> _*Powered By Manaofc*_`
});

                    

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
                    exec(`pm2 restart ${process.env.PM2_NAME || 'MANISHA-MD-bot-session'}`);
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
