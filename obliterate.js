import compress from "./twcompress.js"

/*
save override

vm.skibidi = vm.toJSON;
vm.toJSON = (a, b) => {
    b = b ?? {};
    b.allowOptimization = false;
    return vm.skibidi(a, b);
};

*/



let deleted = 0;
let totalBlocks = 0;

/**
 * 
 * @param {Object<string, object>} blocks Target.blocks
 * 
 * @returns {Set<string>} IDs of orphans
 */
function getOrphaned(blocks) {
    const checked = new Set(); // Opcodes that are reachable normally
    const hats = new Set();

    // Step 1 is to figure out which blocks are valid starting points
    for (const [id, block] of Object.entries(blocks)) {
        if (block.topLevel) {
            hats.add(id)
        }
    }

    // Step 2 is to go through each hat and see what blocks it references.
    // Since this is similar to how the compiler works, anything that doesn't get touched is probably screwy

    const stack = Array.from(hats.values())

    while (stack.length > 0) {
        const id = stack.pop()
        if (checked.has(id)) continue // In case of circular references

        checked.add(id)
        let node = blocks[id]
        for (const input of Object.values(node.inputs ?? {})) {
            if (Array.isArray(input)) {
                // Weird compressed nonsense. I don't remember how this works, seems like the id goes in the second index?
                if (typeof input[1] === "string") {
                    if (Object.prototype.hasOwnProperty.call(blocks, input[1])) stack.push(input[1])
                    else {
                        console.warn(`Found EEEEEEVILLLLL block (referenced non-existent id)! ${id}`)
                    }
                }
                else if (Array.isArray(input[1])) {
                    if (input[1].length === 3 || input[1].length == 2) {
                        // Compressed variable/text input? I really don't know
                    }
                    else {
                        console.error(`ID ${id} has weird input:`, input)
                    }
                }
                else {
                    console.error(`ID ${id} has weird input:`, input)
                }
            }
            else {
                console.error(`Unhandled input on ${id}: `, input)
            }
        }

        if (node.next) stack.push(node.next)

        // I don't think fields can have blocks
    }


    const orphans = new Set()

    // Step 3 is to go through every single block and see if it's been checked
    for (const id of Object.keys(blocks)) {
        if (!checked.has(id)) {
            orphans.add(id)
        }
    }

    return orphans
}

/**
 * @param {import("jszip")} data
 * @param {Boolean} COMPRESS
 * @returns 
 */
async function obliterate(data, COMPRESS) {

    console.log("Parsing json...")
    const project = JSON.parse(await data.file("project.json").async("string"))
    
    console.log("Ready!")
    const startTime = Date.now()

    project.targets.forEach((target) => {
        console.log(`Obliterating target ${target?.name}...`)
        const blocks = new Set(Object.keys(target.blocks))
        const orphans = getOrphaned(target.blocks)
        totalBlocks += blocks.size

        for (const id of blocks.values()) {
            if (orphans.has(id)) {
                delete target.blocks[id]
                deleted++
            }
        }
        
        console.log(`Finished obliterating target ${target?.name}`)
    })


    // console.log("Extra freaky blocks found: ", whatTheFuck)
    console.log(`Found ${totalBlocks} total blocks`)
    console.log(`Deleted ${deleted} blocks (${(100*deleted/totalBlocks).toFixed(2)}%)`)
    console.log("Rezipping and writing...")

    if (COMPRESS) {
        compress(project)
    }

    data.file("project.json", JSON.stringify(project))

    console.log(`Done in ${Date.now()-startTime}ms`)

    return data

    
}

export default obliterate