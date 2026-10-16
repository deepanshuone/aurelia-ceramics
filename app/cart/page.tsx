"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "../../components/CartProvider";
import CartSuggestions from "../../components/CartSuggestions";
import CheckoutSteps from "../../components/CheckoutSteps";
import { POLICY } from "../../lib/business";
import { CartLine, type DeliveryRules, getCartTotals } from "../../lib/cart";
import { formatRupees } from "../../lib/order-display";
import { savingsPerUnit } from "../../lib/pricing";

const MAX_LINE_QUANTITY = 99;

/** Delivery and policy facts a shopper wants before buying (shown with an empty or filled cart). */
function ShoppingInfo({ delivery }: { delivery: DeliveryRules }) {
    return (
        <ul className="cart-info-strip">
            <li>
                <strong>Free delivery</strong>
                <span>
                    {delivery.deliveryFee > 0
                        ? `on ₹${delivery.freeDeliveryThreshold.toLocaleString("en-IN")}+ · else ₹${delivery.deliveryFee}`
                        : "on every order"}
                </span>
            </li>
            <li>
                <strong>Ships in {POLICY.dispatchDays}</strong>
                <span>arrives in {POLICY.deliveryDays}</span>
            </li>
            <li>
                <strong>Cash on Delivery</strong>
                <span>or pay securely online</span>
            </li>
            <li>
                <strong>{POLICY.returnHours} hr return or replacement</strong>
                <span>free replacement if damaged</span>
            </li>
        </ul>
    );
}

