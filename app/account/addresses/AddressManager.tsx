"use client";

import { useState } from "react";

type Address = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  state: string;
  pin: string;
  isDefault: boolean;
};

export default function AddressManager({
  initialAddresses,
}: {
  initialAddresses: Address[];
}) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(initialAddresses.length === 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pin, setPin] = useState("");

  function resetForm() {
    setLabel("");
    setAddress("");
    setCity("");
    setState("");
    setPin("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address.trim() || !city.trim() || !state.trim() || !/^\d{6}$/.test(pin)) {
      setError("Please fill in all fields with a valid 6-digit PIN code.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || undefined, address, city, state, pin }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save address.");
      return;
    }

    setAddresses((prev) => [
      data.address,
      ...prev.map((a) => ({ ...a, isDefault: data.address.isDefault ? false : a.isDefault })),
    ]);
    resetForm();
    setShowForm(false);
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/account/addresses/${id}`, { method: "PATCH" });
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="address-manager">
      {addresses.length === 0 && !showForm && (
        <p className="account-empty">You haven&apos;t saved any addresses yet.</p>
      )}

      <div className="address-list">
        {addresses.map((a) => (
          <div className="address-card" key={a.id}>
            {a.isDefault && <span className="address-default-badge">Default</span>}
            {a.label && <strong className="address-label">{a.label}</strong>}
            <p>
              {a.address}
              <br />
              {a.city}, {a.state} - {a.pin}
            </p>
            <div className="address-actions">
              {!a.isDefault && (
                <button type="button" onClick={() => handleSetDefault(a.id)}>
                  Set as Default
                </button>
              )}
              <button type="button" className="address-delete" onClick={() => handleDelete(a.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <form className="form auth-form" onSubmit={handleAdd}>
          {error && <p className="form-error">{error}</p>}

          <label>
            Label (optional)
            <input
              placeholder="Home, Office..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          <label>
            Address
            <textarea
              rows={3}
              placeholder="House / Flat / Street / Area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label>
            State
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>

          <label>
            PIN Code
            <input
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </label>

          <div className="address-form-actions">
            <button className="button dark" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Address"}
            </button>

            {addresses.length > 0 && (
              <button type="button" className="text-link" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" className="primary-btn dark-btn" onClick={() => setShowForm(true)}>
          Add New Address <span>→</span>
        </button>
      )}
    </div>
  );
}
