'use strict';
const {replaceStringLiteral} = require('./fix/index.js');

const MESSAGE_ID_ERROR = 'text-encoding-identifier/error';
const MESSAGE_ID_SUGGESTION = 'text-encoding-identifier/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const getReplacement = encoding => {
	switch (encoding.toLowerCase()) {
		case 'utf8':
		case 'utf-8':
			return 'utf8';
		case 'ascii':
			return 'ascii';
		// No default
	}
};

// `fs.{readFile,readFileSync}()`
const isFsReadFileEncoding = node =>
	node.parent.type === 'CallExpression'
	&& !node.parent.optional
	&& node.parent.arguments[1] === node
	&& node.parent.arguments[0]
	&& node.parent.arguments[0].type !== 'SpreadElement'
	&& node.parent.callee.type === 'MemberExpression'
	&& !node.parent.callee.optional
	&& !node.parent.callee.computed
	&& node.parent.callee.property.type === 'Identifier'
	&& (node.parent.callee.property.name === 'readFile' || node.parent.callee.property.name === 'readFileSync');

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	Literal(node) {
		if (typeof node.value !== 'string') {
			return;
		}

		const {raw} = node;
		const value = raw.slice(1, -1);

		const replacement = getReplacement(value);
		if (!replacement || replacement === value) {
			return;
		}

		const messageData = {
			value,
			replacement,
		};

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => replaceStringLiteral(fixer, node, replacement);

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: messageData,
		};

		if (isFsReadFileEncoding(node)) {
			problem.fix = fix;
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: messageData,
				fix: fixer => replaceStringLiteral(fixer, node, replacement),
			},
		];

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent case for text encoding identifiers.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
