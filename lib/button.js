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

module.exports = {
  writeJSON,
  updateCMDStore,
  isbtnID,
  getCMDStore,
  getCmdForCmdId,
};
