"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "../../components/CartProvider";
import CheckoutSteps from "../../components/CheckoutSteps";
import type { CartLine } from "../../lib/cart";
import { INDIAN_STATES } from "../../lib/indian-states";
import { orderSuccessPath, rememberDeviceOrder } from "../../lib/order-links";
import { useRazorpayPayment } from "../../components/useRazorpayPayment";

type SavedAddress = {
    id: string;
    label: string | null;
    address: string;
    city: string;
    state: string;
    pin: string;
};

type Quote = {
    items: CartLine[];
    subtotal: number;
    discount: number;
    delivery: number;
    total: number;
    coupon: { code: string; description: string | null } | null;
    onlinePaymentAvailable: boolean;
};

type PaymentMethod = "ONLINE" | "COD";

type ApiError = { error: string; code?: string };

type CheckoutFormProps = {
    /** Null for guest checkout. */
    contact: { name: string; phone: string; email: string } | null;
    addresses: SavedAddress[];
    /** e.g. "Tue, 14 Oct – Sat, 18 Oct" for an order placed now. */
    deliveryEstimate: string;
};

type PlacedOrder = { orderId: string; accessToken?: string };

type PinLookup =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "found"; city: string; state: string }
    | { status: "missing"; message: string };

const NEW_ADDRESS = "new";

// One key per visit to this page: lets the server spot a resubmitted guest order.
function newCheckoutKey() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// ₹1,804.50 rather than ₹1,804.5 when there are paise.
const rupees = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;

async function postJson<T>(url: string, body: unknown) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const data = await response.json().catch(() => ({ error: "Something went wrong." }));
    return response.ok
        ? ({ ok: true, data: data as T } as const)
        : ({ ok: false, error: data as ApiError } as const);
}

