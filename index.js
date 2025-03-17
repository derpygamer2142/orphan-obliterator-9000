import * as fs from "fs"
import * as zip from "jszip"
import obliterate from "./obliterate.js"

const PROJECTNAME = "NES Emulator v1.0.0"
const COMPRESS = true // whether to compress the project
let PATH = process.argv[2] ?? __dirname + "/" + PROJECTNAME + ".sb3";
const JSZip = new zip()

(async () => {
    const startTime = Date.now()

    console.log("Reading file...")
    let fileRead
    try {
        fileRead = fs.readFileSync(PATH)
    }
    catch (error) {
        console.error("Failed to read file:", error)
        console.error("Did you remember to pass in a file path?")
        return
    }
    const data = obliterate(await JSZip.loadAsync(fileRead), COMPRESS)
    
    data.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE" }).pipe(fs.createWriteStream(__dirname + "/" + PROJECTNAME + " PATCHED.sb3")).on("finish", () => {
        console.log(`Finished in ${Date.now() - startTime}ms`)
    })
})()

