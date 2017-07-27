'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Alertbar',
	propTypes: {
		animated: _react2['default'].PropTypes.bool,
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		pulse: _react2['default'].PropTypes.bool,
		type: _react2['default'].PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger']),
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Alertbar', 'Alertbar--' + this.props.type, {
			'Alertbar--animated': this.props.animated,
			'Alertbar--pulse': this.props.pulse
		}, this.props.className);

		var pulseWrap = this.props.pulse ? _react2['default'].createElement(
			'div',
			{ className: 'Alertbar__inner' },
			this.props.children
		) : this.props.children;
		var animatedBar = this.props.visible ? _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		) : null;

		var component = this.props.animated ? _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: 'Alertbar', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
			animatedBar
		) : _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		);

		return component;
	}
});