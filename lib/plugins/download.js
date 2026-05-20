const { File } = require("megajs");
const apkdl = require('../lib/apkdl');
const { fetchJson } = require('../lib/functions')
const { cmd } = require("../command");
const config = require("../config");
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require("axios");
const cheerio = require("cheerio");
const yts = require("yt-search");

        cmd(
           {
            pattern: "song",
            react: "🎵",
            alias: ["music", "yt"],
            category: "download",
            use: ".song <Song Name or YouTube URL>",
            filename: __filename,
        },
        async (socket, mek, m, { from, prefix, q, reply }) => {
            try {
                if (!q) return reply("❌ *Please provide a song name or YouTube URL!*");

                const search = await yts(q);
                if (!search.videos || search.videos.length === 0)
                    return reply("⚠️ *No song results found!*");

                const song = search.videos[0];

                const caption = `
*🎶 MANAOFC LITE SONG DOWNLOAD.📥*
╭──────────────────❥
│✨ \`Title\` : ${song.title}
│⏰ \`Duration\` : ${song.timestamp}
│👀 \`Views\` : ${song.views}
│ 📅 \`Uploaded\` : ${song.ago}
│ 📺 \`Channel\` : ${song.author.name}
╰──────────────────❥
> _*Powered By Manaofc*_ 
`;

                const buttons = [
                    { buttonId: `${prefix}yta ${song.url}`, buttonText: { displayText: "AUDIO TYPE 🎙" }, type: 1 },
                    { buttonId: `${prefix}ytd ${song.url}`, buttonText: { displayText: "DOCUMENT TYPE 📁" }, type: 1 },
                ];

                const buttonMessage = {
                    image: song.thumbnail,
                    caption: caption,
                    footer: "> _Powered By Manaofc_",
                    buttons: buttons,
                    headerType: 4,
                };

                await socket.buttonMessage(from, buttonMessage, mek);
            } catch (e) {
                console.log(e);
                reply("❌ *An error occurred while searching!*");
            }
        }
    );

    /* ================== AUDIO DOWNLOAD ================== */
cmd(
  {
    pattern: "yta",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename,
  },
  async (socket, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ *Please provide a YouTube URL!*");
      }

      // React loading
      await socket.sendMessage(from, {
        react: { text: "⬇️", key: mek.key },
      });

      const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytmp3?url=${encodeURIComponent(q)}&apikey=abcab1bf06ab4a65`;

      const response = await axios.get(apiUrl, {
        timeout: 30000,
      });

      const data = response.data;

      // Check API response
      if (!data?.status || !data?.data?.download) {
        return reply("❌ *Failed to fetch audio!*");
      }

      const {
        download,
        thumbnail,
      } = data.data;

      // Send thumbnail + info
      await socket.sendMessage(
        from,
        {
          image: { url: thumbnail },
          caption: `🎵 *manaofc  Audio Download*`,
        },
        { quoted: mek }
      );

      // Send audio
      await socket.sendMessage(
        from,
        {
          audio: { url: download },
          mimetype: "audio/mpeg",
          ptt: false,
        },
        { quoted: mek }
      );

      // Success react
      await socket.sendMessage(from, {
        react: { text: "✔️", key: mek.key },
      });
    } catch (err) {
      console.log("YTA ERROR:", err);

      reply("❌ *Audio download failed!*");
    }
  }
);

/* ================== DOCUMENT DOWNLOAD ================== */
cmd(
  {
    pattern: "ytd",
    react: "📁",
    dontAddCommandList: true,
    filename: __filename,
  },
  async (socket, mek, m, { from, q, reply }) => {
    try {
      if (!q) {
        return reply("❌ *Please provide a YouTube URL!*");
      }

      // Loading react
      await socket.sendMessage(from, {
        react: { text: "⬇️", key: mek.key },
      });

      const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytmp3?url=${encodeURIComponent(q)}&apikey=abcab1bf06ab4a65`;

      const response = await axios.get(apiUrl, {
        timeout: 30000,
      });

      const data = response.data;

      // Validate response
      if (!data?.status || !data?.data?.download) {
        return reply("❌ *Failed to fetch document!*");
      }

      const {
        download,
        thumbnail,
      } = data.data;

      // Send preview image
      await socket.sendMessage(
        from,
        {
          image: { url: thumbnail },
          caption: `📁 *manaofc  Document Download*`,
        },
        { quoted: mek }
      );

      // Send document
      await socket.sendMessage(
        from,
        {
          document: { url: download },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`,
        },
        { quoted: mek }
      );

      // Success react
      await socket.sendMessage(from, {
        react: { text: "✔️", key: mek.key },
      });
    } catch (err) {
      console.log("YTD ERROR:", err);

      reply("❌ *Document download failed!*");
    }
  }
);
//========== xvideo download ============
cmd({
    pattern: "xvideo",
    desc: "Search xvideos",
    use: ".xnxx <query>",
    react: "🔞",
    category: "download",
    filename: __filename
},

async (conn, mek, m, { from, prefix, q, reply }) => {
try {

if (!q) return reply("*Please enter a search query!*")

// API SEARCH
const res = await fetchJson(`https://api.giftedtech.co.ke/api/search/xvideossearch?apikey=gifted&query=${encodeURIComponent(q)}`)

if (!res.success || !res.results || res.results.length === 0) {
return reply("*❌ No results found!*")
}

let results = res.results

// limit buttons
const rows = results.slice(0,50).map((v,i)=>({
buttonId: `${prefix}xvid ${v.url}`,
buttonText:{
displayText: v.title ? v.title.slice(0,50) : `Video ${i+1}`
},
type:1
}))

const buttonMessage = {
image: config.IMAGE_PATH,
caption:`*MANAOFC LITE XVIDEO DOWNLOAD 🔞*`,
footer:`> _*Powered By Manaofc*_`,
buttons: rows,
headerType:4
}

return await socket.buttonMessage(from, buttonMessage, mek)
    } catch (e) {
      console.log(e)
      reply('*❌ Error occurred!*');
    }
  }
)


