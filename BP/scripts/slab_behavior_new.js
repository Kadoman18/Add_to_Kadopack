/** @format */

// Import necessary modules from Minecraft server API
import { system, world, ItemUseOnEvent } from "@minecraft/server";

// This object will contain the handler for the 'onPlayerInteract' event
const slabBlockComponent = {
	// Handles all interactions with an already placed slab.
	onPlayerInteract(eventData) {
		// Destructure event data for easier access
		const { block, player, face, faceLocation } = eventData;

		// Get the equipment component for the player
		const equipment = player.getComponent("equippable");

		// Get the selected item from the player's mainhand
		const selectedItem = equipment.getEquipment("Mainhand");

		// Check if a valid item is being held
		if (!selectedItem) {
			eventData.cancel = true;
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
			((verticalHalf === "top" && face === "Down") ||
				(verticalHalf === "bottom" && face === "Up"));

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
						newSlabState = faceLocation.y >= 0.5 ? "top" : "bottom";
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
	onItemUseOn(eventData) {
		// CORRECTED: get player from the event's source property
		const {
			block,
			source: player,
			blockFace,
			faceLocation,
			itemStack,
		} = eventData;

		if (
			!block ||
			!block.isValid() ||
			!itemStack ||
			!itemStack.typeId.includes("slab")
		) {
			return;
		}

		const equipment = player.getComponent("equippable");
		if (!equipment) {
			return;
		}
		const selectedItem = equipment.getEquipment("Mainhand");
		if (!selectedItem) {
			return;
		}

		let wasActionTaken = false;

		//Attempt to get permutation states; handle cases where block may not have these states
		const verticalHalf = block.permutation?.hasState(
			"minecraft:vertical_half"
		)
			? block.permutation.getState("minecraft:vertical_half")
			: null;
		const isDoubleSlab = block.permutation?.hasState("kado:double")
			? block.permutation.getState("kado:double")
			: false;

		// Scenario 1 - Merging with a top half slab by clicking on the bottom half of an adjacent block
		if (blockFace !== "Up" && blockFace !== "Down") {
			const adjacentBlock = block.getSide(blockFace);
			if (
				faceLocation.y < 0.5 &&
				adjacentBlock.permutation.hasState("minecraft:vertical_half") &&
				adjacentBlock.permutation.getState("minecraft:vertical_half") ===
					"top" &&
				adjacentBlock.typeId === selectedItem.typeId
			) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				wasActionTaken = true;
			}
		}

		// Scenario 2 - Merging with a top half slab by clicking on the top face of the block below it
		if (!wasActionTaken && blockFace === "Up") {
			const adjacentBlockAbove = block.getSide("Up");
			if (
				adjacentBlockAbove.permutation.hasState(
					"minecraft:vertical_half"
				) &&
				adjacentBlockAbove.permutation.getState(
					"minecraft:vertical_half"
				) === "top" &&
				adjacentBlockAbove.typeId === selectedItem.typeId
			) {
				block.setPermutation(
					block.permutation
						.withType(selectedItem.typeId)
						.withState("kado:double", true)
						.withState("minecraft:vertical_half", "bottom")
				);

				adjacentBlockAbove.setPermutation(
					world
						.getDimension(adjacentBlockAbove.dimension.id)
						.getBlock(adjacentBlockAbove.location)
						.permutation.withType("minecraft:air")
				);
				wasActionTaken = true;
			}
		}

		// Scenario 3 - Merging with a bottom half slab by clicking on the top half of an adjacent block
		if (!wasActionTaken && blockFace !== "Up" && blockFace !== "Down") {
			const adjacentBlock = block.getSide(blockFace);
			if (
				faceLocation.y >= 0.5 &&
				adjacentBlock.permutation.hasState("minecraft:vertical_half") &&
				adjacentBlock.permutation.getState("minecraft:vertical_half") ===
					"bottom" &&
				adjacentBlock.typeId === selectedItem.typeId
			) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				wasActionTaken = true;
			}
		}

		// Scenario 4 - Merging with a bottom half slab by clicking on the bottom of the block above it
		if (!wasActionTaken && blockFace === "Down") {
			const adjacentBlockBelow = block.getSide("Down");
			if (
				adjacentBlockBelow.permutation.hasState(
					"minecraft:vertical_half"
				) &&
				adjacentBlockBelow.permutation.getState(
					"minecraft:vertical_half"
				) === "bottom" &&
				adjacentBlockBelow.typeId === selectedItem.typeId
			) {
				block.setPermutation(
					block.permutation
						.withType(selectedItem.typeId)
						.withState("kado:double", true)
						.withState("minecraft:vertical_half", "top")
				);

				adjacentBlockBelow.setPermutation(
					world
						.getDimension(adjacentBlockBelow.dimension.id)
						.getBlock(adjacentBlockBelow.location)
						.permutation.withType("minecraft:air")
				);
				wasActionTaken = true;
			}
		}

		// Fallback to regular placement logic if no merging occurred
		if (!wasActionTaken) {
			const adjacentBlock = block.getSide(blockFace);
			if (adjacentBlock && (adjacentBlock.isAir || adjacentBlock.isLiquid)) {
				let newSlabState;
				if (blockFace === "Up" || blockFace === "Down") {
					newSlabState = blockFace === "Up" ? "bottom" : "top";
				} else {
					newSlabState = faceLocation.y >= 0.5 ? "top" : "bottom";
				}
				adjacentBlock.setPermutation(
					adjacentBlock.permutation
						.withType(selectedItem.typeId)
						.withState("minecraft:vertical_half", newSlabState)
						.withState("kado:double", false)
				);
				wasActionTaken = true;
			}
		}

		if (wasActionTaken) {
			if (player.getGameMode() !== "creative") {
				if (selectedItem.amount > 1) {
					selectedItem.amount--;
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

// --- Subscriptions ---
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	// Register the custom block component
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
	// Subscribe to the onItemUseOn event for general slab behavior
	world.beforeEvents.itemUse.subscribe((e) =>
		slabBlockComponent.onItemUseOn(e)
	);
});
