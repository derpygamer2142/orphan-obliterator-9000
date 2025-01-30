const JSZip = require("jszip")
const fs = require("fs")

const PROJECTNAME = "Butter Engine Release 1.2"

const PATH = __dirname + "/" + PROJECTNAME + ".sb3";

// only from base palette
const HATOPCODES = ["procedures_definition", "event_whenflagclicked", "event_whenkeypressed", "event_whenstageclicked", "event_whenthisspriteclicked", "event_whenbackdropswitchesto", "event_whengreaterthan", "event_whenbroadcastreceived", "control_start_as_clone"]

let deleted = 0;
let whatTheFuck = 0;
let orphans = 0;

function getParent(id, blocks) {
    let check = blocks[id]?.parent
    let last = id

    let stack = []
    let freaky = false
    while (check) { // locate the top block in a given stack
        freaky = false
        if (check && !Object.prototype.hasOwnProperty.call(blocks, check)) {
            // block is located in a different sprite, or it doesn't exist
            // console.log("😨 what", check)
            freaky = true
            break
        }
        last = check
        stack.push(last)
        check = blocks[check]?.parent
        if (stack.includes(check)) {
            // a block in this stack is its own parent somehow, we need to keep it from getting stuck
            freaky = true
            break
        }

    }

    return {
        freaky: freaky,
        id: last
    }
}

(async () => {
    console.log("Reading file...")
    const data = await JSZip.loadAsync(fs.readFileSync(PATH))

    console.log("Parsing json...")
    const project = JSON.parse(await data.file("project.json").async("string"))
    
    console.log("Ready!")
    const startTime = Date.now()

    project.targets.forEach((target) => {
        console.log("Checking target " + target?.name + "...")
        const blocks = target.blocks

        let restartIDs = []

        function remove(id) {
            let rTarget = target // local variable or something
            if (!Object.prototype.hasOwnProperty.call(rTarget.blocks, id)) {
                rTarget = project.targets.find((t) => Object.prototype.hasOwnProperty.call(t.blocks, id)) 
                // sometimes the block is located in a different sprite, so we need to look for the id across all the sprites
                // NOTE: the same block id can be in different sprites, so this might cause unforseen consequences(half life reference????)
                if (!rTarget) { // id doesn't exist, all references to this id will be deleted during the higher recursion step
                    return
                }
            }
            const block = rTarget.blocks[id]

            Object.keys(block.inputs).forEach((input) => {
                // input[1] is probably the id, idk though
                // sometimes a block might not actually be a parent, we need to check for this to avoid deleting every block(for some reason)
                if (input[1] && typeof input[1] === "string" && rTarget.blocks[input[1]]?.parent === id ) {
                    try {
                        remove(input[1]) 
                    }
                    catch (error) {
                        if (error instanceof RangeError) restartIDs.push(input[1]) // we reached the recursion limit, just push the id to a stack and we can restart
                        else throw error // probably important
                    }
                }
                else {
                    // console.error("Freaky input", block, input)
                }
            })

            // i'm like 60% sure block.fields is only used for menus that don't accept inputs
            deleted++
            delete rTarget.blocks[id]
        }

        const keys = Object.keys(blocks)
        for (const id of keys) {
            if (Array.isArray(target.blocks[id])) {
                // idk what these are but we're going to remove them anyways
                // they're only present in the ghost block version
                deleted++
                delete target.blocks[id]
            }
            /*const block = target.blocks[id]
            

            let check = block.parent
            let last = id

            let stack = []
            let freaky = false
            while (check) { // locate the top block in a given stack
                freaky = false
                if (check && !Object.prototype.hasOwnProperty.call(blocks, check)) {
                    // block is located in a different sprite, or it doesn't exist
                    // console.log("😨 what", check)
                    whatTheFuck++
                    freaky = true
                    break
                }
                last = check
                stack.push(last)
                check = blocks[check]?.parent
                if (stack.includes(check)) {
                    // a block in this stack is its own parent somehow, we need to keep it from getting stuck
                    // console.log("😨😨 what????", check)
                    whatTheFuck++
                    freaky = true
                    break
                }

            }*/
           const parent = getParent(id, blocks)

            if (!HATOPCODES.includes(blocks[parent.id]?.opcode)/* && parent.freaky*/) {
                // console.log(blocks[parent.id]?.opcode)
                // console.log("found orphan:", last)
                orphans++

                // remove the orphan
                remove(parent.id)
                // if (parent.id === "i,") console.error("wdiuhaytgufgeh")
                // break
                while (restartIDs.length > 0) {
                    remove(restartIDs.shift())
                }
                
            }

        }
        console.log("Finished target " + target?.name)
    })


    console.log("Finished initial search, looking for remaining orphans...")
    project.targets.forEach((target) => {
        Object.keys(target.blocks).forEach((id) => {
            if (id === "pc") {
                console.log(target.blocks[id]?.parent, target.blocks[target.blocks[id]?.parent])
            }
            if (target.blocks[id]?.parent && !target.blocks[target.blocks[id]?.parent]) {
                // console.log("Secondary cleanup deletion")
                deleted++
                delete target.blocks[id]
            }
        })
    })

    // console.log("Extra freaky blocks found: ", whatTheFuck)
    // console.log("Orphans found:", orphans)
    console.log("Deleted blocks:", deleted)
    console.log("Rezipping and writing...")
    data.file("project.json", JSON.stringify(project))
    data.generateNodeStream({ type: "nodebuffer", streamFiles: true }).pipe(fs.createWriteStream(__dirname + "/" + PROJECTNAME + " PATCHED.sb3")).on("finish", () => {
        console.log(`Finished in ${Date.now() - startTime}ms`)
    })


    
})()

