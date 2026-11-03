import { useCallback, useEffect, useState, type FormEvent } from 'react'
import SiteHeader from '../components/SiteHeader'
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type AddressInput,
  type CustomerAddress,
} from '../lib/api'
import './AddressBookPage.css'

function addressId(address: CustomerAddress) {
  return address.id || address._id || ''
}

function AddressForm({
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: CustomerAddress | null
  busy: boolean
  onCancel: () => void
  onSubmit: (input: AddressInput) => Promise<void>
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSubmit({
      label: String(form.get('label') || ''),
      recipientName: String(form.get('recipientName') || ''),
      phone: String(form.get('phone') || ''),
      addressLine1: String(form.get('addressLine1') || ''),
      addressLine2: String(form.get('addressLine2') || ''),
      city: String(form.get('city') || ''),
      region: String(form.get('region') || ''),
      postalCode: String(form.get('postalCode') || ''),
      countryCode: String(form.get('countryCode') || ''),
      isDefaultShipping: form.get('isDefaultShipping') === 'on',
      isDefaultBilling: form.get('isDefaultBilling') === 'on',
    })
  }

  return (
    <form
      className="address-form"
      key={initial ? addressId(initial) : 'new'}
      onSubmit={handleSubmit}
    >
      <label>
        <span>Address label</span>
        <input
          autoComplete="off"
          defaultValue={initial?.label || 'Home'}
          maxLength={60}
          name="label"
          required
        />
      </label>
      <label>
        <span>Recipient name</span>
        <input
          autoComplete="name"
          defaultValue={initial?.recipientName}
          maxLength={100}
          name="recipientName"
          required
        />
      </label>
      <label>
        <span>
          Phone <small>(optional)</small>
        </span>
        <input
          autoComplete="tel"
          defaultValue={initial?.phone}
          maxLength={40}
          name="phone"
        />
      </label>
      <label>
        <span>Address line 1</span>
        <input
          autoComplete="address-line1"
          defaultValue={initial?.addressLine1}
          maxLength={160}
          name="addressLine1"
          required
        />
      </label>
      <label>
        <span>
          Address line 2 <small>(optional)</small>
        </span>
        <input
          autoComplete="address-line2"
          defaultValue={initial?.addressLine2}
          maxLength={160}
          name="addressLine2"
        />
      </label>
      <div className="address-form-row">
        <label>
          <span>City</span>
          <input
            autoComplete="address-level2"
            defaultValue={initial?.city}
            maxLength={100}
            name="city"
            required
          />
        </label>
        <label>
          <span>State / region</span>
          <input
            autoComplete="address-level1"
            defaultValue={initial?.region}
            maxLength={100}
            name="region"
            required
          />
        </label>
      </div>
      <div className="address-form-row">
        <label>
          <span>Postal code</span>
          <input
            autoComplete="postal-code"
            defaultValue={initial?.postalCode}
            maxLength={20}
            name="postalCode"
            required
          />
        </label>
        <label>
          <span>
            Country code <small>(2 letters)</small>
          </span>
          <input
            autoComplete="off"
            defaultValue={initial?.countryCode}
            maxLength={2}
            minLength={2}
            name="countryCode"
            pattern="[A-Za-z]{2}"
            placeholder="US"
            required
          />
        </label>
      </div>
      <div className="address-defaults">
        <label>
          <input
            defaultChecked={initial?.isDefaultShipping}
            name="isDefaultShipping"
            type="checkbox"
          />{' '}
          Default shipping address
        </label>
        <label>
          <input
            defaultChecked={initial?.isDefaultBilling}
            name="isDefaultBilling"
            type="checkbox"
          />{' '}
          Default billing address
        </label>
      </div>
      <div className="address-form-actions">
        <button className="button" disabled={busy} type="submit">
          {busy ? 'Saving…' : initial ? 'Save address' : 'Add address'}
        </button>
        {initial && (
          <button
            className="address-cancel"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function AddressBookPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [editing, setEditing] = useState<CustomerAddress | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    try {
      setAddresses(await getAddresses())
      setError('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Saved addresses could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getAddresses()
      .then((savedAddresses) => {
        if (active) setAddresses(savedAddresses)
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Saved addresses could not be loaded.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function save(input: AddressInput) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (editing) await updateAddress(addressId(editing), input)
      else await createAddress(input)
      setEditing(null)
      setShowForm(false)
      setNotice(editing ? 'Address updated.' : 'Address added.')
      await refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The address could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function remove(address: CustomerAddress) {
    if (!window.confirm(`Delete the ${address.label} address?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await deleteAddress(addressId(address))
      setNotice('Address deleted.')
      if (editing && addressId(editing) === addressId(address)) {
        setEditing(null)
        setShowForm(false)
      }
      await refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The address could not be deleted.',
      )
    } finally {
      setBusy(false)
    }
  }

  function edit(address: CustomerAddress) {
    setEditing(address)
    setShowForm(true)
    setNotice('')
  }

  return (
    <main className="address-book-page">
      <SiteHeader className="site-header catalog-header" />
      <section
        className="address-book-content"
        aria-labelledby="address-book-title"
      >
        <a className="address-back" href="/checkout">
          Back to checkout
        </a>
        <p className="eyebrow">Your account</p>
        <div className="address-heading-row">
          <div>
            <h1 id="address-book-title">Saved addresses</h1>
            <p className="address-intro">
              Manage the places you ship to and use for billing.
            </p>
          </div>
          {!showForm && (
            <button
              className="button"
              onClick={() => {
                setEditing(null)
                setShowForm(true)
                setNotice('')
              }}
              type="button"
            >
              Add an address
            </button>
          )}
        </div>

        {error && (
          <p className="address-alert" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="address-notice" role="status">
            {notice}
          </p>
        )}
        {loading && (
          <p className="address-message" role="status">
            Loading your addresses…
          </p>
        )}

        {showForm && (
          <section
            className="address-editor"
            aria-label={editing ? 'Edit address' : 'Add address'}
          >
            <h2>{editing ? 'Edit address' : 'New address'}</h2>
            <AddressForm
              busy={busy}
              initial={editing}
              onCancel={() => {
                setEditing(null)
                setShowForm(false)
              }}
              onSubmit={save}
            />
          </section>
        )}

        {!loading && addresses.length === 0 && !showForm && (
          <div className="address-empty">
            <p>You haven’t saved an address yet.</p>
            <button
              className="address-text-button"
              onClick={() => setShowForm(true)}
              type="button"
            >
              Add your first address
            </button>
          </div>
        )}

        <div className="address-list">
          {addresses.map((address) => (
            <article className="address-card" key={addressId(address)}>
              <div>
                <div className="address-card-heading">
                  <h2>{address.label}</h2>
                  {address.isDefaultShipping && (
                    <span className="address-badge">Default shipping</span>
                  )}
                  {address.isDefaultBilling && (
                    <span className="address-badge">Default billing</span>
                  )}
                </div>
                <p>{address.recipientName}</p>
                <p>
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                </p>
                <p>
                  {address.city}, {address.region} {address.postalCode}
                </p>
                <p>
                  {address.countryCode}
                  {address.phone ? ` · ${address.phone}` : ''}
                </p>
              </div>
              <div className="address-card-actions">
                <button
                  className="address-text-button"
                  disabled={busy}
                  onClick={() => edit(address)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="address-text-button address-delete"
                  disabled={busy}
                  onClick={() => void remove(address)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default AddressBookPage
