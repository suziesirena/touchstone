'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelTextarea',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		first: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		readOnly: _react2['default'].PropTypes.bool,
		value: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])(this.props.className, 'list-item', 'field-item', 'align-top', {
			'is-first': this.props.first,
			'u-selectable': this.props.disabled
		});

		var props = (0, _blacklist2['default'])(this.props, 'children', 'className', 'disabled', 'first', 'label', 'readOnly');

		var renderInput = this.props.readOnly ? _react2['default'].createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : _react2['default'].createElement('textarea', _extends({}, props, { className: 'field' }));

		return _react2['default'].createElement(
			'div',
			{ className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'item-inner' },
				_react2['default'].createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				_react2['default'].createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});