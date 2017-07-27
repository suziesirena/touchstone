'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _DatePicker = require('./DatePicker');

var _DatePicker2 = _interopRequireDefault(_DatePicker);

var _Popup = require('./Popup');

var _Popup2 = _interopRequireDefault(_Popup);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'DatePickerPopup',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('DatePicker', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className', 'visible');
		return _react2['default'].createElement(
			_Popup2['default'],
			{ className: className, visible: this.props.visible },
			_react2['default'].createElement(_DatePicker2['default'], props)
		);
	}
});