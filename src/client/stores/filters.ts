import { createSignal, createRoot, createEffect } from 'solid-js';
import type { Filters, ExpressionNode } from '../types';
import { filtersApi } from '../api/client';
import { DEFAULT_EXPRESSION_TREE } from '../utils/constants';
import { archivesStore } from './archives';

function createFiltersStore() {
  var [filters, setFilters] = createSignal<Filters>({
    expressionTree: { ...DEFAULT_EXPRESSION_TREE },
    quickFilters: {},
    tagFilters: {},
    domainFilters: {},
    sortColumn: null,
    sortDirection: 'asc'
  });
  var [loading, setLoading] = createSignal(false);
  var [saveTimeout, setSaveTimeout] = createSignal<number | null>(null);
  var [expressionDirty, setExpressionDirty] = createSignal(false);
  var [expressionSaving, setExpressionSaving] = createSignal(false);
  var [savedExpressionTree, setSavedExpressionTree] = createSignal<ExpressionNode>({ ...DEFAULT_EXPRESSION_TREE });

  async function loadFilters(archiveId: number) {
    setLoading(true);
    try {
      var result = await filtersApi.get(archiveId);
      setFilters(result.filters);
      setSavedExpressionTree(result.filters.expressionTree);
      setExpressionDirty(false);
    } catch (err) {
      setFilters({
        expressionTree: { ...DEFAULT_EXPRESSION_TREE },
        quickFilters: {},
        tagFilters: {},
        domainFilters: {},
        sortColumn: null,
        sortDirection: 'asc'
      });
      setSavedExpressionTree({ ...DEFAULT_EXPRESSION_TREE });
      setExpressionDirty(false);
    } finally {
      setLoading(false);
    }
  }

  function debouncedSaveNonExpression() {
    var archiveId = archivesStore.currentArchiveId();
    if (archiveId === null) return;
    
    var timeout = saveTimeout();
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    var newTimeout = window.setTimeout(function() {
      var currentFilters = filters();
      var filtersToSave = {
        ...currentFilters,
        expressionTree: savedExpressionTree()
      };
      filtersApi.save(archiveId!, filtersToSave).catch(function(err) {
        console.error('Failed to save filters:', err);
      });
    }, 500);
    
    setSaveTimeout(newTimeout);
  }

  function setExpressionTree(tree: ExpressionNode) {
    setFilters(function(prev) { return { ...prev, expressionTree: tree }; });
    setExpressionDirty(true);
  }

  async function saveExpressionTree() {
    var archiveId = archivesStore.currentArchiveId();
    if (archiveId === null) return;
    
    setExpressionSaving(true);
    try {
      await filtersApi.save(archiveId, filters());
      setSavedExpressionTree(filters().expressionTree);
      setExpressionDirty(false);
    } catch (err) {
      console.error('Failed to save expression tree:', err);
      throw err;
    } finally {
      setExpressionSaving(false);
    }
  }

  function discardExpressionChanges() {
    setFilters(function(prev) { return { ...prev, expressionTree: savedExpressionTree() }; });
    setExpressionDirty(false);
  }

  function setQuickFilter(key: string, value: boolean) {
    setFilters(function(prev) {
      var newQuickFilters = { ...prev.quickFilters, [key]: value };
      return { ...prev, quickFilters: newQuickFilters };
    });
    debouncedSaveNonExpression();
  }

  function setTagFilter(key: string, value: boolean) {
    setFilters(function(prev) {
      var newTagFilters = { ...prev.tagFilters, [key]: value };
      return { ...prev, tagFilters: newTagFilters };
    });
    debouncedSaveNonExpression();
  }

  function resetQuickFilters() {
    setFilters(function(prev) { return { ...prev, quickFilters: {} }; });
    debouncedSaveNonExpression();
  }

  function setDomainFilter(domain: string, excluded: boolean) {
    setFilters(function(prev) {
      var newDomainFilters = { ...prev.domainFilters, [domain]: excluded };
      if (!excluded) delete newDomainFilters[domain];
      return { ...prev, domainFilters: newDomainFilters };
    });
    debouncedSaveNonExpression();
  }

  function resetDomainFilters() {
    setFilters(function(prev) { return { ...prev, domainFilters: {} }; });
    debouncedSaveNonExpression();
  }

  function setSort(column: string | null, direction: 'asc' | 'desc') {
    setFilters(function(prev) {
      return { ...prev, sortColumn: column, sortDirection: direction };
    });
    debouncedSaveNonExpression();
  }

  function toggleSort(column: string) {
    var current = filters();
    if (current.sortColumn === column) {
      setSort(column, current.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column, 'asc');
    }
  }

  async function copyFromArchive(sourceArchiveId: number, mode: 'replace' | 'merge', copyNoiseHeaders: boolean = true) {
    var targetArchiveId = archivesStore.currentArchiveId();
    if (targetArchiveId === null) return;
    
    try {
      await filtersApi.copy(sourceArchiveId, targetArchiveId, mode, copyNoiseHeaders);
      await loadFilters(targetArchiveId);
    } catch (err) {
      console.error('Failed to copy filters:', err);
      throw err;
    }
  }

  return {
    filters: filters,
    loading: loading,
    expressionDirty: expressionDirty,
    expressionSaving: expressionSaving,
    loadFilters: loadFilters,
    setExpressionTree: setExpressionTree,
    saveExpressionTree: saveExpressionTree,
    discardExpressionChanges: discardExpressionChanges,
    setQuickFilter: setQuickFilter,
    setTagFilter: setTagFilter,
    resetQuickFilters: resetQuickFilters,
    setDomainFilter: setDomainFilter,
    resetDomainFilters: resetDomainFilters,
    setSort: setSort,
    toggleSort: toggleSort,
    copyFromArchive: copyFromArchive
  };
}

export var filtersStore = createRoot(createFiltersStore);
