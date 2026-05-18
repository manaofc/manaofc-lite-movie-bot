const { cmd, commands } = require('../command');
const { downloadMediaMessage } = require("../lib/msg");
const axios = require("axios");

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

            const buffer = await downloadMediaMessage(quotedMsg.imageMessage, "image");

            await socket.sendMessage(from, {
                image: buffer,
                caption: quotedMsg.imageMessage.caption || "✅ Status Saved"
            }, { quoted: mek });

        }

        else if (quotedMsg.videoMessage) {

            const buffer = await downloadMediaMessage(quotedMsg.videoMessage, "video");

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
