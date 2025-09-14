/** @format */

import { system, BlockPermutation } from "@minecraft/server";

// This constant holds the name of the custom slab state.
// This is used to check if the block being placed is a slab.
const SLAB_STATE_NAME = "kado:slab_type";

// Listen for the event that occurs *before* a player places a block.
/** @type {import("@minecraft/server").BlockCustomComponent} */
const slabBlockComponent = {
	beforeOnPlayerPlace(event) {
		const { block, player, dimension } = event;

		// Get the block identifier from the block place event.
		const slabIdentifier = block.event.typeId;

		// The block is the one the player is placing a block *into*.
		// The hitBlock is the block the player is interacting with to place a new block.
		const hitBlock = player.getLookingAtBlock();
		if (!hitBlock) {
			return;
		}

		// Get the location of the face the player clicked on.
		// This is a coordinate relative to the block's origin (0, 0, 0)
		const faceLocation = event.faceLocation;
		if (!faceLocation) {
			return;
		}

		// Check if the block the player is trying to place on is already a slab.
		// This handles the "double slab" case.
		if (hitBlock.typeId === slabIdentifier) {
			const slabPermutation = hitBlock.permutation;
			const currentType = slabPermutation.getState(SLAB_STATE_NAME);

			// If the current slab is "bottom" and the player clicks the top half,
			// or if it's "top" and the player clicks the bottom half, make it a double slab.
			const isTopHalf = faceLocation.y > 0.5;
			const newType = isTopHalf ? "top" : "bottom";

			// If the player clicks on the opposite half of an existing slab, combine them.
			if (
				(currentType === "bottom" && newType === "top") ||
				(currentType === "top" && newType === "bottom")
			) {
				event.cancel = true; // Cancel the default placement
				// Set the block at the hit location to a "double" state.
				const newPermutation = BlockPermutation.resolve(slabIdentifier, {
					[SLAB_STATE_NAME]: "double",
				});
				hitBlock.setPermutation(newPermutation);
			}
			return;
		}

		// This handles the initial placement of a new slab (bottom or top).
		// `event.block` is the block that will be *replaced* with the new slab.
		const targetBlock = dimension.getBlock(event.block.location);

		// Check the player's y-coordinate relative to the block's center.
		// This is a reliable way to determine if they're aiming at the top or bottom half for initial placement.
		const playerY = player.location.y;
		const blockYCenter = targetBlock.location.y + 0.5;
		const isTopHalfPlacement = playerY > blockYCenter;

		// Cancel the default block placement.
		event.cancel = true;

		// Create the new permutation for the slab.
		const newType = isTopHalfPlacement ? "top" : "bottom";
		const newPermutation = BlockPermutation.resolve(slabIdentifier, {
			[SLAB_STATE_NAME]: newType,
		});

		// Place the block with the correct state.
		targetBlock.setPermutation(newPermutation);
	},
	catch(e) {
		// You can log any errors for debugging.
		console.warn(`[Slab Behavior] An error occurred: ${e.message}`);
	},
};
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
});
