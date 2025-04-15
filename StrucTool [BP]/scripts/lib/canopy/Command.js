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

class Command {
    #name;
    #description;
    #usage;
    #callback;
    #args;
    #contingentRules;
	#adminOnly;
	#helpEntries;
	#helpHidden;
	static #prefix = '';

	constructor({ name, description = '', usage, callback, args = [], contingentRules = [], adminOnly = false, helpEntries = [], helpHidden = false }) {
		this.#name = name;
        this.#description = description;
        this.#usage = usage;
        this.#callback = callback;
        this.#args = args;
        this.#contingentRules = contingentRules;
		this.#adminOnly = adminOnly;
		this.#helpEntries = helpEntries;
		this.#helpHidden = helpHidden;
	}

	getName() {
		return this.#name;
	}

	getDescription() {
		return this.#description;
	}

	getUsage() {
		return this.#usage;
	}

	getCallback() {
		return this.#callback;
	}
	
	getArgs() {
		return this.#args;
	}
	
	getContingentRules() {
		return this.#contingentRules;
	}
	
	isAdminOnly() {
		return this.#adminOnly;
	}
	
	getHelpEntries() {
		return this.#helpEntries;
	}

	isHelpHidden() {
		return this.#helpHidden;
	}
	
	runCallback(sender, args) {
		this.#callback(sender, args);
	}
	
	sendUsage(sender) {
		sender.sendMessage(`§cUsage: ${Command.#prefix}${this.#usage}`);
	}

	static setPrefix(prefix) {
		Command.#prefix = prefix;
	}

	static getPrefix() {
		return Command.#prefix;
	}
}

export default Command;