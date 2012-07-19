/**
 * @defgroup js_controllers_form
 */
// Define the namespace.
$.pkp.controllers.form = $.pkp.controllers.form || {};


/**
 * @file js/controllers/form/FormHandler.js
 *
 * Copyright (c) 2000-2012 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class FormHandler
 * @ingroup js_controllers_form
 *
 * @brief Abstract form handler.
 */
(function($) {


	/**
	 * @constructor
	 *
	 * @extends $.pkp.classes.Handler
	 *
	 * @param {jQuery} $form the wrapped HTML form element.
	 * @param {Object} options options to configure the form handler.
	 */
	$.pkp.controllers.form.FormHandler = function($form, options) {
		this.parent($form, options);

		// Check whether we really got a form.
		if (!$form.is('form')) {
			throw Error(['A form handler controller can only be bound',
				' to an HTML form element!'].join(''));
		}

		// Transform all form buttons with jQueryUI.
		$('.button', $form).button();

		// Transform all select boxes.
		$('select', $form).selectBox();

		// Activate and configure the validation plug-in.
		if (options.submitHandler) {
			this.callerSubmitHandler_ = options.submitHandler;
		}

		// Set the redirect-to URL for the cancel button (if there is one).
		if (options.cancelRedirectUrl) {
			this.cancelRedirectUrl_ = options.cancelRedirectUrl;
		}

		// specific forms may override the form's default behavior
		// to warn about unsaved changes.
		if (options.trackFormChanges !== null) {
			this.trackFormChanges_ = options.trackFormChanges;
		}

		// disable submission controls on certain forms.
		if (options.disableControlsOnSubmit) {
			this.disableControlsOnSubmit_ = options.disableControlsOnSubmit;
		}

		if (options.enableDisablePairs) {
			this.enableDisablePairs_ = options.enableDisablePairs;
			this.setupEnableDisablePairs();
		}

		var validator = $form.validate({
			onfocusout: false,
			errorClass: 'error',
			highlight: function(element, errorClass) {
				$(element).parent().parent().addClass(errorClass);
			},
			unhighlight: function(element, errorClass) {
				$(element).parent().parent().removeClass(errorClass);
			},
			submitHandler: this.callbackWrapper(this.submitHandler_),
			showErrors: this.callbackWrapper(this.formChange)
		});

		// Activate the cancel button (if present).
		$('#cancelFormButton', $form).click(this.callbackWrapper(this.cancelForm));

		// Initial form validation.
		if (validator.checkForm()) {
			this.trigger('formValid');
		} else {
			this.trigger('formInvalid');
		}

		this.callbackWrapper(this.initializeTinyMCE_());

		// bind a handler to make sure tinyMCE fields are populated.
		$('#submitFormButton', $form).click(this.callbackWrapper(
				this.pushTinyMCEChanges_));
	};
	$.pkp.classes.Helper.inherits(
			$.pkp.controllers.form.FormHandler,
			$.pkp.classes.Handler);


	//
	// Private properties
	//
	/**
	 * If provided, the caller's submit handler, which will be
	 * triggered to save the form.
	 * @private
	 * @type {Function}
	 */
	$.pkp.controllers.form.FormHandler.prototype.callerSubmitHandler_ = null;


	/**
	 * If provided, the URL to redirect to when the cancel button is clicked
	 * @private
	 * @type {String}
	 */
	$.pkp.controllers.form.FormHandler.prototype.cancelRedirectUrl_ = null;


	/**
	 * By default, all FormHandler instances and subclasses track changes to
	 * form data.
	 * @private
	 * @type {Boolean}
	 */
	$.pkp.controllers.form.FormHandler.prototype.trackFormChanges_ = true;


	/**
	 * An internal boolean to keep formChange events from spamming the SiteHandler
	 * @private
	 * @type {Boolean}
	 */
	$.pkp.controllers.form.FormHandler.prototype.
			formChangesCurrentlyTracked_ = false;


	/**
	 * If true, the FormHandler will disable the submit button if the form
	 * successfully validates and is submitted.
	 * @private
	 * @type {Boolean}
	 */
	$.pkp.controllers.form.FormHandler.prototype.disableControlsOnSubmit_ = false;


	/**
	 * An object containing items that should enable or disable each other.
	 * @private
	 * @type {Object}
	 */
	$.pkp.controllers.form.FormHandler.prototype.enableDisablePairs_ = null;


	//
	// Public methods
	//
	/**
	 * Internal callback called whenever the form changes.
	 *
	 * @param {Object} validator The validator plug-in.
	 * @param {Object} errorMap An associative list that attributes
	 *  element names to error messages.
	 * @param {Array} errorList An array with objects that contains
	 *  error messages and the corresponding HTMLElements.
	 */
	$.pkp.controllers.form.FormHandler.prototype.formChange =
			function(validator, errorMap, errorList) {

		if (this.trackFormChanges_ && !this.formChangesCurrentlyTracked_) {
			$.pkp.controllers.SiteHandler.prototype.registerUnsavedFormElement(
					this.getHtmlElement());
			this.formChangesCurrentlyTracked_ = true;
		}
		// ensure that rich content elements have their
		// values stored before validation.
		if (typeof tinyMCE !== 'undefined') {
			tinyMCE.triggerSave();
		}

		// Show errors generated by the form change.
		validator.defaultShowErrors();

		// Emit validation events.
		if (validator.checkForm()) {
			// Trigger a "form valid" event.
			this.trigger('formValid');
		} else {
			// Trigger a "form invalid" event.
			this.trigger('formInvalid');
			this.enableFormControls_();
		}
	};


	/**
	 * Internal callback called to cancel the form.
	 *
	 * @param {HTMLElement} cancelButton The cancel button.
	 * @param {Event} event The event that triggered the
	 *  cancel button.
	 * @return {boolean} false.
	 */
	$.pkp.controllers.form.FormHandler.prototype.cancelForm =
			function(cancelButton, event) {

		$.pkp.controllers.SiteHandler.prototype.
				unregisterUnsavedFormElement(this.getHtmlElement());
		this.formChangesCurrentlyTracked_ = false;

		// Trigger the "form canceled" event.
		this.trigger('formCanceled');
		return false;
	};


	//
	// Private Methods
	//
	/**
	 * Internal callback called after form validation to handle form
	 * submission.
	 *
	 * @private
	 *
	 * @param {Object} validator The validator plug-in.
	 * @param {HTMLElement} formElement The wrapped HTML form.
	 * @return {Function|boolean} a callback method.
	 */
	$.pkp.controllers.form.FormHandler.prototype.submitHandler_ =
			function(validator, formElement) {

		// Notify any nested formWidgets of the submit action.
		var formSubmitEvent = new $.Event('formSubmitRequested');
		$(formElement).find('.formWidget').trigger(formSubmitEvent);

		$.pkp.controllers.SiteHandler.prototype.unregisterUnsavedFormElement(
				this.getHtmlElement());
		this.trackFormChanges_ = false;

		// If the default behavior was prevented for any reason, stop.
		if (formSubmitEvent.isDefaultPrevented()) {
			return false;
		}

		$(formElement).find('.pkp_helpers_progressIndicator').show();

		if (this.callerSubmitHandler_ !== null) {
			// A form submission handler (e.g. Ajax) was provided. Use it.
			return this.callbackWrapper(this.callerSubmitHandler_).
					call(validator, formElement);
		} else {
			// No form submission handler was provided. Use the usual method.

			// FIXME: Is there a better way? This is used to invoke
			// the default form submission code. (Necessary to
			// avoid an infinite loop.)
			validator.settings.submitHandler = null;

			this.disableFormControls_();

			this.getHtmlElement().submit();
		}
	};


	/**
	 * Internal callback called to push TinyMCE changes back to fields
	 * so they can be validated.
	 *
	 * @param {HTMLElement} submitButton The submit button.
	 * @param {Event} event The event that triggered the
	 *  submit button.
	 * @return {boolean} true.
	 * @private
	 */
	$.pkp.controllers.form.FormHandler.prototype.pushTinyMCEChanges_ =
			function(submitButton, event) {

		// ensure that rich content elements have their
		// values stored before validation.
		if (typeof tinyMCE !== 'undefined') {
			tinyMCE.triggerSave();
		}
		return true;
	};


	/**
	 * Private method to disable a form's submit control if it is
	 * desired.
	 *
	 * @return {boolean} true.
	 * @private
	 */
	$.pkp.controllers.form.FormHandler.prototype.disableFormControls_ =
			function() {

		// We have made it to submission, disable the form control if
		// necessary, submit the form.
		if (this.disableControlsOnSubmit_) {
			this.getHtmlElement().find(':submit').button('disable');
		}
		return true;
	};


	/**
	 * Private method to renable a form's submit control if it is
	 * desired.
	 *
	 * @return {boolean} true.
	 * @private
	 */
	$.pkp.controllers.form.FormHandler.prototype.enableFormControls_ =
			function() {

		this.getHtmlElement().find(':submit').removeClass('ui-state-disabled');
		return true;
	};


	/**
	 * Configures the enable/disable pair bindings between a checkbox
	 * and some other form element.
	 *
	 * @return {boolean} true.
	 */
	$.pkp.controllers.form.FormHandler.prototype.setupEnableDisablePairs =
			function() {

		var formElement = this.getHtmlElement();
		for (var key in this.enableDisablePairs_) {
			$(formElement).find("[id^='" + key + "']").bind(
					'click', this.callbackWrapper(this.toggleDependentElement_));
		}
		return true;
	};


	/**
	 * Enables or disables the item which depends on the state of source of the
	 * Event.
	 * @param {HTMLElement} sourceElement The element which generated the event.
	 * @param {Event} event The event.
	 * @return {boolean} true.
	 * @private
	 */
	$.pkp.controllers.form.FormHandler.prototype.toggleDependentElement_ =
			function(sourceElement, event) {

		var formElement = this.getHtmlElement();
		var elementId = $(sourceElement).attr('id');
		var targetElement = $(formElement).find(
				"[id^='" + this.enableDisablePairs_[elementId] + "']");

		if ($(sourceElement).is(':checked')) {
			$(targetElement).attr('disabled', '');
		} else {
			$(targetElement).attr('disabled', 'disabled');
		}

		return true;
	};
/** @param {jQuery} $ jQuery closure. */
})(jQuery);
