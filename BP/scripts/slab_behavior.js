/** @format */

// Import necessary modules from Minecraft server API
import { ItemUseOnEvent, system } from "@minecraft/server";

// Subscribe to the 'worldInitialize' event to register custom components
const slabBlockComponent = {
	onPlayerInteract(e) {
		// Destructure event data for easier access
		const { block, player, face } = e;

		// Get the equipment component for the player
		const equipment = player.getComponent("equippable");

		// Get the selected item from the player's mainhand
		const selectedItem = equipment.getEquipment("Mainhand");

		// Check if the selected item is a slab and the block is not already double
		if (
			selectedItem?.typeId === block.typeId &&
			!block.permutation.getState("kado:double")
		) {
			// Check if the interaction is valid based on vertical half and face
			const verticalHalf = block.permutation.getState(
				"minecraft:vertical_half"
			);

			// Case 1: Placing a slab into the existing one (making a double slab)
			const isMergingSlab =
				(verticalHalf === "bottom" && face === "Up") ||
				(verticalHalf === "top" && face === "Down");

			// Case 2: Placing a new slab next to the existing one
			const isPlacingNextTo =
				(verticalHalf === "bottom" && face !== "Up") ||
				(verticalHalf === "top" && face !== "Down");

			// If it's a valid interaction to merge the slabs
			if (isMergingSlab) {
				// Set the block to a double slab
				block.setPermutation(
					block.permutation.withState("kado:double", true)
				);

				// Remove water if the block was waterlogged
				block.setWaterlogged(false);
			}
			if (isPlacingNextTo) {
				// Corrected logic: Get the adjacent block by calculating its location
				const blockLocation = block.location;
				const dimension = player.dimension;

				// Map the face string to a location offset
				const faceOffsets = {
					Up: { x: 0, y: 1, z: 0 },
					Down: { x: 0, y: -1, z: 0 },
					North: { x: 0, y: 0, z: -1 },
					South: { x: 0, y: 0, z: 1 },
					West: { x: -1, y: 0, z: 0 },
					East: { x: 1, y: 0, z: 0 },
				};

				const offset = faceOffsets[face];
				const adjacentLocation = {
					x: blockLocation.x + offset.x,
					y: blockLocation.y + offset.y,
					z: blockLocation.z + offset.z,
				};

				const adjacentBlock = dimension.getBlock(adjacentLocation);

				// Check if the adjacent block has valid placement conditions
				if (
					adjacentBlock &&
					(adjacentBlock.isAir || adjacentBlock.isLiquid)
				) {
					// Set the adjacent block to a slab
					adjacentBlock.setPermutation(
						block.permutation.withState("kado:double", false)
					);
				}
			}
			// Reduce item count if not in creative mode
			if (player.getGameMode() !== "creative") {
				if (selectedItem.amount > 1) {
					selectedItem.amount -= 1;
					equipment.setEquipment("Mainhand", selectedItem);
				} else if (selectedItem.amount === 1) {
					equipment.setEquipment("Mainhand", undefined); // Clear the slot if only 1 item is left
				}
			}
			// Play the stone block placement sound
			player.playSound("use.stone");
		}
	},
	catch(error) {
		// Log any errors for debugging.
		console.warn(`[Slab Behavior] An error occurred: ${error.message}`);
	},
};
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
});
