'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'PopupIcon',
	propTypes: {
		name: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'muted', 'primary', 'success', 'warning', 'danger']),
		spinning: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('PopupIcon', {
			'is-spinning': this.props.spinning
		}, this.props.name, this.props.type);

		return _react2['default'].createElement('div', { className: className });
	}
});