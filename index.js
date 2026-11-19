import * as fs from "fs"
import zip from "jszip"
import obliterate from "./obliterate.js"

const COMPRESS = true // whether to compress the project
if (process.argv.length < 3) console.error("Usage: node index.js my project with spaces in the name.sb3")
else

(async () => {
    let PATH = process.argv.slice(2).join(" ")
    const JSZip = new zip();

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
    const data = await obliterate(await JSZip.loadAsync(fileRead), COMPRESS)
    
    const outputPath = PATH.slice(0, PATH.lastIndexOf(".")) + " PATCHED" + PATH.slice(PATH.lastIndexOf("."))
    data.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE" }).pipe(fs.createWriteStream(outputPath)).on("finish", () => {
        console.log(`Finished in ${Date.now() - startTime}ms`)
    })
})()

