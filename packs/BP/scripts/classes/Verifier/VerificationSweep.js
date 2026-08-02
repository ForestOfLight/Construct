import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { Vector } from "../../lib/Vector";
import { ChunkGrid } from "./ChunkGrid";
import { SkippedChunkTracker } from "./SkippedChunkTracker";

// One full pass over a structure's active bounds, filling a grid as it goes.
//
// Written as a generator so it can be paced across ticks: run() yields the
// number of blocks each step covered, and whoever drives it decides when to ask
// for the next one. A step is one chunk's worth of a row, which is the largest
// unit that can be attributed to a single chunk when it turns out to be
// unreadable.
export class VerificationSweep {
    #bounds;
    #grid;
    #cellVerifier;
    #observer;
    #chunks;
    #skippedChunks = new SkippedChunkTracker();
    #location = new Vector();

    constructor({ bounds, grid, cellVerifier, observer, origin }) {
        this.#bounds = bounds;
        this.#grid = grid;
        this.#cellVerifier = cellVerifier;
        this.#observer = observer;
        this.#chunks = new ChunkGrid(origin);
    }

    *run() {
        for (let y = this.#bounds.min.y; y < this.#bounds.max.y; y++) {
            this.#skippedChunks.startLayer();
            for (let z = this.#bounds.min.z; z < this.#bounds.max.z; z++)
                yield* this.#sweepRow(y, z);
        }
    }

    *#sweepRow(y, z) {
        for (let x = this.#bounds.min.x; x < this.#bounds.max.x;) {
            const endX = this.#sweepChunkSpan(x, y, z);
            yield endX - x;
            x = endX;
        }
    }

    #sweepChunkSpan(startX, y, z) {
        const chunkKey = this.#chunks.keyAt(startX, z);
        const endX = Math.min(this.#chunks.endOfSpanX(startX), this.#bounds.max.x);
        if (this.#skippedChunks.isSkipped(chunkKey))
            this.#markSkipped(startX, endX, y, z);
        else
            this.#verifySpan(chunkKey, startX, endX, y, z);
        return endX;
    }

    #verifySpan(chunkKey, startX, endX, y, z) {
        let x = startX;
        try {
            for (; x < endX; x++)
                this.#verifyCell(this.#location.set(x, y, z));
        } catch (error) {
            if (!this.#skippedChunks.trackError(error, chunkKey))
                throw error;
            this.#markSkipped(x, endX, y, z);
        }
    }

    #verifyCell(location) {
        const { verificationLevel, flags } = this.#cellVerifier.verify(location);
        this.#grid.setCell(location, verificationLevel, flags);
        this.#observer.onCellVerified(location, verificationLevel);
    }

    // Only the level, because a skipped cell offers its neighbors nothing and
    // the grid was cleared to exactly that before the pass began.
    #markSkipped(startX, endX, y, z) {
        for (let x = startX; x < endX; x++)
            this.#grid.setLevel(this.#location.set(x, y, z), BlockVerificationLevel.Skipped);
    }
}