export default function CheckoutForm({ contact, addresses, deliveryEstimate }: CheckoutFormProps) {
    const router = useRouter();
    const {
        items: cartItems,
        loading: cartLoading,
        refresh: refreshCart,
        clearCart,
        delivery: deliveryRules,
    } = useCart();
    const { pay } = useRazorpayPayment();
    const isGuest = contact === null;
    const [checkoutKey] = useState(newCheckoutKey);

    // Customer information
    const [name, setName] = useState(contact?.name ?? "");
    const [phone, setPhone] = useState(contact?.phone ?? "");
    const [email, setEmail] = useState(contact?.email ?? "");

    // Delivery information
    const defaultAddress = addresses[0];
    const [addressChoice, setAddressChoice] = useState(defaultAddress?.id ?? NEW_ADDRESS);
    const [address, setAddress] = useState(defaultAddress?.address ?? "");
    const [city, setCity] = useState(defaultAddress?.city ?? "");
    const [state, setState] = useState(defaultAddress?.state ?? "");
    const [pin, setPin] = useState(defaultAddress?.pin ?? "");
    const [saveAddress, setSaveAddress] = useState(addresses.length === 0);

    // City and state filled in from the PIN code; typing over them wins.
    const [pinLookup, setPinLookup] = useState<PinLookup>({ status: "idle" });
    const autoFilled = useRef({ city: "", state: "" });

    // Coupon
    const [couponInput, setCouponInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
    const [couponError, setCouponError] = useState<string | null>(null);
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    // Server-computed totals
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteError, setQuoteError] = useState<ApiError | null>(null);

    const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [placing, setPlacing] = useState(false);
    // Set once the order exists, so emptying the cart doesn't flash "empty cart".
    const [placed, setPlaced] = useState(false);

    // Re-quote whenever the cart contents change (e.g. edited in another tab).
    const cartKey = cartItems.map((item) => `${item.slug}:${item.quantity}`).join(",");

    // Guests' carts live in the browser, so send them along; signed-in
    // customers' carts are read on the server.
    const guestItems = useCallback(
        () => (isGuest ? cartItems.map(({ slug, quantity }) => ({ slug, quantity })) : undefined),
        // cartKey captures every change that matters here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isGuest, cartKey]
    );

    const loadQuote = useCallback(async (couponCode?: string) => {
        const result = await postJson<Quote>("/api/checkout/quote", { couponCode, items: guestItems() });
        if (result.ok) {
            setQuote(result.data);
            setQuoteError(null);
        } else if (result.error.code !== "COUPON") {
            setQuote(null);
            setQuoteError(result.error);
        }
        return result;
    }, [guestItems]);

    useEffect(() => {
        if (cartLoading || placed) return;
        loadQuote(appliedCoupon).then((result) => {
            // A previously applied coupon can stop qualifying if the cart shrinks.
            if (!result.ok && result.error.code === "COUPON") {
                setAppliedCoupon(undefined);
                setCouponError(result.error.error);
                loadQuote(undefined);
            }
        });
    }, [cartKey, cartLoading, appliedCoupon, loadQuote, placed]);

    // Look up city and state once a full PIN code is entered.
    useEffect(() => {
        if (addressChoice !== NEW_ADDRESS || !/^[1-9]\d{5}$/.test(pin)) {
            setPinLookup({ status: "idle" });
            return;
        }

        let cancelled = false;
        setPinLookup({ status: "loading" });
        fetch(`/api/pincode/${pin}`)
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (cancelled) return;
                if (!response.ok) {
                    setPinLookup({
                        status: "missing",
                        message: data.error ?? "Please fill in your city and state.",
                    });
                    return;
                }
                setPinLookup({ status: "found", city: data.city, state: data.state });
                // Only replace what is empty or was filled in from an earlier PIN.
                setCity((current) =>
                    !current.trim() || current === autoFilled.current.city ? data.city : current
                );
                setState((current) =>
                    !current || current === autoFilled.current.state ? data.state : current
                );
                autoFilled.current = { city: data.city, state: data.state };
            })
            .catch(() => {
                if (!cancelled) setPinLookup({ status: "idle" });
            });

        return () => {
            cancelled = true;
        };
    }, [pin, addressChoice]);

    function chooseAddress(id: string) {
        setAddressChoice(id);
        const saved = addresses.find((entry) => entry.id === id);
        if (saved) {
            setAddress(saved.address);
            setCity(saved.city);
            setState(saved.state);
            setPin(saved.pin);
            setSaveAddress(false);
        } else {
            setAddress("");
            setCity("");
            setState("");
            setPin("");
            setSaveAddress(true);
        }
    }

    async function applyCoupon() {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;

        setApplyingCoupon(true);
        setCouponError(null);
        const result = await postJson<Quote>("/api/checkout/quote", { couponCode: code, items: guestItems() });
        setApplyingCoupon(false);

        if (result.ok) {
            setAppliedCoupon(code);
            setQuote(result.data);
            setCouponInput("");
        } else {
            setCouponError(result.error.error);
        }
    }

    function removeCoupon() {
        setAppliedCoupon(undefined);
        setCouponError(null);
    }

    function validate() {
        if (name.trim().length < 2) return "Please enter your full name.";
        if (!/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, "").replace(/^(\+91|0)/, "")))
            return "Please enter a valid 10-digit mobile number.";
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email address.";
        if (address.trim().length < 5) return "Please enter your delivery address.";
        if (city.trim().length < 2) return "Please enter your city.";
        if (!state) return "Please select your state.";
        if (!/^\d{6}$/.test(pin)) return "Please enter a valid 6-digit PIN code.";
        return null;
    }

    const paymentMethod: PaymentMethod =
        paymentChoice ?? (quote?.onlinePaymentAvailable ? "ONLINE" : "COD");

    async function handlePlaceOrder(event: React.FormEvent) {
        event.preventDefault();
        if (!quote || placing) return;

        const problem = validate();
        if (problem) {
            setFormError(problem);
            return;
        }

        setPlacing(true);
        setFormError(null);

        const result = await postJson<PlacedOrder>("/api/checkout", {
            shipping: { name, phone, email, address, city, state, pin },
            couponCode: appliedCoupon,
            expectedTotal: quote.total,
            saveAddress: !isGuest && addressChoice === NEW_ADDRESS && saveAddress,
            paymentMethod,
            items: guestItems(),
            checkoutKey: isGuest ? checkoutKey : undefined,
        });

        if (result.ok) {
            const { orderId, accessToken } = result.data;
            // Guests have no account: keep the order's link on this device.
            if (accessToken) rememberDeviceOrder(orderId, accessToken);

            // The server already emptied a signed-in customer's cart; a guest's
            // lives in this browser. Either way, only sync it once we're
            // leaving this page (after the payment window, for online orders).
            const syncCart = () => {
                setPlaced(true);
                return accessToken ? clearCart() : refreshCart();
            };

            if (paymentMethod === "COD") {
                await syncCart();
                router.push(orderSuccessPath(orderId, accessToken));
                return;
            }

            // The order now exists with stock reserved; collect payment.
            const outcome = await pay(orderId, accessToken);
            await syncCart();

            if (outcome.status === "paid") {
                router.push(orderSuccessPath(orderId, accessToken));
            } else {
                router.push(orderSuccessPath(orderId, accessToken, outcome.status === "error" ? "failed" : "pending"));
            }
            return;
        }

        setPlacing(false);
        setFormError(result.error.error);

        // Totals or stock moved underneath us: pull fresh numbers so the
        // customer sees exactly what they would be charged.
        if (result.error.code === "COUPON") {
            setAppliedCoupon(undefined);
        } else if (result.error.code && result.error.code !== "EMPTY_CART") {
            await refreshCart();
            await loadQuote(appliedCoupon);
        }
    }

    if (placed) {
        return (
            <main className="checkout-page">
                <div className="checkout-container checkout-empty">
                    <p className="section-label">CHECKOUT</p>
                    <p>Opening your order…</p>
                </div>
            </main>
        );
    }

    if (cartLoading || (!quote && !quoteError)) {
        return (
            <main className="checkout-page">
                <div className="checkout-container checkout-empty">
                    <p className="section-label">CHECKOUT</p>
                    <p>Loading your order…</p>
                </div>
            </main>
        );
    }

    if (quoteError?.code === "EMPTY_CART" || (!quote && cartItems.length === 0)) {
        return (
            <main className="checkout-page">
                <div className="checkout-container checkout-empty">
                    <p className="section-label">CHECKOUT</p>

                    <h1>
                        Your cart is
                        <br />
                        <em>empty.</em>
                    </h1>

                    <p>
                        Add some products before proceeding to checkout.
                    </p>

                    <Link href="/products" className="primary-btn">
                        Continue Shopping →
                    </Link>
                </div>
            </main>
        );
    }

    if (!quote) {
        return (
            <main className="checkout-page">
                <div className="checkout-container checkout-empty">
                    <p className="section-label">CHECKOUT</p>

                    <h1>
                        Please review
                        <br />
                        <em>your cart.</em>
                    </h1>

                    <p>{quoteError?.error}</p>

                    <Link href="/cart" className="primary-btn">
                        Back to Cart →
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="checkout-page">
            <div className="checkout-container">

                {/* HEADER */}

                <div className="checkout-header">
                    <Link href="/cart" className="back-link">
                        ← Back to Cart
                    </Link>

                    <p className="section-label">CHECKOUT</p>

                    <h1>
                        Complete your
                        <br />
                        <em>order.</em>
                    </h1>
                </div>

                <CheckoutSteps current="Address" />

                <div className="checkout-layout">

                    {/* FORM */}

                    <form className="checkout-form" onSubmit={handlePlaceOrder} noValidate>

                        {isGuest && (
                            <div className="guest-banner">
                                <p>
                                    <strong>Checking out as a guest.</strong> No account needed: we&apos;ll
                                    email your order link so you can track it.
                                </p>
                                <Link href="/login?callbackUrl=/checkout">Log in instead</Link>
                            </div>
                        )}

                        {/* CONTACT INFORMATION */}

                        <section className="checkout-section">
                            <div className="checkout-section-title">
                                <span>01</span>
                                <h2>Contact Information</h2>
                            </div>

                            <div className="form-grid">

                                <div className="form-field full">
                                    <label htmlFor="co-name">FULL NAME *</label>
                                    <input
                                        id="co-name"
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="co-phone">PHONE NUMBER *</label>
                                    <input
                                        id="co-phone"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="co-email">EMAIL ADDRESS *</label>
                                    <input
                                        id="co-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                            </div>
                        </section>

                        {/* DELIVERY ADDRESS */}

                        <section className="checkout-section">

                            <div className="checkout-section-title">
                                <span>02</span>
                                <h2>Delivery Address</h2>
                            </div>

                            {addresses.length > 0 && (
                                <div className="saved-address-list">
                                    {addresses.map((entry) => (
                                        <label
                                            key={entry.id}
                                            className={`saved-address${addressChoice === entry.id ? " active" : ""}`}
                                        >
                                            <input
                                                type="radio"
                                                name="address-choice"
                                                checked={addressChoice === entry.id}
                                                onChange={() => chooseAddress(entry.id)}
                                            />
                                            <span>
                                                {entry.label && <strong>{entry.label}</strong>}
                                                {entry.address}, {entry.city}, {entry.state} – {entry.pin}
                                            </span>
                                        </label>
                                    ))}

                                    <label
                                        className={`saved-address${addressChoice === NEW_ADDRESS ? " active" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="address-choice"
                                            checked={addressChoice === NEW_ADDRESS}
                                            onChange={() => chooseAddress(NEW_ADDRESS)}
                                        />
                                        <span>Deliver to a new address</span>
                                    </label>
                                </div>
                            )}

                            {addressChoice === NEW_ADDRESS && (
                                <>
                                    <div className="form-grid">

                                        <div className="form-field full">
                                            <label htmlFor="co-address">ADDRESS *</label>
                                            <textarea
                                                id="co-address"
                                                rows={3}
                                                autoComplete="street-address"
                                                placeholder="House / Flat / Street / Area"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="co-pin">PIN CODE *</label>
                                            <input
                                                id="co-pin"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="postal-code"
                                                maxLength={6}
                                                placeholder="201301"
                                                aria-describedby="co-pin-hint"
                                                value={pin}
                                                onChange={(e) =>
                                                    setPin(e.target.value.replace(/\D/g, ""))
                                                }
                                            />
                                            <p
                                                id="co-pin-hint"
                                                className={`pin-hint${pinLookup.status === "found" ? " found" : ""}`}
                                                aria-live="polite"
                                            >
                                                {pinLookup.status === "loading"
                                                    ? "Finding your city…"
                                                    : pinLookup.status === "found"
                                                      ? `Delivering to ${pinLookup.city}, ${pinLookup.state}`
                                                      : pinLookup.status === "missing"
                                                        ? pinLookup.message
                                                        : "City and state fill in from your PIN code."}
                                            </p>
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="co-city">CITY *</label>
                                            <input
                                                id="co-city"
                                                type="text"
                                                autoComplete="address-level2"
                                                placeholder="City"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="co-state">STATE *</label>
                                            <select
                                                id="co-state"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                            >
                                                <option value="" disabled>
                                                    Select State
                                                </option>
                                                {INDIAN_STATES.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                    </div>

                                    {!isGuest && (
                                        <label className="checkbox-field">
                                            <input
                                                type="checkbox"
                                                checked={saveAddress}
                                                onChange={(e) => setSaveAddress(e.target.checked)}
                                            />
                                            <span>Save this address to my account</span>
                                        </label>
                                    )}
                                </>
                            )}

                            <div className="gst-box">
                                <strong>Business purchase?</strong>
                                <p>
                                    Need a GST invoice? GST details can be
                                    added during the order-processing step.
                                </p>
                            </div>

                        </section>

                        {/* COUPON */}

                        <section className="checkout-section">

                            <div className="checkout-section-title">
                                <span>03</span>
                                <h2>Coupon Code</h2>
                            </div>

                            {quote.coupon ? (
                                <div className="coupon-applied">
                                    <div>
                                        <strong>{quote.coupon.code}</strong>
                                        <p>
                                            {quote.coupon.description ?? "Coupon applied"} — you save{" "}
                                            {rupees(quote.discount)}
                                        </p>
                                    </div>
                                    <button type="button" onClick={removeCoupon}>
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="coupon-row">
                                    <input
                                        type="text"
                                        aria-label="Coupon code"
                                        placeholder="Enter coupon code"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                applyCoupon();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={applyCoupon}
                                        disabled={applyingCoupon || !couponInput.trim()}
                                    >
                                        {applyingCoupon ? "Applying…" : "Apply"}
                                    </button>
                                </div>
                            )}

                            {couponError && (
                                <p className="coupon-error" role="alert">
                                    {couponError}
                                </p>
                            )}

                        </section>

                        {/* PAYMENT */}

                        <section className="checkout-section">

                            <div className="checkout-section-title">
                                <span>04</span>
                                <h2>Payment Method</h2>
                            </div>

                            <div className="payment-options" role="radiogroup" aria-label="Payment method">
                                <label
                                    className={`payment-option${paymentMethod === "ONLINE" ? " active" : ""}${quote.onlinePaymentAvailable ? "" : " disabled"}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="ONLINE"
                                        checked={paymentMethod === "ONLINE"}
                                        disabled={!quote.onlinePaymentAvailable}
                                        onChange={() => setPaymentChoice("ONLINE")}
                                    />
                                    <div className="payment-radio">
                                        <span />
                                    </div>
                                    <div>
                                        <strong>Pay Online</strong>
                                        <p>
                                            {quote.onlinePaymentAvailable
                                                ? "Secure payment by Razorpay"
                                                : "Temporarily unavailable"}
                                        </p>
                                        {quote.onlinePaymentAvailable && (
                                            <div className="payment-badges" aria-label="Accepted methods">
                                                <span>UPI</span>
                                                <span>CARDS</span>
                                                <span>NET BANKING</span>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                <label className={`payment-option${paymentMethod === "COD" ? " active" : ""}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="COD"
                                        checked={paymentMethod === "COD"}
                                        onChange={() => setPaymentChoice("COD")}
                                    />
                                    <div className="payment-radio">
                                        <span />
                                    </div>
                                    <div>
                                        <strong>Cash on Delivery</strong>
                                        <p>Pay in cash or UPI when your order arrives</p>
                                    </div>
                                </label>
                            </div>

                            <div className="payment-note">
                                {paymentMethod === "ONLINE"
                                    ? "You'll complete payment securely with Razorpay in the next step. Your items are reserved for 30 minutes while you pay."
                                    : `Please keep ${rupees(quote.total)} ready when your order is delivered.`}
                            </div>

                        </section>

                        {formError && (
                            <p className="form-error" role="alert">
                                {formError}
                            </p>
                        )}

                        {/* PLACE ORDER */}

                        <button
                            type="submit"
                            className="place-order-btn"
                            disabled={placing}
                        >
                            {placing
                                ? "Processing…"
                                : paymentMethod === "COD"
                                  ? `Place Order · ${rupees(quote.total)} →`
                                  : `Pay ${rupees(quote.total)} →`}
                        </button>

                    </form>

                    {/* ORDER SUMMARY */}

                    <aside className="checkout-summary">

                        <p className="section-label">YOUR ORDER</p>

                        <div className="checkout-products">
                            {quote.items.map((item) => (
                                <div className="checkout-product" key={item.slug}>
                                    <img src={item.image} alt={item.name} />
                                    <div>
                                        <h3>{item.name}</h3>
                                        <p>Qty: {item.quantity}</p>
                                        <strong>{rupees(item.price * item.quantity)}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="summary-line" />

                        <div className="summary-row">
                            <span>Subtotal</span>
                            <strong>{rupees(quote.subtotal)}</strong>
                        </div>

                        {quote.discount > 0 && (
                            <div className="summary-row discount">
                                <span>Discount ({quote.coupon?.code})</span>
                                <strong>−{rupees(quote.discount)}</strong>
                            </div>
                        )}

                        <div className="summary-row">
                            <span>Delivery</span>
                            <strong>{quote.delivery === 0 ? "FREE" : rupees(quote.delivery)}</strong>
                        </div>

                        {quote.delivery > 0 && quote.subtotal < deliveryRules.freeDeliveryThreshold && (
                            <p className="free-delivery-hint">
                                Add {rupees(deliveryRules.freeDeliveryThreshold - quote.subtotal)} more for free
                                delivery.
                            </p>
                        )}

                        <div className="summary-line" />

                        <div className="summary-total">
                            <span>Total</span>
                            <strong>{rupees(quote.total)}</strong>
                        </div>

                        <div className="delivery-estimate">
                            <div>
                                <strong>Expected delivery: {deliveryEstimate}</strong>
                                <span>Estimated from when your order is confirmed; we&apos;ll email tracking once it ships.</span>
                            </div>
                        </div>

                        <div className="secure-checkout">
                            🔒 Prices verified on our server
                        </div>

                    </aside>

                </div>
            </div>
        </main>
    );
}
