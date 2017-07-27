'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'Switch',

	propTypes: {
		disabled: _react2['default'].PropTypes.bool,
		on: _react2['default'].PropTypes.bool,
		onTap: _react2['default'].PropTypes.func,
		type: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Switch', 'Switch--' + this.props.type, {
			'is-disabled': this.props.disabled,
			'is-on': this.props.on
		});

		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ onTap: this.props.onTap, className: className, component: 'label' },
			_react2['default'].createElement(
				'div',
				{ className: 'Switch__track' },
				_react2['default'].createElement('div', { className: 'Switch__handle' })
			)
		);
	}
});