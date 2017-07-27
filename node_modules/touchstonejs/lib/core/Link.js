'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _mixinsTransitions = require('../mixins/Transitions');

var _mixinsTransitions2 = _interopRequireDefault(_mixinsTransitions);

var Link = _react2['default'].createClass({
	displayName: 'Link',

	mixins: [_mixinsTransitions2['default']],
	propTypes: {
		children: _react2['default'].PropTypes.any,
		options: _react2['default'].PropTypes.object,
		transition: _react2['default'].PropTypes.string,
		to: _react2['default'].PropTypes.string,
		viewProps: _react2['default'].PropTypes.any
	},

	doTransition: function doTransition() {
		var options = _extends({ viewProps: this.props.viewProps, transition: this.props.transition }, this.props.options);
		console.info('Link to "' + this.props.to + '" using transition "' + this.props.transition + '"' + ' with props ', this.props.viewProps);
		this.transitionTo(this.props.to, options);
	},

	render: function render() {
		var tappableProps = (0, _blacklist2['default'])(this.props, 'children', 'options', 'transition', 'viewProps');

		return _react2['default'].createElement(
			_reactTappable2['default'],
			_extends({ onTap: this.doTransition }, tappableProps),
			this.props.children
		);
	}
});

exports['default'] = Link;
module.exports = exports['default'];