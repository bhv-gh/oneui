import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Hash, AtSign, Bookmark, X, Filter } from 'lucide-react';
import { generateId } from '../utils/idGenerator';

// ============================================================
// Filter expression parser & serializer
// ============================================================
//
// Grammar (case-insensitive AND/OR):
//   expr     = term ((AND | OR) term)*
//   term     = '(' expr ')' | condition
//   condition = '#' identifier | '@' identifier
//
// Operator precedence: AND binds tighter than OR.
// Parentheses override precedence.

// --- Tokenizer ---

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    if (input[i] === '(') { tokens.push({ type: 'LPAREN', pos: i }); i++; continue; }
    if (input[i] === ')') { tokens.push({ type: 'RPAREN', pos: i }); i++; continue; }
    if (input[i] === '#' || input[i] === '@') {
      const prefix = input[i];
      const field = prefix === '#' ? 'tag' : 'project';
      i++;
      let value = '';
      while (i < input.length && /[^\s()#@]/.test(input[i])) {
        value += input[i];
        i++;
      }
      if (value) {
        tokens.push({ type: 'CONDITION', field, value, pos: i - value.length - 1 });
      }
      continue;
    }
    // AND / OR keywords
    const rest = input.slice(i);
    const andMatch = rest.match(/^(AND)\b/i);
    if (andMatch) { tokens.push({ type: 'AND', pos: i }); i += 3; continue; }
    const orMatch = rest.match(/^(OR)\b/i);
    if (orMatch) { tokens.push({ type: 'OR', pos: i }); i += 2; continue; }
    // Skip unknown character
    i++;
  }
  return tokens;
}

// --- Recursive descent parser ---
// Returns a FilterGroup/FilterCondition tree.
// Precedence: OR is lower than AND.

function parseExpression(tokens, pos) {
  // expr = andExpr (OR andExpr)*
  let { node, pos: nextPos } = parseAndExpr(tokens, pos);
  const orChildren = [node];

  while (nextPos < tokens.length && tokens[nextPos].type === 'OR') {
    nextPos++; // consume OR
    const result = parseAndExpr(tokens, nextPos);
    orChildren.push(result.node);
    nextPos = result.pos;
  }

  if (orChildren.length === 1) return { node: orChildren[0], pos: nextPos };
  return {
    node: { id: generateId(), type: 'group', operator: 'OR', children: orChildren },
    pos: nextPos,
  };
}

function parseAndExpr(tokens, pos) {
  // andExpr = atom (AND atom)*
  let { node, pos: nextPos } = parseAtom(tokens, pos);
  const andChildren = [node];

  while (nextPos < tokens.length && tokens[nextPos].type === 'AND') {
    nextPos++; // consume AND
    const result = parseAtom(tokens, nextPos);
    andChildren.push(result.node);
    nextPos = result.pos;
  }

  if (andChildren.length === 1) return { node: andChildren[0], pos: nextPos };
  return {
    node: { id: generateId(), type: 'group', operator: 'AND', children: andChildren },
    pos: nextPos,
  };
}

function parseAtom(tokens, pos) {
  if (pos >= tokens.length) {
    // Empty — return a dummy condition that matches nothing
    return { node: { id: generateId(), type: 'group', operator: 'AND', children: [] }, pos };
  }

  if (tokens[pos].type === 'LPAREN') {
    pos++; // consume '('
    const result = parseExpression(tokens, pos);
    if (result.pos < tokens.length && tokens[result.pos].type === 'RPAREN') {
      return { node: result.node, pos: result.pos + 1 };
    }
    // Missing closing paren — still return what we parsed
    return result;
  }

  if (tokens[pos].type === 'CONDITION') {
    const t = tokens[pos];
    return {
      node: { id: generateId(), type: 'condition', field: t.field, value: t.value },
      pos: pos + 1,
    };
  }

  // Unexpected token — skip
  return parseAtom(tokens, pos + 1);
}