// XVIDEO DOWNLOAD

cmd({
pattern:"xvid",
react:"⬇️",
dontAddCommandList:true,
filename:__filename
},

async (socket, mek, m, { from, q, reply }) => {

try{

if(!q) return reply("*Please provide video url!*")

// API DOWNLOAD
const res = await fetchJson(`https://api.giftedtech.co.ke/api/download/xvideosdl?apikey=gifted&url=${encodeURIComponent(q)}`)

if(!res.success || !res.result) return reply("*❌ Failed to fetch video!*")

let data = res.result

let caption = `
*VIDEO DOWNLOADER*

╭──────────────❍
│ 🎬 *Title* : ${data.title || "Unknown"}
│ 👀 *Views* : ${data.views || "N/A"}
│ 👍 *Likes* : ${data.likes || "N/A"}
│ 👎 *Dislikes* : ${data.dislikes || "N/A"}
│ 📦 *Size* : ${data.size || "Unknown"}
╰──────────────❍
`

await socket.sendMessage(from,{ react:{ text:"⬆️", key: mek.key }})

// send thumbnail + info
await socket.sendMessage(from,{
image:{ url: data.thumbnail },
caption: caption
},{quoted: mek})

// send video
await socket.sendMessage(from,{
video:{ url: data.download_url },
mimetype:"video/mp4"
},{quoted: mek})

await socket.sendMessage(from,{ react:{ text:"✅", key: mek.key }})

}catch(e){
console.log(e)
reply("*❌ Download failed!*")
}

})


cmd(
  {
    pattern: "apk",
    react: "📦",
    alias: ["app", "playstore"],
    category: "download",
    use: ".apk *<Apk Name>*",
    filename: __filename,
  },
  async (socket, mek, m, { from, prefix, q, reply }) => {
    try {
      if (!q) return await reply(imgMsg, mek);
      const data = await apkdl.search(q);
      if (!data.length) return await reply("*couldn't find anything*");

      const rows = data.map(v => ({
        buttonId: `${prefix}dapk ${v.id}`,
        buttonText: { displayText: `${v.name}` },
        type: 1,
      }));

      const buttonMessage = {
        image: config.IMAGE_PATH,
        caption: `*MANAOFC LITE APK DOWNLOAD.* 📦`,
        footer: '> _*Powered By Manaofc*_ ',
        buttons: rows,
        headerType: 4,
      };

      return await socket.buttonMessage(from, buttonMessage, mek);
    } catch (e) {
      console.error(e);
      reply("*ERROR !!*");
    }
  }
);

