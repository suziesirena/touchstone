'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemMedia',
	propTypes: {
		avatar: _react2['default'].PropTypes.string,
		avatarInitials: _react2['default'].PropTypes.string,
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		thumbnail: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])({
			'Item__media': true,
			'Item__media--icon': this.props.icon,
			'Item__media--avatar': this.props.avatar || this.props.avatarInitials,
			'Item__media--thumbnail': this.props.thumbnail
		}, this.props.className);

		// media types
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__media__icon ' + this.props.icon }) : null;
		var avatar = this.props.avatar || this.props.avatarInitials ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__avatar' },
			this.props.avatar ? _react2['default'].createElement('img', { src: this.props.avatar }) : this.props.avatarInitials
		) : null;
		var thumbnail = this.props.thumbnail ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__thumbnail' },
			_react2['default'].createElement('img', { src: this.props.thumbnail })
		) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			icon,
			avatar,
			thumbnail
		);
	}
});