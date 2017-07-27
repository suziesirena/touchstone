'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Popup',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			transition: 'none'
		};
	},

	renderBackdrop: function renderBackdrop() {
		if (!this.props.visible) return null;
		return _react2['default'].createElement('div', { className: 'Popup-backdrop' });
	},

	renderDialog: function renderDialog() {
		if (!this.props.visible) return null;

		// Set classnames
		var dialogClassName = (0, _classnames2['default'])('Popup-dialog', this.props.className);

		return _react2['default'].createElement(
			'div',
			{ className: dialogClassName },
			this.props.children
		);
	},

	render: function render() {
		return _react2['default'].createElement(
			'div',
			{ className: 'Popup' },
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-dialog', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderDialog()
			),
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-background', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderBackdrop()
			)
		);
	}
});