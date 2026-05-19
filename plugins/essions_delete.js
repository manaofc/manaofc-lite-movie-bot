cmd(
{
    pattern: "confirm",
    react: "🗑️",
    alias: ["delsession", "delete"],
    category: "system",
    use: ".confirm",
    filename: __filename,
},
async (socket, mek, m, { from, sender, reply }) => {

    try {

        const sanitizedNumber = sender.split("@")[0].replace(/[^0-9]/g, '');

        await socket.sendMessage(from, {
            text: '🗑️ Deleting your session...\n\n> © *ᴛʜɪꜱ ʙᴏᴛ ᴩᴏᴡᴇʀᴇᴅ ʙy ᴍᴀɴᴀᴏꜰᴄ*'
        }, { quoted: mek });

        try {

            // CLOSE ACTIVE SOCKET
            const userSocket = activeSockets.get(sanitizedNumber);

            if (userSocket) {
                userSocket.ws.close();

                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
            }

            // DELETE SESSION FOLDER
            const sessionPath = path.join(
                SESSION_BASE_PATH,
                `session_${sanitizedNumber}`
            );

            if (fs.existsSync(sessionPath)) {
                fs.removeSync(sessionPath);
            }

            // DELETE GITHUB SESSION
            if (octokit) {
                await deleteSessionFromGitHub(sanitizedNumber);
            }

            // REMOVE NUMBER FROM LIST
            let numbers = [];

            if (fs.existsSync(NUMBER_LIST_PATH)) {
                numbers = JSON.parse(
                    fs.readFileSync(NUMBER_LIST_PATH, 'utf8')
                );
            }

            const index = numbers.indexOf(sanitizedNumber);

            if (index !== -1) {

                numbers.splice(index, 1);

                fs.writeFileSync(
                    NUMBER_LIST_PATH,
                    JSON.stringify(numbers, null, 2)
                );
            }

            await socket.sendMessage(from, {
                text: '✅ Your session has been successfully deleted!\n\n> © *ᴛʜɪꜱ ʙᴏᴛ ᴩᴏᴡᴇʀᴇᴅ ʙy ᴍᴀɴᴀᴏꜰᴄ*'
            }, { quoted: mek });

        } catch (error) {

            console.log('DELETE SESSION ERROR:', error);

            await socket.sendMessage(from, {
                text: '❌ Failed to delete your session.\nPlease try again later.\n\n> © *ᴛʜɪꜱ ʙᴏᴛ ᴩᴏᴡᴇʀᴇᴅ ʙy ᴍᴀɴᴀᴏꜰᴄ*'
            }, { quoted: mek });

        }

    } catch (e) {

        console.log(e);

        reply("❌ Error while deleting session.");

    }

});