export function parseFilterText(text) {
  if (!text || !text.trim()) {
    return { id: 'root', type: 'group', operator: 'AND', children: [] };
  }
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { id: 'root', type: 'group', operator: 'AND', children: [] };
  }
  const { node } = parseExpression(tokens, 0);
  // Wrap in root group if the result is a single condition
  if (node.type === 'condition') {
    return { id: 'root', type: 'group', operator: 'AND', children: [node] };
  }
  // Ensure root has id='root'
  return { ...node, id: 'root' };
}

// --- Serializer: expression tree → text ---

export function serializeExpression(expr) {
  if (!expr) return '';
  if (expr.type === 'condition') {
    return expr.field === 'project' ? `@${expr.value}` : `#${expr.value}`;
  }
  if (expr.type === 'group') {
    if (!expr.children || expr.children.length === 0) return '';
    const parts = expr.children.map(child => {
      const s = serializeExpression(child);
      // Wrap child groups in parens if they have a different operator (lower precedence mixing)
      if (child.type === 'group' && child.children.length > 1 && child.operator !== expr.operator) {
        return `(${s})`;
      }
      return s;
    }).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts.join(` ${expr.operator} `);
  }
  return '';
}

// ============================================================
// Autocomplete suggestions engine
// ============================================================

function getAutocompleteSuggestions(text, cursorPos, allProjects, allTags) {
  const before = text.slice(0, cursorPos);
  if (!before.length) {
    // Empty input — suggest all conditions
    return [
      ...allProjects.map(p => ({ label: `@${p}`, value: `@${p} `, type: 'project', replaceFrom: 0, replaceTo: 0 })),
      ...allTags.map(t => ({ label: `#${t}`, value: `#${t} `, type: 'tag', replaceFrom: 0, replaceTo: 0 })),
    ];
  }

  // 1. Typing a condition: #partial or @partial
  const conditionMatch = before.match(/(#|@)([^\s()#@]*)$/);
  if (conditionMatch) {
    const prefix = conditionMatch[1];
    const partial = conditionMatch[2].toLowerCase();
    const replaceFrom = cursorPos - conditionMatch[0].length;
    const items = prefix === '#' ? allTags : allProjects;
    const sigil = prefix;
    return items
      .filter(item => !partial || item.toLowerCase().startsWith(partial))
      .map(item => ({
        label: `${sigil}${item}`,
        value: `${sigil}${item} `,
        type: prefix === '#' ? 'tag' : 'project',
        replaceFrom,
        replaceTo: cursorPos,
      }));
  }

  // 2. Typing a keyword (partial AND/OR)
  const wordMatch = before.match(/\b([a-zA-Z]+)$/);
  if (wordMatch) {
    const partial = wordMatch[1].toLowerCase();
    const replaceFrom = cursorPos - partial.length;
    const suggestions = [];

    const beforeWord = before.slice(0, replaceFrom).trimEnd();
    const afterConditionOrParen = !beforeWord || /[#@]\S+$|\)$/.test(beforeWord);

    if (afterConditionOrParen) {
      // After a condition — suggest matching operators (only partial, not already complete)
      if ('and'.startsWith(partial) && partial !== 'and') {
        suggestions.push({ label: 'AND', value: 'AND ', type: 'operator', replaceFrom, replaceTo: cursorPos });
      }
      if ('or'.startsWith(partial) && partial !== 'or') {
        suggestions.push({ label: 'OR', value: 'OR ', type: 'operator', replaceFrom, replaceTo: cursorPos });
      }
    }

    // Fully typed operator (AND/OR) without trailing space — suggest conditions
    if (partial === 'and' || partial === 'or') {
      allProjects.forEach(p => {
        suggestions.push({ label: `@${p}`, value: ` @${p} `, type: 'project', replaceFrom: cursorPos, replaceTo: cursorPos });
      });
      allTags.forEach(t => {
        suggestions.push({ label: `#${t}`, value: ` #${t} `, type: 'tag', replaceFrom: cursorPos, replaceTo: cursorPos });
      });
    }

    return suggestions;
  }

  // 3. Cursor is at a clean boundary (after space)
  const trimmed = before.trimEnd();
  const lastToken = trimmed.match(/(\S+)$/);
  const lastTok = lastToken ? lastToken[1] : '';

  // After a condition or closing paren — suggest operators
  if (/[#@]\S+$|\)$/.test(trimmed)) {
    return [
      { label: 'AND', value: 'AND ', type: 'operator', replaceFrom: cursorPos, replaceTo: cursorPos },
      { label: 'OR', value: 'OR ', type: 'operator', replaceFrom: cursorPos, replaceTo: cursorPos },
    ];
  }

  // After an operator or opening paren — suggest conditions
  if (/(AND|OR)$/i.test(lastTok) || lastTok === '(') {
    return [
      ...allProjects.map(p => ({ label: `@${p}`, value: `@${p} `, type: 'project', replaceFrom: cursorPos, replaceTo: cursorPos })),
      ...allTags.map(t => ({ label: `#${t}`, value: `#${t} `, type: 'tag', replaceFrom: cursorPos, replaceTo: cursorPos })),
    ];
  }

  return [];
}

// ============================================================
// Filter Input Component — the text-based query bar
// ============================================================

const FilterInput = ({ value, onChange, onApply, allProjects, allTags, placeholder }) => {
  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const ignoreBlurRef = useRef(false);

  // Sync external value only when input is not focused (user not actively typing)
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) return;
    setText(value);
  }, [value]);

  const updateSuggestions = useCallback((inputText, cursorPos) => {
    const s = getAutocompleteSuggestions(inputText, cursorPos, allProjects, allTags);
    setSuggestions(s);
    setSelectedIndex(0);
    setShowSuggestions(s.length > 0);
  }, [allProjects, allTags]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    updateSuggestions(newText, e.target.selectionStart || newText.length);
    // Live parse and apply
    onApply(newText);
  };

  const applySuggestion = (suggestion) => {
    const before = text.slice(0, suggestion.replaceFrom);
    const after = text.slice(suggestion.replaceTo);
    const newText = before + suggestion.value + after;
    setText(newText);
    setShowSuggestions(false);
    onApply(newText);
    // Focus and place cursor after inserted text
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const cursorPos = (before + suggestion.value).length;
        inputRef.current.setSelectionRange(cursorPos, cursorPos);
        updateSuggestions(newText, cursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setText('');
        onApply('');
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      // Accept the selected suggestion
      e.preventDefault();
      applySuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    } else if (e.key === ' ') {
      // Space dismisses the suggestion list — let the character type normally
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    updateSuggestions(text, cursorPos);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (!ignoreBlurRef.current) {
        setShowSuggestions(false);
      }
      ignoreBlurRef.current = false;
    }, 150);
  };

  const handleClick = () => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    updateSuggestions(text, cursorPos);
  };

  const getSuggestionIcon = (type) => {
    if (type === 'tag') return <Hash size={10} className="text-accent opacity-60" />;
    if (type === 'project') return <AtSign size={10} className="text-accent-secondary opacity-60" />;
    return <span className="text-[9px] font-bold text-content-disabled w-[10px] text-center">op</span>;
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        placeholder={placeholder || '#tag AND @project'}
        spellCheck={false}
        className="w-full bg-surface-secondary text-sm text-content-primary border border-edge-primary rounded-lg px-3 py-2 font-mono tracking-wide focus:outline-none focus:border-accent-bold focus:ring-1 focus:ring-accent/30 placeholder:text-content-muted placeholder:tracking-normal placeholder:font-sans transition-all"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-primary border border-edge-secondary rounded-lg shadow-xl max-h-[180px] overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={() => { ignoreBlurRef.current = true; }}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              onClick={() => applySuggestion(s)}
              className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                i === selectedIndex
                  ? 'bg-accent-subtle text-accent'
                  : 'text-content-secondary hover:bg-surface-secondary'
              }`}
            >
              {getSuggestionIcon(s.type)}
              <span className="font-mono">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Active filter pills — compact read view of current expression
// ============================================================

const ExpressionPills = ({ expression }) => {
  if (!expression || (expression.type === 'group' && (!expression.children || expression.children.length === 0))) {
    return null;
  }

  const renderNode = (node, depth = 0) => {
    if (node.type === 'condition') {
      const isProject = node.field === 'project';
      return (
        <span
          key={node.id}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full border font-mono ${
            isProject
              ? 'bg-accent-secondary-subtle text-accent-secondary border-accent-secondary/30'
              : 'bg-accent-subtle text-accent border-accent-bold/30'
          }`}
        >
          {isProject ? <AtSign size={8} /> : <Hash size={8} />}
          {node.value}
        </span>
      );
    }

    if (node.type === 'group' && node.children && node.children.length > 0) {
      const needsParens = depth > 0;
      return (
        <span key={node.id} className="inline-flex items-center gap-1 flex-wrap">
          {needsParens && <span className="text-[10px] text-content-disabled font-mono">(</span>}
          {node.children.map((child, i) => (
            <React.Fragment key={child.id}>
              {i > 0 && (
                <span className="text-[9px] font-bold text-content-muted font-mono px-0.5">
                  {node.operator}
                </span>
              )}
              {renderNode(child, depth + 1)}
            </React.Fragment>
          ))}
          {needsParens && <span className="text-[10px] text-content-disabled font-mono">)</span>}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-0.5">
      {renderNode(expression)}
    </div>
  );
};

