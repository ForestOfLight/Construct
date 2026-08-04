import { DebugLine, DebugSphere, debugDrawer } from "@minecraft/debug-utilities";
import { OutlineRenderer } from "./OutlineRenderer.js";

export class DebugOutlineRenderer extends OutlineRenderer {
    CORNER_SPHERE_SCALE = 0.1;
    #shapes = [];
    #isDrawing = false;

    start() {
        this.stop();
        this.#isDrawing = true;
        this.#draw();
    }

    stop() {
        this.#isDrawing = false;
        for (const shape of this.#shapes)
            shape.remove();
        this.#shapes.length = 0;
    }

    setBounds(dimension, min, max) {
        const changed = super.setBounds(dimension, min, max);
        if (changed && this.#isDrawing)
            this.start();
        return changed;
    }

    #draw() {
        if (this.drawCorners) {
            for (const corner of this.corners) {
                const cornerSphereShape = this.#cornerSphere(corner);
                this.#add(cornerSphereShape, this.cornerColor);
            }
        }
        if (this.drawEdges) {
            let index = 0;
            for (const [start, end] of this.cuboid.edgeSegments()) {
                const edgeShape = new DebugLine(start, end);
                const color = this.edgeColors[index++ % this.edgeColors.length];
                this.#add(edgeShape, color);
            }
        }
    }

    #add(shape, color) {
        shape.color = color;
        this.#shapes.push(shape);
        debugDrawer.addShape(shape);
    }

    #cornerSphere(corner) {
        const sphere = new DebugSphere({ dimension: this.dimension, x: corner.x, y: corner.y, z: corner.z });
        sphere.scale = this.CORNER_SPHERE_SCALE;
        return sphere;
    }
}
