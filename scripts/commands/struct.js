import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { structureCollection } from '../classes/StructureCollection';
import { system } from '@minecraft/server';
import { MaterialCounter } from '../classes/MaterialCounter';

const structCmd = new Command({
    name: 'struct',
    description: { text: 'Manages current StrucTool structures.' },
    usage: 'struct',
    callback: structCommand,
    args: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'option' },
        { type: 'string|number', name: 'arg3' }
    ]
});
extension.addCommand(structCmd);

function structCommand(sender, args) {
    const { option, name, arg3 } = args;
    switch (option) {
        case 'add':
            addStructure(sender, name);
            break;
        case 'remove':
            removeStructure(sender, name);
            break;
        case 'place':
            placeStructure(sender, name);
            break;
        case 'layer':
            setLayer(sender, name, arg3);
            break;
        case 'info':
            printInfo(sender, name);
            break;
        default:
            structCmd.sendUsage(sender);
    }
}

function addStructure(sender, name) {
    structureCollection.add(name);
    sender.sendMessage({ text: `§7Added structure '${name}'` });
}

function removeStructure(sender, name) {
    try {
        structureCollection.remove(name);
    } catch (e) {
        sender.sendMessage({ text: `§cStructure '${name}' not found.` });
        return;
    }
    sender.sendMessage({ text: `Removed structure '${name}'` });
}

function placeStructure(sender, name) {
    let structure;
    try {
        structure = structureCollection.get(name);
    } catch (e) {
        try {
            structure = structureCollection.add(name);
        } catch (e) {
            sender.sendMessage({ text: `§cStructure '${name}' not found.` });
            return;
        }
    }
    structure.place(sender.dimension.id, sender.location);
    sender.sendMessage({ text: `§7Placed structure '${name}'.` });
}

function setLayer(sender, name, layer) {
    let structure;
    try {
        structure = structureCollection.get(name);
    } catch (e) {
        sender.sendMessage({ text: `§cStructure '${name}' not found.` });
        return;
    }
    structure.setLayer(layer);
    sender.sendMessage({ text: `§7Set layer of structure '${name}' to ${layer}.` });
}

function printInfo(sender, name) {
    let structure;
    try {
        structure = structureCollection.get(name);
    } catch (e) {
        sender.sendMessage({ text: `§cStructure '${name}' not found.` });
        return;
    }
    const location = structure.getLocation();
    sender.sendMessage({ text: `§7Structure '${name}' at [${location.x} ${location.y} ${location.z}]` });
    sender.sendMessage({ text: `§7Current Layer: ${structure.getLayer()}` });
    sender.sendMessage({ text: `§7Materials: ${MaterialCounter.getPrintable(name)}` });
}