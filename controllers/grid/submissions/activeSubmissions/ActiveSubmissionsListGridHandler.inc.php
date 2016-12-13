<?php

/**
 * @file controllers/grid/submissions/assignedSubmissions/ActiveSubmissionsListGridHandler.inc.php
 *
 * Copyright (c) 2016 Simon Fraser University Library
 * Copyright (c) 2000-2016 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class ActiveSubmissionsListGridHandler
 * @ingroup controllers_grid_submissions_assignedSubmissions
 *
 * @brief Handle active submissions list grid requests.
 */

// Import grid base classes.
import('lib.pkp.controllers.grid.submissions.SubmissionsListGridHandler');
import('lib.pkp.controllers.grid.submissions.SubmissionsListGridRow');

// Filter editor
define('FILTER_EDITOR_ALL', 0);
define('FILTER_EDITOR_ME', 1);

class ActiveSubmissionsListGridHandler extends SubmissionsListGridHandler {
	/**
	 * Constructor
	 */
	function __construct() {
		parent::__construct();
		$this->addRoleAssignment(
			array(ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER, ROLE_ID_SUB_EDITOR, ROLE_ID_REVIEWER, ROLE_ID_ASSISTANT, ROLE_ID_AUTHOR),
			array('fetchGrid', 'fetchRows', 'fetchRow')
		);
		$this->addRoleAssignment(
			array(ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER),
			array('deleteSubmission')
		);
	}


	//
	// Implement template methods from PKPHandler
	//
	/**
	 * @copydoc PKPHandler::initialize()
	 */
	function initialize($request) {
		parent::initialize($request);

		AppLocale::requireComponents(LOCALE_COMPONENT_PKP_USER);

		// Set title.
		$this->setTitle('common.queue.long.active');

		// Fetch the authorized roles and determine if the user is a manager.
		$authorizedRoles = $this->getAuthorizedContextObject(ASSOC_TYPE_USER_ROLES);
		$this->_isManager = in_array(ROLE_ID_MANAGER, $authorizedRoles);
		$cellProvider = new SubmissionsListGridCellProvider($request->getUser(), $authorizedRoles);

		$columns =& $this->getColumns();
		$editorColumn = new GridColumn(
			'editor',
			null,
			__('user.role.editor'),
			'controllers/grid/gridCell.tpl',
			$cellProvider,
			array('width' => 15)
		);

		$columns = array('id' => $columns['id'], 'title' => $columns['title'], 'editor' => $editorColumn, 'stage' => $columns['stage']);
	}


	//
	// Implement methods from GridHandler
	//
	/**
	 * @copyDoc GridHandler::getIsSubcomponent()
	 */
	function getIsSubcomponent() {
		return false;
	}

	/**
	 * @copyDoc GridHandler::renderFilter()
	 */
	function renderFilter($request, $filterData = array()) {
		$filterData = array('active' => true);
		return parent::renderFilter($request, $filterData);
	}

	/**
	 * @copyDoc GridHandler::getFilterSelectionData()
	 */
	function getFilterSelectionData($request) {
		$filterSelectionData = parent::getFilterSelectionData($request);
		$orphaned = $request->getUserVar('orphaned') ? (int) $request->getUserVar('orphaned') : null;
		$filterSelectionData['orphaned'] = $orphaned;
		return $filterSelectionData;
	}

	/**
	 * @copydoc GridHandler::loadData()
	 */
	protected function loadData($request, $filter) {
		$submissionDao = Application::getSubmissionDAO();
		$context = $request->getContext();
		$rangeInfo = $this->getGridRangeInfo($request, $this->getId());

		list($search, $column, $stageId) = $this->getFilterValues($filter);
		$title = $author = $editor = null;
		if ($column == 'title') {
			$title = $search;
		} elseif ($column == 'author') {
			$author = $search;
		} elseif ($column == 'editor') {
			$editor = $search;
		}

		$nonExistingUserId = 0;
		return $submissionDao->getActiveSubmissions($context->getId(), $title, $author, $editor, $stageId, $rangeInfo, $filter['orphaned']);
	}


	//
	// Extend methods from SubmissionsListGridHandler
	//
	/**
	 * @copydoc SubmissionsListGridHandler::getItemsNumber()
	 */
	protected function getItemsNumber() {
		return 20;
	}

	/**
	 * @copyDoc SubmissionsListGridHandler::getFilterColumns()
	 */
	function getFilterColumns() {
		$columns = parent::getFilterColumns();
		$columns['editor'] = __('user.role.editor');

		return $columns;
	}

}

?>
