import { useEffect, useRef, useState } from 'react';
import './SearchableSelect.css';

/**
 * options: [{ value, label, meta? }]
 * value: currently selected value (matches option.value), or '' / null
 * onChange: (option | null) => void  -- receives the full option object, or a
 *           synthetic { value, label, isCustom: true } when allowCustom is used
 * allowCustom: lets the user commit free text that isn't in the options list
 *              (useful for Item Name, since your backend auto-creates new items)
 */
export default function SearchableSelect({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = 'Search...',
  required = false,
  error = '',
  disabled = false,
  allowCustom = false,
  emptyMessage = 'No matches found.',
}) {
  const selectedOption = options.find((o) => o.value === value) || null;

  const [inputText, setInputText] = useState(selectedOption?.label || '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [localOptions, setLocalOptions] = useState(options);
  const containerRef = useRef(null);

  // Keep the visible text in sync when the selection is changed externally
  // (e.g. form reset, or editing an existing row).
  useEffect(() => {
    setInputText(selectedOption?.label || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        commitOrRevert();
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, options]);

  const filtered = localOptions.filter((o) =>
    o.label.toLowerCase().includes(inputText.trim().toLowerCase())
  );

  function commitOrRevert() {
    const exactMatch = options.find((o) => o.label.toLowerCase() === inputText.trim().toLowerCase());
    if (exactMatch) {
      onChange(exactMatch);
      setInputText(exactMatch.label);
    }
    else if (allowCustom && inputText.trim()) {
        const newOption = {
            value: inputText.trim(),
            label: inputText.trim(),
            isCustom: true
        };

        setLocalOptions(prev => [...prev, newOption]);

        onChange(newOption);

        setInputText(newOption.label);
      }  
    else if (!inputText.trim()) {
      onChange(null);
    }
    else {
      // No match, custom not allowed -> revert to last valid selection
      setInputText(selectedOption?.label || '');
    }
  }

  function selectOption(option) {
    onChange(option);
    setInputText(option.label);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) {
        selectOption(filtered[highlighted]);
      } else {
        setOpen(false);
        commitOrRevert();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      commitOrRevert();
    }
  }

  return (
    <div className="form-field searchable-select" ref={containerRef}>
      {label && (
        <label className="form-field__label" htmlFor={name}>
          {label} {required && <span className="form-field__required">*</span>}
        </label>
      )}
      <div className="searchable-select__control">
        <input
          id={name}
          type="text"
          className={`form-field__input ${error ? 'form-field__input--error' : ''}`}
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => { setOpen(true); setHighlighted(0); }}
          onChange={(e) => { setInputText(e.target.value); setOpen(true); setHighlighted(0); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <span
      className="searchable-select__chevron" aria-hidden="true"onMouseDown={(e) => {e.preventDefault();setOpen((prev) => !prev);}}>▾</span>

        {open && !disabled && (
          <div className="searchable-select__menu">
            {filtered.length === 0 && (
              <div className="searchable-select__empty">
                {allowCustom && inputText.trim()
                  ? `Press Enter to use "${inputText.trim()}"`
                  : emptyMessage}
              </div>
            )}
            {filtered.map((opt, idx) => (
              <div
                key={opt.value}
                className={`searchable-select__option ${idx === highlighted ? 'searchable-select__option--highlighted' : ''} ${opt.value === value ? 'searchable-select__option--selected' : ''}`}
                onMouseDown={() => selectOption(opt)}
                onMouseEnter={() => setHighlighted(idx)}
              >
                <span>{opt.label}</span>
                {opt.meta && <span className="searchable-select__option-meta">{opt.meta}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}
