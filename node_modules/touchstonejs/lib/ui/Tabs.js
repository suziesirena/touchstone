'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var Navigator = _react2['default'].createClass({
	displayName: 'Navigator',

	propTypes: {
		className: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Navigator', this.props.className);
		var otherProps = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, otherProps));
	}
});

exports.Navigator = Navigator;
var Tab = _react2['default'].createClass({
	displayName: 'Tab',

	propTypes: {
		selected: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Tab', { 'is-selected': this.props.selected });
		var otherProps = (0, _blacklist2['default'])(this.props, 'selected');

		return _react2['default'].createElement(_reactTappable2['default'], _extends({ className: className }, otherProps));
	}
});

exports.Tab = Tab;
var Label = _react2['default'].createClass({
	displayName: 'Label',

	render: function render() {
		return _react2['default'].createElement('div', _extends({ className: 'Tabs-Label' }, this.props));
	}
});
exports.Label = Label;