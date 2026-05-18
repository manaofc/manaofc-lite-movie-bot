const { cmd, commands } = require('../command');
const { downloadMediaMessage, downloadContentFromMessage} = require("../lib/msg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

//================ VV COMMAND =================//

cmd({
    pattern: "vv",
    alias: ["viewonce"],
    react: "👁️",
    desc: "Download ViewOnce Media",
    category: "others",
    filename: __filename
},
async (socket, mek, m, { from, reply }) => {

    try {

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return reply("❌ Reply to a ViewOnce message.");
        }

        // GET REAL MESSAGE
        const msg =
            quoted.viewOnceMessage?.message ||
            quoted.viewOnceMessageV2?.message ||
            quoted.viewOnceMessageV2Extension?.message;

        if (!msg) {
            console.log(JSON.stringify(quoted, null, 2));
            return reply("❌ This is not a ViewOnce message.");
        }

        // IMAGE
        if (msg.imageMessage) {

            const stream = await downloadContentFromMessage(
                msg.imageMessage,
                "image"
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            return await socket.sendMessage(from, {
                image: buffer,
                caption: msg.imageMessage.caption || ""
            }, { quoted: mek });

        }

        // VIDEO
        else if (msg.videoMessage) {

            const stream = await downloadContentFromMessage(
                msg.videoMessage,
                "video"
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            return await socket.sendMessage(from, {
                video: buffer,
                caption: msg.videoMessage.caption || ""
            }, { quoted: mek });

        }

        else {
            return reply("❌ Unsupported ViewOnce type.");
        }

    } catch (err) {

        console.log(err);

        reply("❌ VV Error");

    }

});
//================ SAVE STATUS =================//

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

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return reply("❌ Reply to a status.");
        }

        // IMAGE STATUS
        if (quoted.imageMessage) {

            const buffer = await downloadMediaMessage(quoted, "status_image");

            return await socket.sendMessage(from, {
                image: buffer,
                caption: quoted.imageMessage.caption || "✅ Status Saved"
            }, { quoted: mek });

        }

        // VIDEO STATUS
        else if (quoted.videoMessage) {

            const buffer = await downloadMediaMessage(quoted, "status_video");

            return await socket.sendMessage(from, {
                video: buffer,
                caption: quoted.videoMessage.caption || "✅ Status Saved"
            }, { quoted: mek });

        }

        // AUDIO STATUS
        else if (quoted.audioMessage) {

            const buffer = await downloadMediaMessage(quoted, "status_audio");

            return await socket.sendMessage(from, {
                audio: buffer,
                mimetype: quoted.audioMessage.mimetype || "audio/mp4",
                ptt: false
            }, { quoted: mek });

        }

        // TEXT STATUS
        else if (quoted.conversation || quoted.extendedTextMessage) {

            const text =
                quoted.conversation ||
                quoted.extendedTextMessage?.text;

            return await socket.sendMessage(from, {
                text: `✅ *Status Saved*\n\n${text}`
            }, { quoted: mek });

        }

        // DOCUMENT
        else if (quoted.documentMessage) {

            const buffer = await downloadMediaMessage(quoted, "status_doc");

            return await socket.sendMessage(from, {
                document: buffer,
                mimetype: quoted.documentMessage.mimetype,
                fileName: quoted.documentMessage.fileName || "file"
            }, { quoted: mek });

        }

        else {

            return reply("❌ Unsupported status type.");

        }

    } catch (err) {

        console.log("SAVE ERROR:", err);

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
