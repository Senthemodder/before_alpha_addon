import { BlockPermutation } from "@minecraft/server";

/**
 * Builds a safe 5x5 landing platform at y=64 and clears air at y=65..67.
 * @param {import("@minecraft/server").Dimension} dimension - The destination dimension object.
 * @param {number|{x: number, y: number, z: number}} x - Center X coordinate or location object.
 * @param {number} [y=65] - Target spawn Y coordinate.
 * @param {number} [z=0] - Center Z coordinate.
 */
export function buildSafeLandingPlatform(dimension, x = 0, y = 65, z = 0) {
    if (typeof x === "object" && x !== null) {
        y = x.y !== undefined ? x.y : 65;
        z = x.z !== undefined ? x.z : 0;
        x = x.x !== undefined ? x.x : 0;
    }

    const cx = Math.floor(x);
    const cz = Math.floor(z);

    const dimId = dimension && dimension.id ? dimension.id : "";
    let blockId = "minecraft:cobblestone";
    if (dimId === "before_alpha:java_alpha") {
        blockId = "before_alpha:alpha_cobblestone";
    } else if (dimId === "before_alpha:bedrock_beta") {
        blockId = "before_alpha:beta_cobblestone";
    }

    let platformPerm = null;
    try {
        platformPerm = BlockPermutation.resolve(blockId);
    } catch {
        try {
            platformPerm = BlockPermutation.resolve("minecraft:cobblestone");
        } catch {
            platformPerm = null;
        }
    }

    let airPerm = null;
    try {
        airPerm = BlockPermutation.resolve("minecraft:air");
    } catch {
        airPerm = null;
    }

    // Construct 5x5 platform floor at y = 64
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const bx = cx + dx;
            const bz = cz + dz;

            if (platformPerm) {
                try {
                    const floorBlock = dimension.getBlock({ x: bx, y: 64, z: bz });
                    if (floorBlock) {
                        floorBlock.setPermutation(platformPerm);
                    }
                } catch {
                    // Ignore unloaded or out-of-bounds blocks
                }
            }

            // Headroom clearance at y = 65, 66, 67 to prevent suffocation
            if (airPerm) {
                for (let dy = 65; dy <= 67; dy++) {
                    try {
                        const spaceBlock = dimension.getBlock({ x: bx, y: dy, z: bz });
                        if (spaceBlock && spaceBlock.typeId !== "minecraft:air") {
                            spaceBlock.setPermutation(airPerm);
                        }
                    } catch {
                        // Ignore
                    }
                }
            }
        }
    }
}