export default function CartPage() {
    const {
        items: cart,
        loading,
        notices,
        dismissNotices,
        updateQuantity,
        removeItem,
        delivery: deliveryRules,
    } = useCart();

    const { status } = useSession();
    const [busySlug, setBusySlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function run(item: CartLine, action: () => ReturnType<typeof removeItem>) {
        setBusySlug(item.slug);
        setError(null);
        const result = await action();
        setBusySlug(null);
        if (!result.ok) setError(result.error);
    }

    function increase(item: CartLine) {
        run(item, () => updateQuantity(item.slug, item.quantity + 1));
    }

    function decrease(item: CartLine) {
        run(item, () => updateQuantity(item.slug, item.quantity - 1));
    }

    function remove(item: CartLine) {
        run(item, () => removeItem(item.slug));
    }

    const { subtotal, delivery, gst, total } = getCartTotals(cart, deliveryRules);
    const mrpSavings = cart
        .filter((item) => item.available)
        .reduce((sum, item) => sum + Math.round(savingsPerUnit(item) * item.quantity * 100), 0) / 100;
    const amountToFreeDelivery =
        deliveryRules.deliveryFee > 0 ? Math.max(0, deliveryRules.freeDeliveryThreshold - subtotal) : 0;
    const freeDeliveryProgress =
        amountToFreeDelivery > 0 ? Math.min(100, Math.round((subtotal / deliveryRules.freeDeliveryThreshold) * 100)) : 100;
    const hasUnavailable = cart.some((item) => !item.available);

    if (loading && cart.length === 0) {
        return (
            <main className="cart-page">
                <div className="cart-container empty-cart">
                    <p className="section-label">YOUR CART</p>
                    <p>Loading your cart…</p>
                </div>
            </main>
        );
    }

    if (cart.length === 0) {
        return (
            <main className="cart-page">
                <div className="cart-container empty-cart">
                    <p className="section-label">YOUR CART</p>

                    <h1>
                        Your cart is
                        <br />
                        <em>empty.</em>
                    </h1>

                    <p>
                        Discover our ceramic collections and find something
                        perfect for your table.
                    </p>

                    <Link href="/products" className="primary-btn">
                        Continue Shopping →
                    </Link>
                </div>

                <div className="cart-container">
                    <ShoppingInfo delivery={deliveryRules} />
                    <CartSuggestions
                        excludeSlugs={[]}
                        needForFreeDelivery={0}
                        label="POPULAR RIGHT NOW"
                        heading="Pieces our customers love"
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="cart-page">
            <div className="cart-container">
                <div className="cart-heading">
                    <p className="section-label">SHOPPING CART</p>

                    <h1>
                        Your
                        <br />
                        <em>selection.</em>
                    </h1>
                </div>

                <CheckoutSteps current="Cart" />

                <ShoppingInfo delivery={deliveryRules} />

                {notices.length > 0 && (
                    <div className="cart-notice" role="status">
                        <ul>
                            {notices.map((notice) => (
                                <li key={notice}>{notice}</li>
                            ))}
                        </ul>
                        <button type="button" onClick={dismissNotices} aria-label="Dismiss">
                            ×
                        </button>
                    </div>
                )}

                {error && (
                    <p className="form-error cart-error" role="alert">
                        {error}
                    </p>
                )}

                <div className="cart-layout">
                    {/* CART ITEMS */}

                    <div className="cart-items">
                        {cart.map((item) => {
                            const busy = busySlug === item.slug;
                            const atMax =
                                item.quantity >= Math.min(item.stock, MAX_LINE_QUANTITY);

                            return (
                                <div
                                    className={`cart-item${item.available ? "" : " unavailable"}`}
                                    key={item.slug}
                                >
                                    <Link href={`/products/${item.slug}`}>
                                        <img src={item.image} alt={item.name} />
                                    </Link>

                                    <div className="cart-item-info">
                                        <p>PRODUCT</p>

                                        <h2>
                                            <Link href={`/products/${item.slug}`}>{item.name}</Link>
                                        </h2>

                                        <strong>
                                            ₹{item.price.toLocaleString("en-IN")}
                                        </strong>

                                        {item.mrp && item.mrp > item.price && (
                                            <del className="cart-item-mrp">
                                                ₹{item.mrp.toLocaleString("en-IN")}
                                            </del>
                                        )}

                                        {!item.available ? (
                                            <span className="cart-stock-note out">
                                                Out of stock — remove to continue
                                            </span>
                                        ) : item.stock <= 5 ? (
                                            <span className="cart-stock-note">
                                                Only {item.stock} left
                                            </span>
                                        ) : null}

                                        <div className="cart-item-bottom">
                                            {item.available && (
                                                <div className="cart-quantity">
                                                    <button
                                                        type="button"
                                                        onClick={() => decrease(item)}
                                                        disabled={busy}
                                                        aria-label={`Decrease ${item.name} quantity`}
                                                    >
                                                        −
                                                    </button>

                                                    <span>{item.quantity}</span>

                                                    <button
                                                        type="button"
                                                        onClick={() => increase(item)}
                                                        disabled={busy || atMax}
                                                        aria-label={`Increase ${item.name} quantity`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="remove-btn"
                                                onClick={() => remove(item)}
                                                disabled={busy}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    <div className="cart-item-total">
                                        {item.available
                                            ? `₹${(item.price * item.quantity).toLocaleString("en-IN")}`
                                            : "—"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SUMMARY */}

                    <aside className="cart-summary">
                        <p className="section-label">ORDER SUMMARY</p>

                        {/* Free-delivery nudge */}
                        <div className="free-delivery-meter" role="status">
                            <p>
                                {amountToFreeDelivery > 0 ? (
                                    <>
                                        Add <strong>₹{amountToFreeDelivery.toLocaleString("en-IN")}</strong> more for{" "}
                                        <strong>FREE delivery</strong>
                                    </>
                                ) : (
                                    <>🎉 You&apos;ve unlocked <strong>FREE delivery</strong></>
                                )}
                            </p>
                            <div className="free-delivery-track" aria-hidden="true">
                                <span style={{ width: `${freeDeliveryProgress}%` }} />
                            </div>
                        </div>

                        <div className="summary-row">
                            <span>Subtotal</span>

                            <strong>
                                ₹{subtotal.toLocaleString("en-IN")}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>GST</span>

                            <strong>
                                {formatRupees(gst)}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>Delivery</span>

                            <strong>
                                {delivery === 0
                                    ? "FREE"
                                    : `₹${delivery}`}
                            </strong>
                        </div>

                        {mrpSavings > 0 && (
                            <p className="summary-savings">
                                You save ₹{mrpSavings.toLocaleString("en-IN")} on MRP
                            </p>
                        )}

                        <div className="summary-line" />

                        <div className="summary-total">
                            <span>Total</span>

                            <strong>
                                {formatRupees(total)}
                            </strong>
                        </div>

                        {hasUnavailable ? (
                            <p className="cart-blocked">
                                Remove out-of-stock items to proceed to checkout.
                            </p>
                        ) : status === "authenticated" ? (
                            <Link href="/checkout" className="checkout-btn">
                                Proceed to Checkout →
                            </Link>
                        ) : (
                            <>
                                <Link href="/checkout" className="checkout-btn">
                                    Checkout as Guest →
                                </Link>
                                <Link href="/login?callbackUrl=/checkout" className="continue-shopping">
                                    Have an account? Log in
                                </Link>
                            </>
                        )}

                        <Link
                            href="/products"
                            className="continue-shopping"
                        >
                            Continue Shopping
                        </Link>

                        <div className="cart-b2b">
                            <strong>Buying in bulk?</strong>

                            <p>
                                Hotels, restaurants, cafés and retailers can
                                request special B2B pricing.
                            </p>

                            <Link href="/contact">
                                Request Bulk Quote →
                            </Link>
                        </div>
                    </aside>
                </div>

                <CartSuggestions
                    excludeSlugs={cart.map((item) => item.slug)}
                    needForFreeDelivery={amountToFreeDelivery}
                    label="YOU MAY ALSO LIKE"
                    heading={
                        amountToFreeDelivery > 0
                            ? `Add ₹${amountToFreeDelivery.toLocaleString("en-IN")} more for free delivery`
                            : "Pairs well with your selection"
                    }
                />
            </div>
        </main>
    );
}
