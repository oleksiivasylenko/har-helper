import { Component, For, Show, createSignal } from 'solid-js';
import { filtersStore, globalSettingsStore } from '../stores';
import type { ExpressionNode } from '../types';
import { FILTER_FIELDS, FILTER_OPERATORS, RESOURCE_TYPES, STATUS_RANGES, EXTENSION_FILTERS, SEARCH_COLORS } from '../utils/constants';

export var ExpressionEditor: Component = function() {
  var filters = function() { return filtersStore.filters(); };
  var globalSettings = function() { return globalSettingsStore.globalSettings(); };
  var expressionTree = function() { return filters().expressionTree; };
  var collapsed = function() { return globalSettings().expressionCollapsed; };

  function toggleCollapsed() {
    globalSettingsStore.toggleExpressionCollapsed();
  }

  function getUsedColors(): Record<string, boolean> {
    var used: Record<string, boolean> = {};
    function walk(node: ExpressionNode | null) {
      if (!node) return;
      if (node.type === 'text-search' && node.color) used[node.color] = true;
      if (node.type === 'group' && node.children) {
        for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
      }
    }
    walk(expressionTree());
    return used;
  }

  function getNextColor(): string {
    var used = getUsedColors();
    for (var i = 0; i < SEARCH_COLORS.length; i++) {
      if (!used[SEARCH_COLORS[i]]) return SEARCH_COLORS[i];
    }
    return SEARCH_COLORS[0];
  }

  function updateTree(newTree: ExpressionNode) {
    filtersStore.setExpressionTree(newTree);
  }

  function updateNodeAtPath(path: number[], updates: Partial<ExpressionNode>) {
    var tree = expressionTree();
    var newTree = updateNodeAtPathRecursive(tree, path, 0, updates);
    updateTree(newTree);
  }

  function updateNodeAtPathRecursive(node: ExpressionNode, path: number[], depth: number, updates: Partial<ExpressionNode>): ExpressionNode {
    if (depth === path.length) {
      return { ...node, ...updates };
    }
    var childIndex = path[depth];
    var children = node.children || [];
    var newChildren = children.map(function(child, i) {
      if (i === childIndex) {
        return updateNodeAtPathRecursive(child, path, depth + 1, updates);
      }
      return child;
    });
    return { ...node, children: newChildren };
  }

  function addChildAtPath(path: number[], newChild: ExpressionNode) {
    var tree = expressionTree();
    var newTree = addChildAtPathRecursive(tree, path, 0, newChild);
    updateTree(newTree);
  }

  function addChildAtPathRecursive(node: ExpressionNode, path: number[], depth: number, newChild: ExpressionNode): ExpressionNode {
    if (depth === path.length) {
      var children = node.children || [];
      var updatedChildren = children.length > 0
        ? [{ ...children[0], operator: children[0].operator || 'and' }, ...children.slice(1)]
        : children;
      return { ...node, children: [newChild, ...updatedChildren] };
    }
    var childIndex = path[depth];
    var children = node.children || [];
    var newChildren = children.map(function(child, i) {
      if (i === childIndex) {
        return addChildAtPathRecursive(child, path, depth + 1, newChild);
      }
      return child;
    });
    return { ...node, children: newChildren };
  }

  function removeChildAtPath(path: number[], childIndex: number) {
    var tree = expressionTree();
    var newTree = removeChildAtPathRecursive(tree, path, 0, childIndex);
    updateTree(newTree);
  }

  function removeChildAtPathRecursive(node: ExpressionNode, path: number[], depth: number, childIndex: number): ExpressionNode {
    if (depth === path.length) {
      var children = [...(node.children || [])];
      children.splice(childIndex, 1);
      return { ...node, children: children };
    }
    var idx = path[depth];
    var children = node.children || [];
    var newChildren = children.map(function(child, i) {
      if (i === idx) {
        return removeChildAtPathRecursive(child, path, depth + 1, childIndex);
      }
      return child;
    });
    return { ...node, children: newChildren };
  }

  function addTextSearch(path: number[], nextOperator: 'and' | 'or') {
    var newChild: ExpressionNode = {
      type: 'text-search',
      operator: nextOperator,
      text: '',
      scope: 'all',
      part: 'all',
      mode: 'text',
      highlightOnly: true,
      color: getNextColor(),
      enabled: true
    };
    addChildAtPath(path, newChild);
  }

  function addPropertyFilter(path: number[], nextOperator: 'and' | 'or') {
    var newChild: ExpressionNode = {
      type: 'property-filter',
      operator: nextOperator,
      field: 'url',
      filterOperator: 'contains',
      value: '',
      exclude: true,
      enabled: true
    };
    addChildAtPath(path, newChild);
  }

  function addGroup(path: number[], nextOperator: 'and' | 'or') {
    var newChild: ExpressionNode = {
      type: 'group',
      operator: nextOperator,
      children: []
    };
    addChildAtPath(path, newChild);
  }

  function removeNode(path: number[], index: number) {
    removeChildAtPath(path, index);
  }

  function updateChildAtPath(path: number[], index: number, updates: Partial<ExpressionNode>) {
    updateNodeAtPath([...path, index], updates);
  }

  function reorderChildrenAtPath(path: number[], fromIndex: number, toIndex: number) {
    var tree = expressionTree();
    var newTree = reorderChildrenAtPathRecursive(tree, path, 0, fromIndex, toIndex);
    updateTree(newTree);
  }

  function reorderChildrenAtPathRecursive(node: ExpressionNode, path: number[], depth: number, fromIndex: number, toIndex: number): ExpressionNode {
    if (depth === path.length) {
      var children = [...(node.children || [])];
      var moved = children.splice(fromIndex, 1)[0];
      children.splice(toIndex, 0, moved);
      return { ...node, children: children };
    }
    var idx = path[depth];
    var children = node.children || [];
    var newChildren = children.map(function(child, i) {
      if (i === idx) {
        return reorderChildrenAtPathRecursive(child, path, depth + 1, fromIndex, toIndex);
      }
      return child;
    });
    return { ...node, children: newChildren };
  }

  var isDirty = function() { return filtersStore.expressionDirty(); };
  var isSaving = function() { return filtersStore.expressionSaving(); };

  function handleSave() {
    filtersStore.saveExpressionTree().catch(function(err) {
      alert('Failed to save: ' + err.message);
    });
  }

  function handleDiscard() {
    filtersStore.discardExpressionChanges();
  }

  return (
    <section id="expression-section" class={collapsed() ? 'collapsed' : ''}>
      <div class="expression-header">
        <h2 id="expression-toggle" onClick={toggleCollapsed}>
          <span id="expression-arrow">{collapsed() ? '▶' : '▼'}</span> Expression Editor
        </h2>
        <Show when={!collapsed()}>
          <div class="expression-actions">
            <Show when={isDirty()}>
              <span class="expression-status unsaved">Unsaved changes</span>
              <button class="expr-discard-btn" onClick={handleDiscard} disabled={isSaving()}>
                Discard
              </button>
            </Show>
            <Show when={!isDirty()}>
              <span class="expression-status saved">Saved</span>
            </Show>
            <button 
              class={'expr-save-btn' + (isDirty() ? ' has-changes' : '')} 
              onClick={handleSave} 
              disabled={!isDirty() || isSaving()}
            >
              {isSaving() ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Show>
      </div>
      <Show when={!collapsed()}>
        <div id="expression-container">
          <GroupNode
            group={expressionTree()}
            path={[]}
            onAddTextSearch={addTextSearch}
            onAddPropertyFilter={addPropertyFilter}
            onAddGroup={addGroup}
            onRemoveNode={removeNode}
            onUpdateChild={updateChildAtPath}
            onReorderChildren={reorderChildrenAtPath}
            getNextColor={getNextColor}
            getUsedColors={getUsedColors}
          />
        </div>
      </Show>
    </section>
  );
};

interface GroupNodeProps {
  group: ExpressionNode;
  path: number[];
  onAddTextSearch: (path: number[], nextOperator: 'and' | 'or') => void;
  onAddPropertyFilter: (path: number[], nextOperator: 'and' | 'or') => void;
  onAddGroup: (path: number[], nextOperator: 'and' | 'or') => void;
  onRemoveNode: (path: number[], index: number) => void;
  onUpdateChild: (path: number[], index: number, updates: Partial<ExpressionNode>) => void;
  onReorderChildren: (path: number[], fromIndex: number, toIndex: number) => void;
  getNextColor: () => string;
  getUsedColors: () => Record<string, boolean>;
}

var GroupNode: Component<GroupNodeProps> = function(props) {
  var group = function() { return props.group; };
  var children = function() { return group().children || []; };
  var path = function() { return props.path; };
  var isRoot = function() { return path().length === 0; };
  var [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
  var dragFromIndex = { current: -1 };

  function handleDragStart(index: number, e: DragEvent) {
    dragFromIndex.current = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(index: number, e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(toIndex: number, e: DragEvent) {
    e.preventDefault();
    setDragOverIndex(null);
    var fromIndex = dragFromIndex.current;
    if (fromIndex === -1 || fromIndex === toIndex) return;
    props.onReorderChildren(path(), fromIndex, toIndex);
    dragFromIndex.current = -1;
  }

  function handleDragEnd() {
    setDragOverIndex(null);
    dragFromIndex.current = -1;
  }

  return (
    <div class={'expr-group' + (isRoot() ? '' : ' expr-nested')}>
      <div class="expr-group-header">
        <div class="expr-add-group-wrapper">
          <span class="expr-next-op-label">Next:</span>
          <button class="expr-add-btn" onClick={function() { props.onAddTextSearch(path(), 'and'); }}>
            + Text Search
          </button>
          <button class="expr-add-btn" onClick={function() { props.onAddPropertyFilter(path(), 'and'); }}>
            + Property Filter
          </button>
          <button class="expr-add-btn expr-add-group-btn" onClick={function() { props.onAddGroup(path(), 'and'); }}>
            + ( Group )
          </button>
        </div>
      </div>
      <div class="expr-children">
        <For each={children()}>
          {function(child, getIndex) {
            return (
              <div
                class={'expr-child-wrapper' + (dragOverIndex() === getIndex() ? ' expr-drag-over' : '')}
                draggable={true}
                onDragStart={function(e) { handleDragStart(getIndex(), e); }}
                onDragOver={function(e) { handleDragOver(getIndex(), e); }}
                onDragLeave={handleDragLeave}
                onDrop={function(e) { handleDrop(getIndex(), e); }}
                onDragEnd={handleDragEnd}
              >
                <span class="expr-drag-handle" title="Drag to reorder">⠿</span>
                {getIndex() === 0
                  ? <span class="expr-op-spacer"></span>
                  : <button
                      class="expr-op-label-btn"
                      onClick={function() {
                        var currentOp = child.operator || 'and';
                        props.onUpdateChild(path(), getIndex(), { operator: currentOp === 'and' ? 'or' : 'and' });
                      }}
                      title="Click to toggle operator"
                    >
                      {(child.operator || 'and').toUpperCase()}
                    </button>
                }
                <Show when={child.type === 'group'}>
                  <GroupNode
                    group={child}
                    path={[...path(), getIndex()]}
                    onAddTextSearch={props.onAddTextSearch}
                    onAddPropertyFilter={props.onAddPropertyFilter}
                    onAddGroup={props.onAddGroup}
                    onRemoveNode={props.onRemoveNode}
                    onUpdateChild={props.onUpdateChild}
                    onReorderChildren={props.onReorderChildren}
                    getNextColor={props.getNextColor}
                    getUsedColors={props.getUsedColors}
                  />
                  <button class="expr-remove-btn" onClick={function() { props.onRemoveNode(path(), getIndex()); }}>
                    ×
                  </button>
                </Show>
                <Show when={child.type === 'text-search'}>
                  <TextSearchNode
                    node={child}
                    onUpdate={function(updates) { props.onUpdateChild(path(), getIndex(), updates); }}
                    onRemove={function() { props.onRemoveNode(path(), getIndex()); }}
                    getNextColor={props.getNextColor}
                    getUsedColors={props.getUsedColors}
                  />
                </Show>
                <Show when={child.type === 'property-filter'}>
                  <PropertyFilterNode
                    node={child}
                    onUpdate={function(updates) { props.onUpdateChild(path(), getIndex(), updates); }}
                    onRemove={function() { props.onRemoveNode(path(), getIndex()); }}
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

interface TextSearchNodeProps {
  node: ExpressionNode;
  onUpdate: (updates: Partial<ExpressionNode>) => void;
  onRemove: () => void;
  getNextColor: () => string;
  getUsedColors: () => Record<string, boolean>;
}

var TextSearchNode: Component<TextSearchNodeProps> = function(props) {
  var [showColorPicker, setShowColorPicker] = createSignal(false);
  var [localText, setLocalText] = createSignal(props.node.text || '');
  var node = function() { return props.node; };

  function handleTextInput(e: InputEvent) {
    var value = (e.target as HTMLInputElement).value;
    setLocalText(value);
  }

  function handleTextBlur() {
    props.onUpdate({ text: localText() });
  }

  var isEnabled = function() { return node().enabled !== false; };

  return (
    <div class={'expr-leaf expr-text-search' + (isEnabled() ? '' : ' expr-disabled')} style={{ 'border-left-color': node().color }}>
      <button 
        class={'expr-toggle-btn' + (isEnabled() ? ' is-on' : ' is-off')}
        onClick={function() { props.onUpdate({ enabled: !isEnabled() }); }}
        title={isEnabled() ? 'Disable this filter' : 'Enable this filter'}
      >
        {isEnabled() ? 'ON' : 'OFF'}
      </button>
      <button
        class="search-mode-btn"
        onClick={function() { props.onUpdate({ highlightOnly: !node().highlightOnly }); }}
        title={node().highlightOnly ? 'Highlight matching entries only' : 'Filter out non-matching entries'}
      >
        {node().highlightOnly ? 'HIGHLIGHT' : 'FILTER'}
      </button>
      <div style="position: relative">
        <button 
          class="search-color-btn" 
          style={{ 'background-color': node().color }}
          onClick={function(e) { e.stopPropagation(); setShowColorPicker(!showColorPicker()); }}
        />
        <Show when={showColorPicker()}>
          <div class="search-color-picker">
            <For each={SEARCH_COLORS}>
              {function(color) {
                var used = props.getUsedColors();
                if (used[color] && color !== node().color) return null;
                return (
                  <button 
                    class="search-color-option"
                    style={{ 'background-color': color }}
                    onClick={function(e) { 
                      e.stopPropagation(); 
                      props.onUpdate({ color: color }); 
                      setShowColorPicker(false); 
                    }}
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </div>
      <select 
        value={node().scope || 'all'}
        onChange={function(e) { props.onUpdate({ scope: (e.target as HTMLSelectElement).value }); }}
      >
        <option value="all">Req & Resp</option>
        <option value="request">Request</option>
        <option value="response">Response</option>
        <option value="url">URLs</option>
      </select>
      <select 
        value={node().part || 'all'}
        onChange={function(e) { props.onUpdate({ part: (e.target as HTMLSelectElement).value }); }}
      >
        <option value="all">Hdrs & Bodies</option>
        <option value="headers">Headers</option>
        <option value="bodies">Bodies</option>
      </select>
      <select 
        value={node().mode || 'text'}
        onChange={function(e) { props.onUpdate({ mode: (e.target as HTMLSelectElement).value }); }}
      >
        <option value="text">Text</option>
        <option value="case">Case</option>
        <option value="regex">Regex</option>
      </select>
      <input 
        type="text"
        placeholder="Search text..."
        value={localText()}
        onInput={handleTextInput}
        onBlur={handleTextBlur}
      />
      <button class="expr-remove-btn" onClick={props.onRemove}>×</button>
    </div>
  );
};

interface PropertyFilterNodeProps {
  node: ExpressionNode;
  onUpdate: (updates: Partial<ExpressionNode>) => void;
  onRemove: () => void;
}

var PropertyFilterNode: Component<PropertyFilterNodeProps> = function(props) {
  var node = function() { return props.node; };
  var operators = function() { return FILTER_OPERATORS[node().field || 'url'] || ['contains']; };
  var [localValue, setLocalValue] = createSignal(props.node.value || '');

  function handleFieldChange(field: string) {
    var newOps = FILTER_OPERATORS[field] || ['contains'];
    setLocalValue('');
    props.onUpdate({ field: field, filterOperator: newOps[0], value: '' });
  }

  function handleValueInput(e: InputEvent) {
    var value = (e.target as HTMLInputElement).value;
    setLocalValue(value);
  }

  function handleValueBlur() {
    props.onUpdate({ value: localValue() });
  }

  function renderValueInput() {
    var field = node().field;
    
    if (field === 'resourceType') {
      return (
        <select 
          value={node().value || ''}
          onChange={function(e) { props.onUpdate({ value: (e.target as HTMLSelectElement).value }); }}
        >
          <For each={Object.keys(RESOURCE_TYPES)}>
            {function(key) {
              return <option value={key}>{RESOURCE_TYPES[key].label}</option>;
            }}
          </For>
        </select>
      );
    }
    
    if (field === 'statusRange') {
      return (
        <select 
          value={node().value || ''}
          onChange={function(e) { props.onUpdate({ value: (e.target as HTMLSelectElement).value }); }}
        >
          <For each={STATUS_RANGES}>
            {function(range) {
              return <option value={range}>{range}</option>;
            }}
          </For>
        </select>
      );
    }
    
    if (field === 'method') {
      var methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      return (
        <select 
          value={node().value || ''}
          onChange={function(e) { props.onUpdate({ value: (e.target as HTMLSelectElement).value }); }}
        >
          <For each={methods}>
            {function(method) {
              return <option value={method}>{method}</option>;
            }}
          </For>
        </select>
      );
    }
    
    if (field === 'extension') {
      return (
        <select 
          value={node().value || ''}
          onChange={function(e) { props.onUpdate({ value: (e.target as HTMLSelectElement).value }); }}
        >
          <option value="">(none)</option>
          <For each={Object.keys(EXTENSION_FILTERS)}>
            {function(key) {
              return <option value={key}>{EXTENSION_FILTERS[key].label}</option>;
            }}
          </For>
        </select>
      );
    }
    
    return (
      <input 
        type="text"
        placeholder="Value..."
        value={localValue()}
        onInput={handleValueInput}
        onBlur={handleValueBlur}
      />
    );
  }

  var isEnabled = function() { return node().enabled !== false; };

  return (
    <div class={'expr-leaf expr-property-filter' + (node().exclude ? ' expr-exclude' : '') + (isEnabled() ? '' : ' expr-disabled')}>
      <button 
        class={'expr-toggle-btn' + (isEnabled() ? ' is-on' : ' is-off')}
        onClick={function() { props.onUpdate({ enabled: !isEnabled() }); }}
        title={isEnabled() ? 'Disable this filter' : 'Enable this filter'}
      >
        {isEnabled() ? 'ON' : 'OFF'}
      </button>
      <button 
        class={'expr-exc-btn' + (node().exclude ? ' is-exclude' : '')}
        onClick={function() { props.onUpdate({ exclude: !node().exclude }); }}
        title={node().exclude ? 'Exclude matching' : 'Include matching'}
      >
        {node().exclude ? 'EXC' : 'INC'}
      </button>
      <select 
        value={node().field || 'url'}
        onChange={function(e) { handleFieldChange((e.target as HTMLSelectElement).value); }}
      >
        <For each={FILTER_FIELDS}>
          {function(field) {
            return <option value={field.value}>{field.label}</option>;
          }}
        </For>
      </select>
      <select 
        value={node().filterOperator || 'contains'}
        onChange={function(e) { props.onUpdate({ filterOperator: (e.target as HTMLSelectElement).value }); }}
      >
        <For each={operators()}>
          {function(op) {
            return <option value={op}>{op}</option>;
          }}
        </For>
      </select>
      {renderValueInput()}
      <button class="expr-remove-btn" onClick={props.onRemove}>×</button>
    </div>
  );
};
