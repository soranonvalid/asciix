import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import './GlideSelect.css';

const SIZES = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 14 }
};
const PAD = 4;
const GAP = 1;
const MENU_GAP = 6;
const DEFAULT_OPTIONS = ['One', 'Two', 'Three'];

const norm = o => (typeof o === 'string' ? { value: o, label: o } : o);
const textOf = it => (typeof it.label === 'string' ? it.label : it.value);
const typeaheadIndex = (items, from, ch) => {
  const c = ch.toLowerCase();
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!items[i].disabled && textOf(items[i]).toLowerCase().startsWith(c)) return i;
  }
  return from;
};

export default function GlideSelect({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Select',
  triggerId,
  title,
  className = ''
}) {
  const items = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const selected = items.findIndex(it => it.value === current);
  const [phase, setPhase] = useState('closed');
  const [active, setActive] = useState(null);
  const [side, setSide] = useState(placement);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const pillRef = useRef(null);
  const instant = useRef(false);
  const closeTimer = useRef(undefined);
  const scrub = useRef(null);
  const id = useId();
  const S = SIZES[size] ?? SIZES.md;
  const step = S.row + GAP;
  const popOut = Math.round((popDuration * 2) / 3);
  const revealRow = index => {
    const row = menuRef.current?.querySelector('[data-index="' + index + '"]');
    if (!row) return;
    const list = row.parentElement;
    const bottom = row.offsetTop + row.offsetHeight;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  };

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const el = menuRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const r = root.getBoundingClientRect();
    const inset = 8;
    const below = window.innerHeight - r.bottom - MENU_GAP - inset;
    const above = r.top - MENU_GAP - inset;
    const preferredSpace = placement === 'bottom' ? below : above;
    const need = Math.min(items.length * step + PAD * 2 + 2, 320);
    const nextSide = preferredSpace < need && preferredSpace < Math.max(below, above)
      ? placement === 'bottom' ? 'top' : 'bottom'
      : placement;
    const width = Math.min(Math.max(r.width, menuWidth), window.innerWidth - 2 * inset);
    const left = align === 'right' ? r.right - width : r.left;
    el.style.width = width + 'px';
    el.style.left = Math.max(inset, Math.min(left, window.innerWidth - width - inset)) + 'px';
    el.style.top = nextSide === 'bottom' ? r.bottom + MENU_GAP + 'px' : 'auto';
    el.style.bottom = nextSide === 'top' ? window.innerHeight - r.top + MENU_GAP + 'px' : 'auto';
    el.style.setProperty('--gs-list-height', Math.max(1, Math.min(need, nextSide === 'bottom' ? below : above) - PAD * 2 - 2) + 'px');
    setSide(nextSide);
    if (!el.matches(':popover-open')) el.showPopover();
    if (active !== null) revealRow(active);
    el.style.transitionDuration = instant.current ? '0ms' : '';
    el.dataset.state = 'closed';
    void el.offsetHeight;
    el.dataset.state = 'open';
    const p = pillRef.current;
    if (p) {
      p.style.transition = 'none';
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      p.style.opacity = '0';
      void p.offsetHeight;
      p.style.transition = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useLayoutEffect(() => {
    const p = pillRef.current;
    if (!p || phase !== 'open') return;
    if (active === null) {
      p.style.opacity = '0';
      return;
    }
    const jump = instant.current || p.style.opacity !== '1';
    p.style.transitionDuration = jump ? '0ms, 150ms' : '';
    p.style.transform = `translateY(${active * step}px)`;
    p.style.opacity = '1';
    instant.current = false;
  }, [active, phase, step]);

  const open = viaKey => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    instant.current = true;
    const first = items.findIndex(it => !it.disabled);
    setActive(selected >= 0 && !items[selected].disabled ? selected : viaKey && first >= 0 ? first : null);
    setPhase('open');
  };
  const close = mode => {
    setActive(null);
    clearTimeout(closeTimer.current);
    const el = menuRef.current;
    if (mode === 'instant' || !el) {
      setPhase('closed');
      return;
    }
    el.style.transitionDuration = '';
    el.dataset.state = 'closed';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };
  const pick = (i, viaKey) => {
    const it = items[i];
    if (!it || it.disabled || disabled) return;
    if (it.value !== current) {
      if (value === undefined) setInner(it.value);
      onChange?.(it.value, it);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
    }
    close('instant');
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onTriggerKey = e => {
    const k = e.key;
    const n = items.length;
    const cur = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const go = (i, direction = 1) => {
      e.preventDefault();
      while (i >= 0 && i < n && items[i].disabled) i += direction;
      if (i < 0 || i >= n) return;
      instant.current = true;
      setActive(i);
      revealRow(i);
    };
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      const direction = k === 'ArrowDown' ? 1 : -1;
      go(active === null ? cur : cur + direction, direction);
    }
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1, k === 'Home' ? 1 : -1);
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(cur, true);
    } else if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') e.preventDefault();
      close('instant');
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close('pop');
    };
    const onScroll = e => {
      if (!menuRef.current?.contains(e.target)) close('instant');
    };
    const onResize = () => close('instant');
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const rowAt = y => {
    const s = scrub.current;
    if (!s) return null;
    const bounds = s.list.getBoundingClientRect();
    if (y < bounds.top || y >= bounds.bottom) return null;
    const yWithinList = (y - bounds.top) * s.list.offsetHeight / bounds.height;
    const i = Math.floor((yWithinList + s.list.scrollTop) / step);
    return i >= 0 && i < items.length && !items[i].disabled ? i : null;
  };
  const onListDown = e => {
    if (scrub.current || e.pointerType === 'touch' || e.button !== 0 || !e.target.closest('[data-index]')) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    scrub.current = { id: e.pointerId, list: e.currentTarget };
    instant.current = true;
    setActive(rowAt(e.clientY));
  };
  const onListMove = e => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = rowAt(e.clientY);
    if (i !== active) setActive(i);
  };
  const onListUp = e => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = e.type === 'pointerup' ? rowAt(e.clientY) : null;
    scrub.current = null;
    if (i !== null) pick(i, false);
    else if (!rememberPosition) setActive(null);
  };
  const onListOver = e => {
    if (e.pointerType === 'touch' || scrub.current) return;
    const row = e.target.closest('[data-index]');
    if (!row) return;
    const i = Number(row.dataset.index);
    if (i !== active && !items[i].disabled) setActive(i);
  };

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align}`;
  return (
    <div
      ref={rootRef}
      className={`glide-select${className ? ` ${className}` : ''}`}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={{
        '--gs-accent': accentColor,
        '--gs-surface': surfaceColor,
        '--gs-highlight': highlightColor,
        '--gs-text': textColor,
        '--gs-radius': `${radius}px`,
        '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
        '--gs-chip': `${S.chip}px`,
        '--gs-row': `${S.row}px`,
        '--gs-font': `${S.font}px`,
        '--gs-pop': `${popDuration}ms`,
        '--gs-pop-out': `${popOut}ms`,
        '--gs-glide': `${glideDuration}ms`,
        '--gs-origin': origin
      }}
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <button
        id={triggerId}
        title={title || (selected >= 0 ? textOf(items[selected]) : placeholder)}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className="glide-select__trigger"
        onClick={() => {
          if (phase === 'open') close('pop');
          else open(false);
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="glide-select__label" key={current} data-empty={selected < 0 ? '' : undefined}>
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 6 4 4 4-4" /></svg>
        </span>
      </button>
      {phase !== 'closed' ? (
        <div ref={menuRef} className="glide-select__menu" popover="manual" data-state="open">
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            className="glide-select__list"
            data-live={active !== null ? '' : undefined}
            onPointerOver={onListOver}
            onPointerLeave={() => {
              if (!scrub.current && !rememberPosition) setActive(null);
            }}
            onPointerDown={onListDown}
            onPointerMove={onListMove}
            onPointerUp={onListUp}
            onPointerCancel={onListUp}
            onLostPointerCapture={onListUp}
          >
            <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
            {items.map((it, i) => (
              <div
                key={it.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                aria-disabled={it.disabled || undefined}
                data-index={i}
                className="glide-select__option"
                title={textOf(it)}
                onClick={e => {
                  if (e.nativeEvent.pointerType === 'touch' || e.detail === 0) pick(i, false);
                }}
              >
                <span className="glide-select__name">{it.label}</span>
                {showTags && it.tag ? <span className="glide-select__tag">{it.tag}</span> : null}
                <span className="glide-select__check" data-on={i === selected ? '' : undefined} aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m3 8 3 3 7-7" /></svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
