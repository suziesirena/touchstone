'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var ErrorView = _react2['default'].createClass({
	displayName: 'ErrorView',

	propTypes: {
		children: _react2['default'].PropTypes.node
	},

	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ fill: true, className: 'View ErrorView' },
			this.props.children
		);
	}
});

exports['default'] = ErrorView;
module.exports = exports['default'];