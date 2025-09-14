/** @format */

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe((eventData) => {
	eventData.blockTypeRegistry.registerCustomComponent("ubd:on_interact", {
		onPlayerInteract(e) {
			const { block, player, face } = e;
			const equipment = player.getComponent("equippable");
			const selectedItem = equipment.getEquipment("Mainhand");

			// Check if the selected item is a water bucket and handle waterlogging
			const { stateName, stateValue } = getBlockStatesAndDirection(
				player,
				selectedItem,
				face
			);

			// Determine the adjacent block position based on the face
			let adjacentBlockPos;
			switch (face) {
				case "North":
					adjacentBlockPos = { x: block.x, y: block.y, z: block.z - 1 };
					break;
				case "South":
					adjacentBlockPos = { x: block.x, y: block.y, z: block.z + 1 };
					break;
				case "East":
					adjacentBlockPos = { x: block.x + 1, y: block.y, z: block.z };
					break;
				case "West":
					adjacentBlockPos = { x: block.x - 1, y: block.y, z: block.z };
					break;
				case "Up":
					adjacentBlockPos = { x: block.x, y: block.y + 1, z: block.z };
					break;
				case "Down":
					adjacentBlockPos = { x: block.x, y: block.y - 1, z: block.z };
					break;
			}

			const adjacentBlock = e.dimension.getBlock(adjacentBlockPos);

			// Check if the adjacent block is air, water, or lava
			if (
				["minecraft:air", "minecraft:water", "minecraft:lava"].includes(
					adjacentBlock.typeId
				)
			) {
				const verticalHalf = block.permutation.getState(
					"minecraft:vertical_half"
				);
				const verticalOpposite = verticalHalf === "top" ? "bottom" : "top";

				// Check if the selected item is a slab
				if (isSlab.has(selectedItem.typeId)) {
					// Determine if we should create a double slab or place a new slab
					const isBottomUp = verticalHalf === "bottom" && face === "Up";
					const isTopDown = verticalHalf === "top" && face === "Down";

					if (
						(isBottomUp || isTopDown) &&
						selectedItem.typeId === block.typeId
					) {
						// Create a double slab
						if (!block.permutation.getState("ubd:double")) {
							block.setPermutation(
								block.permutation.withState("ubd:double", true)
							);
							block.setWaterlogged(false);
							player.playSound("use.stone");
							if (player.getGameMode() !== "creative") {
								if (selectedItem.amount === 1) {
									equipment.setEquipment("Mainhand", undefined);
								} else {
									selectedItem.amount -= 1;
									equipment.setEquipment("Mainhand", selectedItem);
								}
							}
						}
					} else {
						// Place a slab on top or side
						const command = `setblock ${adjacentBlockPos.x} ${adjacentBlockPos.y} ${adjacentBlockPos.z} ${selectedItem.typeId} ["minecraft:vertical_half"="${verticalHalf}"]`;
						const commandOpp = `setblock ${adjacentBlockPos.x} ${adjacentBlockPos.y} ${adjacentBlockPos.z} ${selectedItem.typeId} ["minecraft:vertical_half"="${verticalOpposite}"]`;

						system.runTimeout(() => {
							try {
								if (face === "Up" || face === "Down") {
									player.runCommand(commandOpp);
								} else {
									player.runCommand(command);
								}
							} catch (error) {
								console.warn(`Error: ${error.message}`);
							}
						}, 1);
					}
				} else {
					// Handle non-slab block placement with state
					const commandBlock = stateName
						? `setblock ${adjacentBlockPos.x} ${adjacentBlockPos.y} ${adjacentBlockPos.z} ${selectedItem.typeId} ["${stateName}"="${stateValue}"]`
						: `setblock ${adjacentBlockPos.x} ${adjacentBlockPos.y} ${adjacentBlockPos.z} ${selectedItem.typeId}`;

					system.runTimeout(() => {
						try {
							player.runCommand(commandBlock);
						} catch (error) {
							console.warn(`Error: ${error.message}`);
						}
					}, 1);
				}
			}
		},
	});
});

// Function to get block states and player direction
function getBlockStatesAndDirection(player, selectedItem, face) {
	const blockPermutation = BlockPermutation.resolve(selectedItem.typeId);
	const blockStates = blockPermutation.getAllStates();
	let stateName = null;
	let stateValue = null;

	// Prioritize block states in a specific order
	const statePriority = [
		"minecraft:block_face",
		"minecraft:cardinal_direction",
		"pillar_axis",
	];
	for (const state of statePriority) {
		if (blockStates[state] !== undefined) {
			stateName = state;
			if (state === "pillar_axis") {
				// Determine pillar_axis based on face
				if (["North", "South"].includes(face)) {
					stateValue = "z";
				} else if (["East", "West"].includes(face)) {
					stateValue = "x";
				} else {
					stateValue = "y";
				}
			} else if (state === "minecraft:cardinal_direction") {
				// Calculate direction based on player's rotation
				const rotation = player.getRotation();
				const rad = (rotation.y * Math.PI) / 180;
				const directionX = -Math.sin(rad);
				const directionZ = Math.cos(rad);

				// Determine cardinal direction based on calculated direction
				if (Math.abs(directionX) > Math.abs(directionZ)) {
					stateValue = directionX > 0 ? "east" : "west";
				} else {
					stateValue = directionZ > 0 ? "south" : "north";
				}
			} else if (state === "minecraft:block_face") {
				// Determine block_face based on face
				stateValue = face.toLowerCase();
			} else {
				stateValue = blockStates[state];
			}
			break;
		}
	}

	return { stateName, stateValue };
}
