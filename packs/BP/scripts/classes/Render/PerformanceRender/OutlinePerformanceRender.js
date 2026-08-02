import { IOutlineRender } from "../IOutlineRender";
import { MolangVariableMap, system, TicksPerSecond } from "@minecraft/server";
import { debugDrawer, DebugSphere, DebugLine } from "@minecraft/debug-utilities";
import { Vector } from "../../../lib/Vector";

export class OutlinePerformanceRender extends IOutlineRender {
    dimension;
    min = new Vector();
    max = new Vector();
    // Which halves of the outline this renderer is responsible for. Both, on
    // its own; OutlineHybridRender switches one off so the other renderer can
    // take that half instead.
    drawVertices = true;
    drawEdges = true;
    #shapes = [];

    constructor(dimension, min, max) {
        super();
        this.dimension = dimension;
        this.min = Vector.from(min);
        this.max = Vector.from(max);
        this.vertices = this.getVertices(min, max);
    }

    startDraw() {
        this.draw();
    }

    stopDraw() {
        this.#shapes.forEach(shape => shape.remove());
        this.#shapes.length = 0;
    }

    draw() {
        this.stopDraw();
        if (this.drawVertices)
            this.drawShapes(this.getVerticeShapes(), () => {
                return { red: 1, green: 1, blue: 1, alpha: 1 }
            });
        if (this.drawEdges)
            this.drawShapes(this.getCubiodEdgeLines(), this.getNextLineColor.bind(this));
    }

    drawShapes(shapes, colorCallback) {
        for (const shape of shapes) {
            shape.color = colorCallback();
            this.#shapes.push(shape);
            debugDrawer.addShape(shape);
        }
    }

    getVertices(min, max) {
        return [
            new Vector(min.x, min.y, min.z),
            new Vector(max.x, min.y, min.z),
            new Vector(min.x, max.y, min.z),
            new Vector(max.x, max.y, min.z),
            new Vector(min.x, min.y, max.z),
            new Vector(max.x, min.y, max.z),
            new Vector(min.x, max.y, max.z),
            new Vector(max.x, max.y, max.z)
        ];
    }

    setVertices(dimension, min, max) {
        this.dimension = dimension;
        this.min = Vector.from(min);
        this.max = Vector.from(max);
        this.vertices = this.getVertices(min, max);
    }

    getVerticeShapes() {
        return this.vertices.map((vertice) => {
            const dimensionVertice = { dimension: this.dimension, x: vertice.x, y: vertice.y, z: vertice.z };
            const sphere = new DebugSphere(dimensionVertice);
            sphere.scale = 0.1;
            return sphere;
        });
    }

    getCubiodEdgeLines() {
        const edges = [
            [0, 1],
            [0, 2],
            [0, 4],
            [1, 3],
            [1, 5],
            [2, 3],
            [2, 6],
            [3, 7],
            [4, 5],
            [4, 6],
            [5, 7],
            [6, 7]
        ];
        const edgeLines = [];
        for (const edge of edges) {
            const [startVertex, endVertex] = [this.vertices[edge[0]], this.vertices[edge[1]]];
            const resolution = Math.min(Math.floor(endVertex.distance(startVertex)), 16);
            for (let i = 0; i < resolution; i++) {
                const t1 = i / resolution;
                const t2 = (i + 1) / resolution;
                const point1 = startVertex.lerp(endVertex, t1);
                const point2 = startVertex.lerp(endVertex, t2);
                const line = new DebugLine(point1, point2);
                edgeLines.push(line);
            }
        }
        return edgeLines;
    }

    addStandaloneLocations(locations) {
        for (const location of locations)
            this.vertices.push(Vector.from(location));
    }

    getNextLineColor() {
        if (this.lastWasBlack) {
            this.lastWasBlack = false;
            return { red: 0.93333333, green: 0.77647059, blue: 0.13333333, alpha: 1 };
        } else {
            this.lastWasBlack = true;
            return { red: 0.09019608, green: 0.09019608, blue: 0.09019608, alpha: 1 };
        }
    }
}
