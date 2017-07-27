'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemContent = require('./ItemContent');

var _ItemContent2 = _interopRequireDefault(_ItemContent);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Input',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		disabled: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'children', 'className');

		return _react2['default'].createElement(
			_Item2['default'],
			{ selectable: this.props.disabled, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_ItemContent2['default'],
					{ component: 'label' },
					_react2['default'].createElement('textarea', _extends({ className: 'field', rows: 3 }, inputProps))
				),
				this.props.children
			)
		);
	}
});