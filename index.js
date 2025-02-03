const JSZip = require("jszip")
const fs = require("fs")

/*
save override

vm.skibidi = vm.toJSON;
vm.toJSON = (a, b) => {
    b = b ?? {};
    b.allowOptimization = false;
    return vm.skibidi(a, b);
};

*/

const PROJECTNAME = "Butter Engine Release 1.2 orphaned"

const PATH = __dirname + "/" + PROJECTNAME + ".sb3";

// only from base palette
const HATOPCODES = ["procedures_definition", "event_whenflagclicked", "event_whenkeypressed", "event_whenstageclicked", "event_whenthisspriteclicked", "event_whenbackdropswitchesto", "event_whengreaterthan", "event_whenbroadcastreceived", "control_start_as_clone"]

let deleted = 0;
let whatTheFuck = 0;
let orphans = 0;

function findVariableByName(name, target, project) {
    const stage = project.targets.findIndex((t) => t.isStage)
    let variable = null
    let id = Object.keys(stage.variables).find((value) => stage.variables[value][0] === name) // look for the variable in the stage
    if (!id) { // look for it as a list in the stage
        id = Object.keys(stage.lists).find((value) => stage.lists[value][0] === name) 
        variable = stage.lists[id]
    }
    else variable = stage.variables[id]
    
    if (!id) {
        id = Object.keys(target.variables).find((value) => target.variables[value][0] === name) // look for the variable in the target
        variable = target.variables[id]
    }
    if (!id) { // look for it as a list in the target
        id = Object.keys(target.lists).find((value) => target.lists[value][0] === name)
    }
    
    
}

function getOrphaned(id, blocks) {
    let check = blocks[id]?.parent
    let last = id
    let stack = []
    
    while (check && !blocks[check]?.orphaned && !blocks[last]?.orphaned) { // locate the top block in a given stack that isn't orphaned
        if (check && !Object.prototype.hasOwnProperty.call(blocks, check)) {
            // block is located in a different sprite, or it doesn't exist
            // console.log("😨 what", check)
            return true
        }

        
        for (const input of Object.values(blocks[check].inputs)) {
            if (input[1] && typeof input[1] === "string") {
                if (!Object.prototype.hasOwnProperty.call(blocks, input[1])) return true // if one of its children doesn't exist it's probably broken
                if (blocks[input[1]]?.parent !== check) return true // the child needs to confirm that this block is its parent
                
            }
        }

        // if the next block doesn't exist that's bad
        if (blocks[check].next && !Object.prototype.hasOwnProperty.call(blocks, blocks[check].next)) return true

        // the block's parent needs to say that this block is its child
        // console.log(Object.values(blocks[blocks[check]?.parent] ?? {}))
        const parent = blocks[check].parent
        if (parent && blocks[parent]?.next !== check) {
            const values = Object.values(blocks[parent]?.inputs ?? {})
            // console.log((values[0] ?? []) [1], check)
            if (!values.some((v) => v[1] && v[1] === check)) return true
        }

        if (stack.includes(check)) {
            // a block in this stack is its own parent somehow, we need to keep it from getting stuck
            return true
        }



        last = check
        stack.push(last)
        check = blocks[check]?.parent

    }

    return !HATOPCODES.includes(blocks[last]?.opcode)
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

        const keys = Object.keys(blocks)
        for (const id of keys) {
            if (Array.isArray(target.blocks[id])) {
                // idk what these are but we're going to remove them anyways
                // they're only present in the ghost block version and they don't have any references to/from them
                deleted++
                delete target.blocks[id]
                continue
            }
            
            const orphaned = getOrphaned(id, blocks)

            if (orphaned) {
                blocks[id].orphaned = true

                orphans++
            }

        }
        console.log("Finished target " + target?.name)
    })


    console.log("Finished checking targets, removing orphans...")
    project.targets.forEach((target) => {
        Object.keys(target.blocks).forEach((id) => {
            if (target.blocks[id].orphaned) {
                deleted++
                delete target.blocks[id]
            }
        })
    })

    // console.log("Extra freaky blocks found: ", whatTheFuck)
    console.log("Orphans found:", orphans)
    console.log("Deleted blocks:", deleted)
    console.log("Rezipping and writing...")
    data.file("project.json", JSON.stringify(project))
    data.generateNodeStream({ type: "nodebuffer", streamFiles: true }).pipe(fs.createWriteStream(__dirname + "/" + PROJECTNAME + " PATCHED.sb3")).on("finish", () => {
        console.log(`Finished in ${Date.now() - startTime}ms`)
    })


    
})()

