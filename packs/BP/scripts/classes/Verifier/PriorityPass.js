// Armed means the drawn picture does not yet describe the current bounds, so
// the next pass should run flat out. Reading and clearing are separate because
// each holder clears at a different point: the verifier only when a pass
// commits, the render cursor only when a lap ends.
export class PriorityPass {
    #isArmed = false;

    arm() {
        this.#isArmed = true;
    }

    isArmed() {
        return this.#isArmed;
    }

    disarm() {
        this.#isArmed = false;
    }
}
