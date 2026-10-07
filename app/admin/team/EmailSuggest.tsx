"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type AccountSuggestion, suggestAccounts } from "./actions";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };

/** Email box that suggests matching accounts (by name or email) as the admin types. */
export default function EmailSuggest() {
  const listId = useId();
  const [value, setValue] = useState("");
  const [items, setItems] = useState<AccountSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef("");

  useEffect(() => {
    const q = value.trim();
    latest.current = q;
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await suggestAccounts(q).catch(() => []);
      // Ignore answers to queries the admin has already typed past.
      if (latest.current !== q) return;
      setItems(result);
      setActive(result.length ? 0 : -1);
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

  function pick(item: AccountSuggestion) {
    setValue(item.email);
    latest.current = item.email;
    setItems([]);
    setOpen(false);
  }

  const showList = open && value.trim().length >= 2;

  return (
    <div className="email-suggest">
      <input
        type="text"
        inputMode="email"
        name="email"
        value={value}
        placeholder="Type a name or email"
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={showList && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + items.length) % items.length);
          } else if (e.key === "Enter" && active >= 0 && items[active].email !== value) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="email-suggest-list">
          {items.length === 0 ? (
            <li className="email-suggest-empty">No matching account yet</li>
          ) : (
            items.map((item, i) => (
              <li
                key={item.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="email-suggest-name">{item.name}</span>
                <span className="email-suggest-email">{item.email}</span>
                {item.role !== "CUSTOMER" && <span className="email-suggest-role">{ROLE_LABELS[item.role]}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