cmd(
  {
    pattern: "dapk",
    react: "📦",
    dontAddCommandList: true,
    filename: __filename,
  },
  async (socket, mek, m, { from, q, reply }) => {
    try {
      await socket.sendMessage(from, { react: { text: "🌟", key: mek.key } });
      if (!q) return await reply("*Need apk link...❗*");

      const data = await apkdl.download(q);
      const caption = `📥 *MANAOFC LITE APK DOWNLOAD* 📥\n\n` +
        `◈ *🏷️  :* ${data.name}\n` +
        `◈ *👤 Developers :* ${data.package}\n` +
        `◈ *📆 Last Update :* ${data.lastup}\n` +
        `◈ *📥 Size :* ${data.size}\n\n> _*Powered By Manaofc*_`;

      await socket.sendMessage(from, { image: { url: data.icon }, caption }, { quoted: mek });

      await socket.sendMessage(from, {
        document: { url: data.dllink },
        mimetype: "application/vnd.android.package-archive",
        fileName: `${data.name}.apk`,
        caption: '> _*Powered By Manaofc*_ ',
      }, { quoted: mek });
      
      await socket.sendMessage(from, { react: { text: "✔", key: mek.key } });
    } catch (e) {
      console.error(e);
      reply(`_An Error Found_ : *${e}*`);
    }
  }
);
/* ================== FACEBOOK DOWNLOAD ================== */

cmd({
pattern: "facebook",
react: "📥",
alias: ["fb","fbdl"],
category: "download",
use: ".facebook <facebook url>",
filename: __filename
},
async (sock, mek, m, { from, prefix, q, reply }) => {

try {

if (!q) return reply("❌ *Please provide a Facebook URL!*")

const api = `https://api.giftedtech.co.ke/api/download/facebookv2?apikey=gifted&url=${encodeURIComponent(q)}`

const res = await axios.get(api)
const data = res.data

if (!data.success) return reply("❌ *Failed to fetch Facebook video!*")

const vid = data.result

const caption = `
*📥 MANAOFC LITE FACEBOOK DOWNLOADER*
╭──────────────❍
│ *Title* : ${vid.title}
│ *Duration* : ${vid.duration}
│ *Uploader* : ${vid.uploader}
│ *Views* : ${vid.view_count}
╰──────────────❍

*Select Video Quality*
`

const buttons = [
{ buttonId: `${prefix}fbq 0 ${q}`, buttonText:{displayText:"1920p HD 🎬"}, type:1 },
{ buttonId: `${prefix}fbq 1 ${q}`, buttonText:{displayText:"1280p HD 📽"}, type:1 },
{ buttonId: `${prefix}fbq 2 ${q}`, buttonText:{displayText:"960p 📹"}, type:1 },
{ buttonId: `${prefix}fbq 3 ${q}`, buttonText:{displayText:"640p 📱"}, type:1 }
]

const buttonMessage = {
image: vid.thumbnail,
caption:caption,
footer:"> _*Powered By Manaofc*_",
buttons:buttons,
headerType:4
}

await sock.buttonMessage(from, buttonMessage, mek)

}catch(e){
console.log(e)
reply("❌ Error fetching Facebook video!")
}

})

/* ================== FACEBOOK QUALITY DOWNLOAD ================== */

