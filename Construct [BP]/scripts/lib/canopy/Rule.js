/**
 * @license
 * MIT License
 *
 * Copyright (c) 2024 ForestOfLight
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { world } from '@minecraft/server';

class Rule {
    #identifier;
    #description;
    #contingentRules;
    #independentRules;

    constructor({ identifier, description, contingentRules = [], independentRules = [] }) {
        this.#identifier = identifier;
        this.#description = description;
        this.#contingentRules = contingentRules;
        this.#independentRules = independentRules;
    }

    getID() {
        return this.#identifier;
    }

    getDescription() {
        return this.#description;
    }

    getContigentRules() {
        return this.#contingentRules;
    }

    getIndependentRules() {
        return this.#independentRules;
    }

    getValue() {
        const value = world.getDynamicProperty(this.#identifier);
        if (String(value) === 'true')
            return true;
        if (['false', 'undefined'].includes(String(value)))
            return false;
        throw new Error(`Rule ${this.#identifier} has an invalid value: ${value} (${typeof value})`);
    }
    
    setValue(value) {
        world.setDynamicProperty(this.#identifier, value);
    }
}

export default Rule;