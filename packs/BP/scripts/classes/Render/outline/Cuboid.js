import { Vector } from "../../../lib/Vector.js";

export class Cuboid {
    static edges = [ // Indecies specifically for Cuboid.cornersOf()
        [0, 1], [0, 2], [0, 4], [1, 3],
        [1, 5], [2, 3], [2, 6], [3, 7],
        [4, 5], [4, 6], [5, 7], [6, 7]
    ];
    static maxSegmentsPerEdge = 16;

    constructor(min, max) {
        this.min = Vector.from(min);
        this.max = Vector.from(max);
        this.corners = Cuboid.cornersOf(this.min, this.max);
    }

    static cornersOf(min, max) {
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

    static segmentCount(start, end) {
        return Math.min(Math.floor(end.distance(start)), Cuboid.maxSegmentsPerEdge);
    }

    // Evenly spaced points along each edge, excluding the corners themselves.
    static *edgePoints(corners) {
        for (const [startIndex, endIndex] of Cuboid.edges) {
            const start = corners[startIndex];
            const end = corners[endIndex];
            const segments = Cuboid.segmentCount(start, end);
            for (let i = 1; i < segments; i++)
                yield start.lerp(end, i / segments);
        }
    }

    // The same subdivision as start/end pairs, for renderers that draw lines.
    static *edgeSegments(corners) {
        for (const [startIndex, endIndex] of Cuboid.edges) {
            const start = corners[startIndex];
            const end = corners[endIndex];
            const segments = Cuboid.segmentCount(start, end);
            for (let i = 0; i < segments; i++)
                yield [start.lerp(end, i / segments), start.lerp(end, (i + 1) / segments)];
        }
    }

    edgePoints() {
        return Cuboid.edgePoints(this.corners);
    }

    edgeSegments() {
        return Cuboid.edgeSegments(this.corners);
    }
}