cmd({
pattern: "fbq",
react: "⬇️",
dontAddCommandList: true,
filename: __filename
},
async (sock, mek, m, { from, q, reply }) => {

try {

if(!q) return reply("❌ Invalid request!")

const args = q.split(" ")
const qualityIndex = args[0]
const url = args.slice(1).join(" ")

const api = `https://api.giftedtech.co.ke/api/download/facebookv2?apikey=gifted&url=${encodeURIComponent(url)}`

const res = await axios.get(api)
const data = res.data

if (!data.success) return reply("❌ Video not found!")

const links = data.result.links

if(!links[qualityIndex]) return reply("❌ Quality not available!")

const videoUrl = links[qualityIndex].url
const quality = links[qualityIndex].quality

await sock.sendMessage(from,{
video:{url:videoUrl},
caption:`🎬 *Facebook Video Downloaded*\n\n📺 Quality : ${quality}\n\n> _*Powered By Manaofc*_`
},{quoted:mek})

}catch(e){
console.log(e)
reply("❌ Download failed!")
}

})
/* ================== TIKTOK DOWNLOAD ================== */
cmd({
    pattern: "tiktok",
    react: "🎬",
    alias: ["tt", "ttdl"],
    category: "download",
    use: ".tiktok <tiktok url>",
    filename: __filename
},
async (socket, mek, m, { from, prefix, q, reply }) => {
    try {

        if (!q) return reply("❌ *Please provide a TikTok URL!*");

        const api = `https://api.giftedtech.co.ke/api/download/tiktok?apikey=gifted&url=${encodeURIComponent(q)}`;

        const res = await axios.get(api);
        const data = res.data;

        if (!data.success) return reply("❌ *Failed to download TikTok video!*");

        const vid = data.result;

        const caption = `
*🎬 MANAOFC LITE TIKTOK DOWNLOAD 📥*
╭──────────────────❥
│✨ \`Title\` : ${vid.title}
│⏱ \`Duration\` : ${vid.duration}s
│👤 \`Author\` : ${vid.author.name}
╰──────────────────❥
> _*Powered By Manaofc*_
`;

        const buttons = [
            { buttonId: `${prefix}ttvid ${q}`, buttonText: { displayText: "VIDEO 🎥" }, type: 1 },
            { buttonId: `${prefix}ttmusic ${q}`, buttonText: { displayText: "AUDIO 🎵" }, type: 1 }
        ];

        const buttonMessage = {
            image: vid.cover,
            caption: caption,
            footer: "> _Powered By Manaofc_",
            buttons: buttons,
            headerType: 4
        };

        await socket.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log(e);
        reply("❌ *Error downloading TikTok!*");
    }
});