// ============================================================
// Main FilterSidebar
// ============================================================

const FilterSidebar = ({ treeData, activeFilter, onFilterChange, savedFilters, onSaveFilter, onDeleteFilter }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState(() => serializeExpression(activeFilter));

  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const serialized = serializeExpression(activeFilter);
    setFilterText(serialized);
  }, [activeFilter]);

  // Extract all unique projects and tags from the full tree
  const { allProjects, allTags } = useMemo(() => {
    const projects = new Set();
    const tags = new Set();

    const traverse = (nodes) => {
      for (const node of nodes) {
        if (node.project) projects.add(node.project);
        if (node.tags) node.tags.forEach(t => tags.add(t));
        if (node.children) traverse(node.children);
      }
    };
    traverse(treeData);

    return {
      allProjects: Array.from(projects).sort(),
      allTags: Array.from(tags).sort(),
    };
  }, [treeData]);

  const hasActiveFilter = activeFilter.children && activeFilter.children.length > 0;

  const handleClearFilter = useCallback(() => {
    const empty = { id: 'root', type: 'group', operator: 'AND', children: [] };
    isInternalChangeRef.current = true;
    onFilterChange(empty);
    setFilterText('');
  }, [onFilterChange]);

  const handleApplyText = useCallback((text) => {
    setFilterText(text);
    const parsed = parseFilterText(text);
    isInternalChangeRef.current = true;
    onFilterChange(parsed);
  }, [onFilterChange]);

  // --- Palette clicks: append to text ---
  const handlePaletteProjectClick = (project) => {
    const token = `@${project}`;
    const current = filterText.trim();
    if (current.includes(token)) {
      // Remove it
      const newText = current.replace(new RegExp(`\\s*(AND|OR)?\\s*@${escapeRegex(project)}\\s*`, 'i'), ' ')
        .replace(/^\s*(AND|OR)\s*/i, '').replace(/\s*(AND|OR)\s*$/i, '').trim();
      handleApplyText(newText);
    } else {
      const newText = current ? `${current} AND ${token}` : token;
      handleApplyText(newText);
    }
  };

  const handlePaletteTagClick = (tag) => {
    const token = `#${tag}`;
    const current = filterText.trim();
    if (current.includes(token)) {
      const newText = current.replace(new RegExp(`\\s*(AND|OR)?\\s*#${escapeRegex(tag)}\\s*`, 'i'), ' ')
        .replace(/^\s*(AND|OR)\s*/i, '').replace(/\s*(AND|OR)\s*$/i, '').trim();
      handleApplyText(newText);
    } else {
      const newText = current ? `${current} AND ${token}` : token;
      handleApplyText(newText);
    }
  };

  const isProjectActive = (project) => filterText.includes(`@${project}`);
  const isTagActive = (tag) => filterText.includes(`#${tag}`);

  // --- Saved filters ---
  const handleSaveFilter = () => {
    if (!newFilterName.trim() || !hasActiveFilter) return;
    onSaveFilter({
      id: generateId(),
      name: newFilterName.trim(),
      expression: JSON.parse(JSON.stringify(activeFilter)),
      text: filterText,
    });
    setNewFilterName('');
    setIsCreating(false);
  };

  const handleApplySavedFilter = (filter) => {
    if (filter.text) {
      handleApplyText(filter.text);
    } else if (filter.expression) {
      onFilterChange(filter.expression);
    } else {
      onFilterChange(migrateLegacyFilter(filter));
    }
  };

  const isFilterActive = (filter) => {
    if (filter.text) return filterText.trim() === filter.text.trim();
    return JSON.stringify(activeFilter) === JSON.stringify(filter.expression || migrateLegacyFilter(filter));
  };

  if (allProjects.length === 0 && allTags.length === 0 && savedFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-8 transition-all duration-300">
      {/* Compact bar — always visible */}
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            hasActiveFilter
              ? 'bg-accent-subtle text-accent border border-accent/30'
              : 'bg-surface-secondary/60 text-content-tertiary hover:text-content-primary border border-transparent'
          }`}
        >
          <Filter size={13} />
          <span className="font-medium">Filter</span>
          {hasActiveFilter && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        {/* Inline pills when compact */}
        {!isExpanded && hasActiveFilter && (
          <div className="flex items-center gap-1 animate-in fade-in duration-150">
            <ExpressionPills expression={activeFilter} />
            <button
              onClick={handleClearFilter}
              className="p-1 rounded-md text-content-disabled hover:text-danger hover:bg-danger/10 transition-colors"
              title="Clear filters"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Quick toggle pills for projects/tags when compact */}
        {!isExpanded && !hasActiveFilter && (allProjects.length > 0 || allTags.length > 0) && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar animate-in fade-in duration-150">
            {allProjects.map(project => (
              <button
                key={project}
                onClick={() => handlePaletteProjectClick(project)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-all border flex-shrink-0 flex items-center gap-1 ${
                  isProjectActive(project)
                    ? 'bg-accent-secondary-subtle text-accent-secondary border-accent-secondary/50 font-semibold'
                    : 'text-content-muted border-edge-secondary hover:border-accent-secondary/50 hover:text-accent-secondary'
                }`}
              >
                <AtSign size={8} className="opacity-60" />
                {project}
              </button>
            ))}
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handlePaletteTagClick(tag)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-all border flex-shrink-0 ${
                  isTagActive(tag)
                    ? 'bg-accent-subtle text-accent border-accent-bold/50 font-semibold'
                    : 'text-content-muted border-edge-secondary hover:border-accent-bold/50 hover:text-accent'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Saved filter quick picks */}
        {!isExpanded && savedFilters.length > 0 && (
          <div className="flex items-center gap-1 ml-1">
            {savedFilters.slice(0, 3).map(filter => (
              <button
                key={filter.id}
                onClick={() => handleApplySavedFilter(filter)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-all border flex-shrink-0 flex items-center gap-1 ${
                  isFilterActive(filter)
                    ? 'bg-accent-subtle text-accent border-accent-bold/50 font-semibold'
                    : 'text-content-muted border-edge-secondary hover:text-content-primary'
                }`}
              >
                <Bookmark size={8} className="opacity-50" />
                {filter.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="pb-3 animate-in slide-in-from-top-1 duration-200">
          <div className="bg-surface-primary/80 backdrop-blur-md border border-edge-secondary rounded-xl p-4">
            <div className="flex gap-4">
              {/* Left: filter input + expression */}
              <div className="flex-1 min-w-0">
                <FilterInput
                  value={filterText}
                  onChange={setFilterText}
                  onApply={handleApplyText}
                  allProjects={allProjects}
                  allTags={allTags}
                  placeholder="#tag AND @project OR (#urgent AND @work)"
                />
                {hasActiveFilter && (
                  <div className="mt-2 flex items-center gap-2">
                    <ExpressionPills expression={activeFilter} />
                    <button
                      onClick={handleClearFilter}
                      className="p-1 rounded-md text-content-disabled hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                      title="Clear"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Right: palettes */}
              <div className="flex-shrink-0 flex flex-col gap-2 max-w-[280px]">
                {allProjects.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {allProjects.map(project => (
                      <button
                        key={project}
                        onClick={() => handlePaletteProjectClick(project)}
                        className={`px-2 py-0.5 text-[10px] rounded-full transition-all border flex items-center gap-1 ${
                          isProjectActive(project)
                            ? 'bg-accent-secondary-subtle text-accent-secondary border-accent-secondary/50 font-semibold'
                            : 'text-content-tertiary border-edge-primary hover:border-accent-secondary/50 hover:text-accent-secondary'
                        }`}
                      >
                        <AtSign size={8} className="opacity-60" />
                        {project}
                      </button>
                    ))}
                  </div>
                )}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handlePaletteTagClick(tag)}
                        className={`px-2 py-0.5 text-[10px] rounded-full transition-all border ${
                          isTagActive(tag)
                            ? 'bg-accent-subtle text-accent border-accent-bold/50 font-semibold'
                            : 'text-content-tertiary border-edge-primary hover:border-accent-bold/50 hover:text-accent'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Saved filters row */}
            {(savedFilters.length > 0 || hasActiveFilter) && (
              <div className="mt-3 pt-3 border-t border-edge-secondary flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-content-disabled uppercase tracking-widest">Saved</span>
                {savedFilters.map(filter => (
                  <div key={filter.id} className="flex items-center group/filter">
                    <button
                      onClick={() => handleApplySavedFilter(filter)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg transition-all flex items-center gap-1.5 ${
                        isFilterActive(filter)
                          ? 'bg-accent-subtle text-accent font-semibold'
                          : 'text-content-secondary hover:bg-surface-secondary hover:text-content-primary'
                      }`}
                    >
                      <Bookmark size={10} className="opacity-50" />
                      {filter.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter(filter.id)}
                      className="p-0.5 rounded text-content-disabled hover:text-danger transition-all opacity-0 group-hover/filter:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {hasActiveFilter && (
                  isCreating ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveFilter();
                          if (e.key === 'Escape') { setIsCreating(false); setNewFilterName(''); }
                        }}
                        placeholder="Name..."
                        className="w-24 bg-surface-secondary text-[10px] text-content-primary border border-edge-secondary rounded-md px-2 py-1 focus:outline-none focus:border-accent-bold"
                        autoFocus
                      />
                      <button onClick={handleSaveFilter} className="p-1 text-accent hover:bg-accent-subtle rounded transition-colors"><Bookmark size={10} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreating(true)}
                      className="px-2 py-0.5 text-[10px] text-content-muted hover:text-accent border border-dashed border-edge-secondary hover:border-accent-bold rounded-full flex items-center gap-1 transition-colors"
                    >
                      <Bookmark size={9} />
                      Save
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Utility ---

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Utility: migrate legacy saved filter to expression format ---

export function migrateLegacyFilter(filter) {
  if (filter.expression) return filter.expression;
  const children = [];
  if (filter.project) {
    children.push({ id: generateId(), type: 'condition', field: 'project', value: filter.project });
  }
  if (filter.tags && filter.tags.length > 0) {
    filter.tags.forEach(tag => {
      children.push({ id: generateId(), type: 'condition', field: 'tag', value: tag });
    });
  }
  return { id: 'root', type: 'group', operator: 'AND', children };
}

export default FilterSidebar;
