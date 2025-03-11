import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { structureCollection } from '../classes/StructureCollection';

const structCmd = new Command({
    name: 'struct',
    description: { text: 'Manages current StrucTool structures.' },
    usage: 'struct',
    callback: structCommand,
    args: [
        { type: 'string', name: 'option' },
        { type: 'string', name: 'name' }
    ]
});
extension.addCommand(structCmd);

function structCommand(sender, args) {
    const { option, name, structure } = args;
    switch (option) {
        case 'add':
            addStructure(sender, name, structure);
            break;
        case 'remove':
            removeStructure(sender, name);
            break;
        case 'place':
            structureCollection.place(name, sender.dimension.id, sender.location);
            break;
        default:
            structCmd.sendUsage(sender);
    }
}

function addStructure(sender, name, filename) {
    structureCollection.add(name, filename);
    sender.sendMessage({ text: `Added structure '${name}'` });
}

function removeStructure(sender, name) {
    structureCollection.remove(name);
    sender.sendMessage({ text: `Removed structure '${name}'` });
}