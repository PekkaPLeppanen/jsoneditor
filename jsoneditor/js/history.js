/**
 * @license
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * Copyright (c) 2011-2013 Jos de Jong, http://jsoneditoronline.org
 *
 * @author  Jos de Jong, <wjosdejong@gmail.com>
 */

// create namespace
var jsoneditor = jsoneditor || {};

/**
 * @constructor jsoneditor.History
 * Store action history, enables undo and redo
 * @param {jsoneditor.JSONEditor} editor
 */
jsoneditor.History = function (editor) {
    this.editor = editor;
    this.clear();

    // map with all supported actions
    this.actions = {
        'editField': {
            'undo': function (params) {
                params.node.updateField(params.oldValue);
            },
            'redo': function (params) {
                params.node.updateField(params.newValue);
            }
        },
        'editValue': {
            'undo': function (params) {
                params.node.updateValue(params.oldValue);
            },
            'redo': function (params) {
                params.node.updateValue(params.newValue);
            }
        },
        'appendNode': {
            'undo': function (params) {
                params.parent.removeChild(params.node);
            },
            'redo': function (params) {
                params.parent.appendChild(params.node);
            }
        },
        'insertBeforeNode': {
            'undo': function (params) {
                params.parent.removeChild(params.node);
            },
            'redo': function (params) {
                params.parent.insertBefore(params.node, params.beforeNode);
            }
        },
        'insertAfterNode': {
            'undo': function (params) {
                params.parent.removeChild(params.node);
            },
            'redo': function (params) {
                params.parent.insertAfter(params.node, params.afterNode);
            }
        },
        'removeNode': {
            'undo': function (params) {
                var parent = params.parent;
                var beforeNode = parent.childs[params.index] || parent.append;
                parent.insertBefore(params.node, beforeNode);
            },
            'redo': function (params) {
                params.parent.removeChild(params.node);
            }
        },
        'duplicateNode': {
            'undo': function (params) {
                params.parent.removeChild(params.clone);
            },
            'redo': function (params) {
                params.parent.insertAfter(params.clone, params.node);
            }
        },
        'changeType': {
            'undo': function (params) {
                params.node.changeType(params.oldType);
            },
            'redo': function (params) {
                params.node.changeType(params.newType);
            }
        },
        'moveNode': {
            'undo': function (params) {
                params.startParent.moveTo(params.node, params.startIndex);
            },
            'redo': function (params) {
                params.endParent.moveTo(params.node, params.endIndex);
            }
        },
        'sort': {
            'undo': function (params) {
                var node = params.node;
                node.hideChilds();
                node.sort = params.oldSort;
                node.childs = params.oldChilds;
                node.showChilds();
            },
            'redo': function (params) {
                var node = params.node;
                node.hideChilds();
                node.sort = params.newSort;
                node.childs = params.newChilds;
                node.showChilds();
            }
        }

        // TODO: restore the original caret position and selection with each undo
        // TODO: implement history for actions "expand", "collapse", "scroll", "setDocument"
    };
};

/**
 * The method onChange is executed when the History is changed, and can
 * be overloaded.
 */
jsoneditor.History.prototype.onChange = function () {};

/**
 * Add a new action to the history
 * @param {String} action  The executed action. Available actions: "editField",
 *                         "editValue", "changeType", "appendNode",
 *                         "removeNode", "duplicateNode", "moveNode"
 * @param {Object} params  Object containing parameters describing the change.
 *                         The parameters in params depend on the action (for
 *                         example for "editValue" the Node, old value, and new
 *                         value are provided). params contains all information
 *                         needed to undo or redo the action.
 */
jsoneditor.History.prototype.add = function (action, params) {
    this.index++;
    this.history[this.index] = {
        'action': action,
        'params': params,
        'timestamp': new Date()
    };

    // remove redo actions which are invalid now
    if (this.index < this.history.length - 1) {
        this.history.splice(this.index + 1, this.history.length - this.index - 1);
    }

    // fire onchange event
    this.onChange();
};

/**
 * Clear history
 */
jsoneditor.History.prototype.clear = function () {
    this.history = [];
    this.index = -1;

    // fire onchange event
    this.onChange();
};

/**
 * Check if there is an action available for undo
 * @return {Boolean} canUndo
 */
jsoneditor.History.prototype.canUndo = function () {
    return (this.index >= 0);
};

/**
 * Check if there is an action available for redo
 * @return {Boolean} canRedo
 */
jsoneditor.History.prototype.canRedo = function () {
    return (this.index < this.history.length - 1);
};

/**
 * Undo the last action
 */
jsoneditor.History.prototype.undo = function () {
    if (this.canUndo()) {
        var obj = this.history[this.index];
        if (obj) {
            var action = this.actions[obj.action];
            if (action && action.undo) {
                action.undo(obj.params);
                if (obj.params.oldSelection) {
                    this.editor.setSelection(obj.params.oldSelection);
                }
            }
            else {
                console.log('Error: unknown action "' + obj.action + '"');
            }
        }
        this.index--;

        // fire onchange event
        this.onChange();
    }
};

/**
 * Redo the last action
 */
jsoneditor.History.prototype.redo = function () {
    if (this.canRedo()) {
        this.index++;

        var obj = this.history[this.index];
        if (obj) {
            var action = this.actions[obj.action];
            if (action && action.redo) {
                action.redo(obj.params);
                if (obj.params.newSelection) {
                    this.editor.setSelection(obj.params.newSelection);
                }
            }
            else {
                console.log('Error: unknown action "' + obj.action + '"');
            }
        }

        // fire onchange event
        this.onChange();
    }
};
