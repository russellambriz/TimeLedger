import { useState } from 'react';
import { nextColor, PALETTE } from '../lib/defaults';
import { useStore } from '../store';
import { Sheet } from './Sheet';

export function CategorySheet({ onClose }: { onClose: () => void }) {
  const { state, setCategory, addCategory, updateCategory, removeCategory, restoreCategory } = useStore();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => nextColor(state.categories));
  const activeCount = state.categories.filter((category) => !category.archived).length;
  const selected = state.active?.categoryId ?? state.lastCategoryId;

  const choose = (id: string) => {
    setCategory(id);
    onClose();
  };

  const add = () => {
    const id = addCategory(name, color);
    if (!id) return;
    setCategory(id);
    onClose();
  };

  const colorsFor = (current: string) => (PALETTE.includes(current) ? PALETTE : [current, ...PALETTE]);

  return (
    <Sheet title="Category" onClose={onClose}>
      <div className="sheet-tools">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            if (editing) {
              setEditing(false);
              return;
            }
            const next: Record<string, string> = {};
            for (const category of state.categories) next[category.id] = category.name;
            setDrafts(next);
            setEditing(true);
          }}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <ul className="cat-list">
        {state.categories
          .filter((category) => !category.archived)
          .map((category) =>
            editing ? (
              <li key={category.id} className="cat-edit">
                <div className="cat-edit-row">
                  <span className="dot" style={{ background: category.color }} />
                  <input
                    aria-label={`Rename ${category.name}`}
                    value={drafts[category.id] ?? category.name}
                    maxLength={40}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((current) => ({ ...current, [category.id]: value }));
                      if (value.trim()) updateCategory(category.id, { name: value });
                    }}
                    onBlur={() => {
                      const value = (drafts[category.id] ?? category.name).trim();
                      if (value) updateCategory(category.id, { name: value });
                    }}
                  />
                  <button
                    type="button"
                    className="text-btn danger"
                    disabled={activeCount <= 1}
                    onClick={() => removeCategory(category.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="swatches">
                  {colorsFor(category.color).map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={swatch === category.color ? 'swatch is-on' : 'swatch'}
                      style={{ background: swatch }}
                      aria-label={`Color ${swatch}`}
                      onClick={() => updateCategory(category.id, { color: swatch })}
                    />
                  ))}
                </div>
              </li>
            ) : (
              <li key={category.id}>
                <button type="button" className="cat-row" onClick={() => choose(category.id)}>
                  <span className="dot" style={{ background: category.color }} />
                  <span>{category.name}</span>
                  {selected === category.id && <span className="check">Selected</span>}
                </button>
              </li>
            ),
          )}
      </ul>
      {editing && state.categories.some((category) => category.archived) && (
        <div className="removed-block">
          <p className="quiet">Removed</p>
          {state.categories
            .filter((category) => category.archived)
            .map((category) => (
              <div key={category.id} className="cat-edit-row">
                <span className="dot" style={{ background: category.color }} />
                <span className="removed-name">{category.name}</span>
                <button type="button" className="text-btn" onClick={() => restoreCategory(category.id)}>
                  Restore
                </button>
              </div>
            ))}
        </div>
      )}
      {!editing && (
        <form
          className="new-cat"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <input
            aria-label="New category"
            placeholder="New category"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="swatches">
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={swatch === color ? 'swatch is-on' : 'swatch'}
                style={{ background: swatch }}
                aria-label={`Color ${swatch}`}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>
          <button type="submit" className="btn-gold" disabled={!name.trim()}>
            Add category
          </button>
        </form>
      )}
    </Sheet>
  );
}
