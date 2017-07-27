'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'SearchField',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		onCancel: _react2['default'].PropTypes.func,
		onChange: _react2['default'].PropTypes.func,
		onClear: _react2['default'].PropTypes.func,
		onSubmit: _react2['default'].PropTypes.func,
		placeholder: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'dark']),
		value: _react2['default'].PropTypes.string
	},

	getInitialState: function getInitialState() {
		return {
			isFocused: false
		};
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default',
			value: ''
		};
	},

	handleClear: function handleClear() {
		this.refs.input.getDOMNode().focus();
		this.props.onClear();
	},

	handleCancel: function handleCancel() {
		this.refs.input.getDOMNode().blur();
		this.props.onCancel();
	},

	handleChange: function handleChange(e) {
		this.props.onChange(e.target.value);
	},

	handleBlur: function handleBlur(e) {
		this.setState({
			isFocused: false
		});
	},

	handleFocus: function handleFocus(e) {
		this.setState({
			isFocused: true
		});
	},

	handleSubmit: function handleSubmit(e) {
		e.preventDefault();

		var input = this.refs.input.getDOMNode();

		input.blur();
		this.props.onSubmit(input.value);
	},

	renderClear: function renderClear() {
		if (!this.props.value.length) return;
		return _react2['default'].createElement(_reactTappable2['default'], { className: 'SearchField__icon SearchField__icon--clear', onTap: this.handleClear });
	},

	renderCancel: function renderCancel() {
		var className = (0, _classnames2['default'])('SearchField__cancel', {
			'is-visible': this.state.isFocused || this.props.value
		});
		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ className: className, onTap: this.handleCancel },
			'Cancel'
		);
	},

	render: function render() {
		var className = (0, _classnames2['default'])('SearchField', 'SearchField--' + this.props.type, {
			'is-focused': this.state.isFocused,
			'has-value': this.props.value
		}, this.props.className);

		return _react2['default'].createElement(
			'form',
			{ onSubmit: this.handleSubmit, action: 'javascript:;', className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'SearchField__field' },
				_react2['default'].createElement(
					'div',
					{ className: 'SearchField__placeholder' },
					_react2['default'].createElement('span', { className: 'SearchField__icon SearchField__icon--search' }),
					!this.props.value.length ? this.props.placeholder : null
				),
				_react2['default'].createElement('input', { type: 'search', ref: 'input', value: this.props.value, onChange: this.handleChange, onFocus: this.handleFocus, onBlur: this.handleBlur, className: 'SearchField__input' }),
				this.renderClear()
			),
			this.renderCancel()
		);
	}
});