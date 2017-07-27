'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _ItemNote = require('./ItemNote');

var _ItemNote2 = _interopRequireDefault(_ItemNote);

var _ItemTitle = require('./ItemTitle');

var _ItemTitle2 = _interopRequireDefault(_ItemTitle);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'RadioList',

	propTypes: {
		options: _react2['default'].PropTypes.array.isRequired,
		value: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.string, _react2['default'].PropTypes.number]),
		icon: _react2['default'].PropTypes.string,
		onChange: _react2['default'].PropTypes.func
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var self = this;
		var options = this.props.options.map(function (op, i) {
			var iconClassname = (0, _classnames2['default'])('item-icon primary', op.icon);
			var checkMark = op.value === self.props.value ? _react2['default'].createElement(_ItemNote2['default'], { type: 'primary', icon: 'ion-checkmark' }) : null;
			var icon = op.icon ? _react2['default'].createElement(
				'div',
				{ className: 'item-media' },
				_react2['default'].createElement('span', { className: iconClassname })
			) : null;

			function onChange() {
				self.onChange(op.value);
			}

			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'option-' + i, onTap: onChange },
				_react2['default'].createElement(
					_Item2['default'],
					{ key: 'option-' + i, onTap: onChange },
					icon,
					_react2['default'].createElement(
						_ItemInner2['default'],
						null,
						_react2['default'].createElement(
							_ItemTitle2['default'],
							null,
							op.label
						),
						checkMark
					)
				)
			);
		});

		return _react2['default'].createElement(
			'div',
			null,
			options
		);
	}
});