/* ================== TIKTOK VIDEO ================== */
cmd({
    pattern: "ttvid",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {
    try {

        const api = `https://api.giftedtech.co.ke/api/download/tiktok?apikey=gifted&url=${encodeURIComponent(q)}`;
        const res = await axios.get(api);
        const data = res.data;

        if (!data.success) return reply("❌ *Video not found!*");

        await socket.sendMessage(from, {
            video: { url: data.result.video },
            caption: "🎬 *TikTok Video Downloaded*\n\n> _*Powered By Manaofc*_"
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ *Video download failed!*");
    }
});


/* ================== TIKTOK AUDIO ================== */
cmd({
    pattern: "ttmusic",
    react: "🎵",
    dontAddCommandList: true,
    filename: __filename
},
async (socket, mek, m, { from, q, reply }) => {
    try {

        const api = `https://api.giftedtech.co.ke/api/download/tiktok?apikey=gifted&url=${encodeURIComponent(q)}`;
        const res = await axios.get(api);
        const data = res.data;

        if (!data.success) return reply("❌ *Audio not found!*");

        await socket.sendMessage(from, {
            audio: { url: data.result.music },
            mimetype: "audio/mpeg"
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ *Audio download failed!*");
    }
});

  
// Mapping common file extensions to MIME types
//================ MIME TYPES =================//

const mimeTypes = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",

  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",

  ".pdf": "application/pdf",

  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",

  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",

  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",

  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  ".apk": "application/vnd.android.package-archive",
  ".exe": "application/octet-stream"
}

// Function to format file size
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const maxSize = 4 * 1024 * 1024 * 1024; // 4GB size limit

async function MegaDl(url) {
  let res = { error: true };

  if (!url) return res;

  try {
    const file = File.fromURL(url);
    await file.loadAttributes();

    const fileExtension = path.extname(file.name).toLowerCase();
    const mimeType = mimeTypes[fileExtension] || "application/octet-stream"; // Default MIME type for unknown file types

    // Check file size
    if (file.size > maxSize) {
      return { error: true, message: "File size exceeds the 4GB limit." };
    }

    const fileInfo = {
      fileName: file.name,
      fileSize: formatBytes(file.size),
      fileSizeb: file.size,
      mimeType: mimeType
    };

    // Download file buffer
    const data = await file.downloadBuffer();

    return {
      error: false,
      fileInfo: fileInfo,
      data: data
    };
  } catch (e) {
    console.log(e);
    return res;
  }
}

// Mega command to handle Mega file download
cmd({
  pattern: "mega",
  alias: ["megadl", "meganz"],
  react: '📦',
  desc: "Download files from Mega.",
  category: "download",
  use: '.mega *<Mega URL>*',
  filename: __filename
},
async(socket, mek, m, { from, q, reply }) => {
  try {
    if (!q) return await reply('*Please provide a Mega URL!*');

    // Call MegaDl function to get file metadata and download URL
    let res = await MegaDl(q);

    if (res.error) {
      return await reply(res.message || "An error occurred while processing the Mega URL.");
    }

    const { fileInfo, data } = res;
    const { fileName, mimeType, fileSizeb } = fileInfo;

    // Check file size (4GB)
    if (fileSizeb > maxSize) {
      return await socket.sendMessage(from, { text: '🚩 *File size is too big...*' }, { quoted: mek });
    }

    // Prepare message with file metadata
    const caption = `*◈ File name:*  ${fileName}
*◈ File Size:* ${fileInfo.fileSize}
*◈ File type:* ${mimeType}

> _*Powered By Manaofc*_`;

    // Send the file to the user
    const message = {
      document: data,
      mimetype: mimeType,
      fileName: fileName,
      caption: caption,
    };

    await socket.sendMessage(from, message, { quoted: mek });

  } catch (e) {
    console.log(e); // Log the error
    reply(`${e}`); // Send the error message to the user
  }
});


function getMimeType(fileName){
  const ext = path.extname(fileName).toLowerCase()
  return mimeTypes[ext] || "application/octet-stream"
}

function getFileType(mime){
  if(mime.startsWith("image")) return "image"
  if(mime.startsWith("video")) return "video"
  if(mime.startsWith("audio")) return "audio"
  return "document"
}


//================ GOOGLE DRIVE =================//

cmd({
pattern: "gdrive",
alias: ["googledrive"],
react: "📁",
desc: "Download Google Drive files",
category: "download",
use: ".gdrive <url>",
filename: __filename
},
async(socket, mek, m, {from, q, reply}) => {

try{

if(!q) return reply("📁 Please provide a Google Drive URL")

let api = `https://api.giftedtech.co.ke/api/download/gdrivedl?apikey=gifted&url=${encodeURIComponent(q)}`

let res = await axios.get(api)
let data = res.data

if(!data.success) return reply("❌ Download failed")

let name = data.result.name
let url = data.result.download_url

let mime = getMimeType(name)
let type = getFileType(mime)

reply("⬇️ Downloading file...")

await socket.sendMessage(from,{
[type]:{url:url},
mimetype:mime,
fileName:name,
caption:`📁 *Google Drive File*\n\n📄 Name: ${name}`
},{quoted:mek})

}catch(err){
console.log(err)
reply("❌ Error downloading file")
}

})


//================ MEDIAFIRE =================//

cmd({
pattern: "mediafire",
alias: ["mfire"],
react: "📁",
desc: "Download MediaFire files",
category: "download",
use: ".mediafire <url>",
filename: __filename
},
async(socket, mek, m, {from, q, reply}) => {

try{

if(!q) return reply("📁 Please provide a MediaFire URL")

let api = `https://api.giftedtech.co.ke/api/download/mediafire?apikey=gifted&url=${encodeURIComponent(q)}`

let res = await axios.get(api)
let data = res.data

if(!data.success) return reply("❌ Download failed")

let file = data.result

let mime = getMimeType(file.fileName)
let type = getFileType(mime)

let info = `
📁 *MANAOFC LITE MEDIAFIRE DOWNLOADER*

📄 Name : ${file.fileName}
📦 Size : ${file.fileSize}
📑 Type : ${file.fileType}
🌍 Uploaded From : ${file.uploadedFrom}
📅 Uploaded On : ${file.uploadedOn}
`

await socket.sendMessage(from,{text:info},{quoted:mek})

reply("⬇️ Sending file...")

await socket.sendMessage(from,{
[type]:{url:file.downloadUrl},
mimetype:mime,
fileName:file.fileName
},{quoted:mek})

}catch(err){
console.log(err)
reply("❌ Error downloading file")
}

})
