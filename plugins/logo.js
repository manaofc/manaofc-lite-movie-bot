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
