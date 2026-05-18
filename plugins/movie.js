const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { cmd } = require("../command");
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
