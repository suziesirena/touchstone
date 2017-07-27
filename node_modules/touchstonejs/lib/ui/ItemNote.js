'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemNote',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		label: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__note', 'Item__note--' + this.props.type, this.props.className);

		// elements
		var label = this.props.label ? _react2['default'].createElement(
			'div',
			{ className: 'Item__note__label' },
			this.props.label
		) : null;
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__note__icon ' + this.props.icon }) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			label,
			icon
		);
	}
});