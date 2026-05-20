const { cmd } = require('../command')
const yts = require("yt-search")
const { isUrl } = require('../../lib/functions')

function ytreg(url) {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    return ytIdRegex.test(url);
}
cmd({
    pattern: "yts",
    alias: ["y"],
    use: ".yts ",
    react: "🔎",
    desc: "Search Youtube Songs or Videos.",
    category: "search",
    filename: __filename

},
async (socket, mek, m, { from, q, reply }) => {
try{
if (!q) return await reply(imgmsg)
if(isUrl(q) && !ytreg(q)) return await reply(imgmsg)
try {
var arama = await yts(q);
} catch(e) {
    l(e)
return await socket.sendMessage(from , { text: '*Error !!*' }, { quoted: mek } )
}
var mesaj = '';
arama.all.map((video) => {
mesaj += ' *◈ ' + video.title + '*\n🔗 ' + video.url + '\n\n> _*Powered By Manaofc*_ '
});
await socket.sendMessage(from , { text:  mesaj }, { quoted: mek } )
} catch (e) {
    console.log(e)
  reply('*Error !!*')
}

});
