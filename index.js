const JSZip = require("jszip")
const fs = require("fs")

const PROJECTNAME = "Butter Engine Release 1.2"

const PATH = __dirname + "/" + PROJECTNAME + ".sb3";

// only from base palette
const HATOPCODES = ["procedures_definition", "event_whenflagclicked", "event_whenkeypressed", "event_whenstageclicked", "event_whenthisspriteclicked", "event_whenbackdropswitchesto", "event_whengreaterthan", "event_whenbroadcastreceived", "control_start_as_clone"]

let deleted = 0;
let whatTheFuck = 0;
let orphans = 0;


(async () => {
    const data = await JSZip.loadAsync(fs.readFileSync(PATH))

    const project = JSON.parse(await data.file("project.json").async("string"))
    
    project.targets.forEach((target) => {
        const blocks = target.blocks

        function remove(id) {
            const block = blocks[id]

            Object.keys(block.inputs).forEach((input) => {
                if (input[1] && typeof input[1] === "string") {
                    remove(input[1])
                }
                else {
                    console.error("Freaky input", block, input)
                }
            })

            Object.keys(block)
        }

        const keys = Object.keys(blocks)
        for (const id of keys) {
            const block = target.blocks[id]
            

            let check = block.parent
            let last = id

            let stack = []
            while (check) {
                if (check && !Object.prototype.hasOwnProperty.call(blocks, check)) {
                    console.log("😨 what", check)
                    whatTheFuck++ 
                    break
                }
                last = check
                stack.push(last)
                check = blocks[check]?.parent
                if (stack.includes(check)) {
                    console.log("😨😨 what????", check)
                    whatTheFuck++
                    break
                }
            }

            if (!HATOPCODES.includes(blocks[last]?.opcode)) {
                console.log("found orphan:", last)
                orphans++
            }

        }
    })

    console.log("Extra freaky blocks found: ", whatTheFuck)
    console.log("Orphans found:", orphans)
})()

