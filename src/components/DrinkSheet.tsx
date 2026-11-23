import { useState } from 'react';
import { DRINK_PRESETS } from '../lib/caffeine';
import { fromDatetimeLocal, toDatetimeLocal } from '../lib/format';
import { MAX_DRINK_MG } from '../lib/storage';
import { useStore } from '../store';
import type { Drink } from '../types';
import { Sheet } from './Sheet';

/** Add a drink with a custom amount or time, or edit/delete a logged one. */
export function DrinkSheet({ drink, onClose }: { drink: Drink | null; onClose: () => void }) {
  const { now, addDrink, updateDrink, deleteDrink } = useStore();
  const [name, setName] = useState(drink?.name ?? 'Coffee');
  const [amount, setAmount] = useState(String(drink?.mg ?? 95));
  const [when, setWhen] = useState(toDatetimeLocal(drink?.at ?? Math.floor(now / 60000) * 60000));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const mg = Number(amount);
    const at = fromDatetimeLocal(when);
    if (!name.trim()) return setError('Give the drink a name.');
    if (!Number.isFinite(mg) || mg <= 0 || mg > MAX_DRINK_MG) return setError(`Enter an amount from 1 to ${MAX_DRINK_MG} mg.`);
    if (!Number.isFinite(at)) return setError('Choose when you had it.');
    if (at > Date.now() + 60_000) return setError('That’s in the future. Choose a time that has already passed.');
    const ok = drink ? updateDrink(drink.id, { name, mg, at }) : addDrink({ name, mg, at });
    if (!ok) return setError('Could not save on this device. Try again.');
    onClose();
  };

  return (
    <Sheet title={drink ? 'Edit drink' : 'Add a drink'} onClose={onClose}>
      {!drink && (
        <div className="chips" aria-label="Start from a common drink">
          {DRINK_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={preset.name === name ? 'chip is-on' : 'chip'}
              onClick={() => {
                setName(preset.name);
                setAmount(String(preset.mg));
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Drink</span>
        <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Caffeine (mg)</span>
        <input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, '').slice(0, 4))} />
      </label>
      <p className="quiet drink-hint">Check the label if you can. Sizes and brands vary a lot.</p>
      <label className="field">
        <span>When</span>
        <input type="datetime-local" step={60} value={when} onChange={(event) => setWhen(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-gold" onClick={save}>
        Save
      </button>
      {drink && !confirming && (
        <button type="button" className="text-btn danger delete-link" onClick={() => setConfirming(true)}>
          Delete drink
        </button>
      )}
      {drink && confirming && (
        <div className="confirm">
          <p>Delete this drink?</p>
          <button
            type="button"
            className="text-btn danger"
            onClick={() => {
              deleteDrink(drink.id);
              onClose();
            }}
          >
            Delete
          </button>
          <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </div>
      )}
    </Sheet>
  );
}
