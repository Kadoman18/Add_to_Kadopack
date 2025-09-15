/** @format */

// Import necessary modules from Minecraft server API
import { system } from "@minecraft/server";

// This object will contain the handler for the 'onPlayerInteract' event
const slabBlockComponent = {
	// Handles all interactions with an already placed slab.
	onPlayerInteract(e) {
		// Destructure event data for easier access
		const { block, player, face, faceLocation } = e;

		// Get the equipment component for the player
		const equipment = player.getComponent("equippable");

		// Get the selected item from the player's mainhand
		const selectedItem = equipment.getEquipment("Mainhand");

		// Check if a valid item is being held
		if (!selectedItem) {
			return;
		}

		const verticalHalf = block.permutation.getState(
			"minecraft:vertical_half"
		);
		const isDoubleSlab = block.permutation.getState("kado:double");

		let wasActionTaken = false;

		// Case 1: Merging to a double slab (highest priority)
		const isMergingSlab =
			selectedItem.typeId === block.typeId &&
			!isDoubleSlab &&
			((verticalHalf === "bottom" && face === "Up") ||
				(verticalHalf === "top" && face === "Down"));

		if (isMergingSlab) {
			block.setPermutation(block.permutation.withState("kado:double", true));
			block.setWaterlogged(false);
			wasActionTaken = true;
		}

		// If it's not a merging action, check for other placements.
		// Handle vertical and horizontal placement separately.
		else {
			// Get the adjacent block by calculating its location
			const blockLocation = block.location;
			const dimension = player.dimension;
			let adjacentLocation = null;

			// Handle vertical placement
			if (face === "Up" || face === "Down") {
				adjacentLocation =
					face === "Up"
						? {
								x: blockLocation.x,
								y: blockLocation.y + 1,
								z: blockLocation.z,
						  }
						: {
								x: blockLocation.x,
								y: blockLocation.y - 1,
								z: blockLocation.z,
						  };
			}
			// Handle horizontal placement
			else {
				const faceOffsets = {
					North: { x: 0, y: 0, z: -1 },
					South: { x: 0, y: 0, z: 1 },
					West: { x: -1, y: 0, z: 0 },
					East: { x: 1, y: 0, z: 0 },
				};
				const offset = faceOffsets[face];
				adjacentLocation = {
					x: blockLocation.x + offset.x,
					y: blockLocation.y + offset.y,
					z: blockLocation.z + offset.z,
				};
			}

			const adjacentBlock = adjacentLocation
				? dimension.getBlock(adjacentLocation)
				: null;
			//Check for valid placement conditions
			if (adjacentBlock && (adjacentBlock.isAir || adjacentBlock.isLiquid)) {
				// Set the adjacent block type to the selected item's type
				adjacentBlock.setType(selectedItem.typeId);
				if (selectedItem.typeId.includes("slab")) {
					// Then set the correct vertical state
					let newSlabState;
					if (face === "Up" || face === "Down") {
						newSlabState = face === "Up" ? "bottom" : "top";
					} else {
						newSlabState = faceLocation.y >= 0.5 ? "bottom" : "top";
					}
					adjacentBlock.setPermutation(
						adjacentBlock.permutation.withState(
							"minecraft:vertical_half",
							newSlabState
						)
					);
					adjacentBlock.setPermutation(
						adjacentBlock.permutation.withState("kado:double", false)
					);
				}
				wasActionTaken = true;
			}
		}

		if (wasActionTaken) {
			if (player.getGameMode() !== "creative") {
				if (selectedItem.amount > 1) {
					selectedItem.amount -= 1;
					equipment.setEquipment("Mainhand", selectedItem);
				} else if (selectedItem.amount === 1) {
					equipment.setEquipment("Mainhand", undefined);
				}
			}
			player.playSound("use.stone");
		}
	},

	catch(error) {
		console.warn(`[Slab Behavior] An error occurred: ${error.message}`);
	},
};

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
});
