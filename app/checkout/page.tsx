"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartItem, getCart, saveCart } from "../../lib/cart";

export default function CheckoutPage() {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Customer information
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Delivery information
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pin, setPin] = useState("");

    useEffect(() => {
        setCart(getCart());
    }, []);

    const subtotal = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const delivery = subtotal >= 2000 ? 0 : 99;

    const total = subtotal + delivery;

    // Empty cart
    if (cart.length === 0) {
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

    // Place order
    const handlePlaceOrder = () => {
    const customerName = name.trim();
    const customerPhone = phone.trim();
    const customerEmail = email.trim();
    const customerAddress = address.trim();
    const customerCity = city.trim();
    const customerState = state.trim();
    const customerPin = pin.trim();

    if (!customerName) {
        alert("Please enter your full name.");
        return;
    }

    if (!customerPhone) {
        alert("Please enter your phone number.");
        return;
    }

    if (!customerEmail) {
        alert("Please enter your email address.");
        return;
    }

    if (!customerAddress) {
        alert("Please enter your delivery address.");
        return;
    }

    if (!customerCity) {
        alert("Please enter your city.");
        return;
    }

    if (!customerState) {
        alert("Please select your state.");
        return;
    }

    if (!customerPin) {
        alert("Please enter your PIN code.");
        return;
    }

    if (customerPhone.replace(/\D/g, "").length < 10) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    if (!/^\d{6}$/.test(customerPin)) {
        alert("Please enter a valid 6-digit PIN code.");
        return;
    }

    if (!customerEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
    }

    const orderId = "AC-" + Date.now();

    const order = {
        orderId,
        items: cart,
        subtotal,
        delivery,
        total,
        customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: customerAddress,
            city: customerCity,
            state: customerState,
            pin: customerPin,
        },
        date: new Date().toISOString(),
        status: "Pending",
    };

    const existingOrders = JSON.parse(
    localStorage.getItem("aurelia-orders") || "[]"
);

existingOrders.unshift(order);

localStorage.setItem(
    "aurelia-orders",
    JSON.stringify(existingOrders)
);

// Latest order bhi save rahega
localStorage.setItem(
    "aurelia-last-order",
    JSON.stringify(order)
);
    saveCart([]);

    window.location.href = "/order-success";
};

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

                <div className="checkout-layout">

                    {/* FORM */}

                    <div className="checkout-form">

                        {/* CONTACT INFORMATION */}

                        <section className="checkout-section">
                            <div className="checkout-section-title">
                                <span>01</span>
                                <h2>Contact Information</h2>
                            </div>

                            <div className="form-grid">

                                <div className="form-field full">
                                    <label>FULL NAME *</label>

                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>PHONE NUMBER *</label>

                                    <input
                                        type="tel"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>EMAIL ADDRESS *</label>

                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
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

                            <div className="form-grid">

                                <div className="form-field full">
                                    <label>ADDRESS *</label>

                                    <textarea
                                        rows={3}
                                        placeholder="House / Flat / Street / Area"
                                        value={address}
                                        onChange={(e) =>
                                            setAddress(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>CITY *</label>

                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={city}
                                        onChange={(e) =>
                                            setCity(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>STATE *</label>

                                    <select
                                        value={state}
                                        onChange={(e) =>
                                            setState(e.target.value)
                                        }
                                    >
                                        <option value="" disabled>
                                            Select State
                                        </option>

                                        <option value="Delhi">
                                            Delhi
                                        </option>

                                        <option value="Uttar Pradesh">
                                            Uttar Pradesh
                                        </option>

                                        <option value="Haryana">
                                            Haryana
                                        </option>

                                        <option value="Maharashtra">
                                            Maharashtra
                                        </option>

                                        <option value="Rajasthan">
                                            Rajasthan
                                        </option>

                                        <option value="Gujarat">
                                            Gujarat
                                        </option>

                                        <option value="Punjab">
                                            Punjab
                                        </option>

                                        <option value="Other">
                                            Other
                                        </option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>PIN CODE *</label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="201301"
                                        value={pin}
                                        onChange={(e) =>
                                            setPin(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    ""
                                                )
                                            )
                                        }
                                    />
                                </div>

                            </div>
                        </section>

                        {/* BILLING */}

                        <section className="checkout-section">

                            <div className="checkout-section-title">
                                <span>03</span>
                                <h2>Billing Information</h2>
                            </div>

                            <label className="checkbox-field">
                                <input type="checkbox" />

                                <span>
                                    Billing address is same as delivery address
                                </span>
                            </label>

                            <div className="gst-box">
                                <strong>Business purchase?</strong>

                                <p>
                                    Need a GST invoice? GST details can be
                                    added during the order-processing step.
                                </p>
                            </div>

                        </section>

                        {/* PAYMENT */}

                        <section className="checkout-section">

                            <div className="checkout-section-title">
                                <span>04</span>
                                <h2>Payment Method</h2>
                            </div>

                            <div className="payment-option active">

                                <div className="payment-radio">
                                    <span />
                                </div>

                                <div>
                                    <strong>Online Payment</strong>

                                    <p>
                                        UPI, Debit Card, Credit Card &
                                        Net Banking
                                    </p>
                                </div>

                            </div>

                            <div className="payment-note">
                                Payment gateway will be connected in the
                                next stage.
                            </div>

                        </section>

                        {/* PLACE ORDER */}

                        <button
                            type="button"
                            className="place-order-btn"
                            onClick={handlePlaceOrder}
                        >
                            Place Order →
                        </button>

                    </div>

                    {/* ORDER SUMMARY */}

                    <aside className="checkout-summary">

                        <p className="section-label">
                            YOUR ORDER
                        </p>

                        <div className="checkout-products">

                            {cart.map((item) => (
                                <div
                                    className="checkout-product"
                                    key={item.slug}
                                >
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                    />

                                    <div>
                                        <h3>{item.name}</h3>

                                        <p>
                                            Qty: {item.quantity}
                                        </p>

                                        <strong>
                                            ₹
                                            {(
                                                item.price *
                                                item.quantity
                                            ).toLocaleString("en-IN")}
                                        </strong>
                                    </div>
                                </div>
                            ))}

                        </div>

                        <div className="summary-line" />

                        <div className="summary-row">
                            <span>Subtotal</span>

                            <strong>
                                ₹
                                {subtotal.toLocaleString(
                                    "en-IN"
                                )}
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

                        <div className="summary-line" />

                        <div className="summary-total">
                            <span>Total</span>

                            <strong>
                                ₹
                                {total.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                        <div className="secure-checkout">
                            🔒 Secure checkout
                        </div>

                    </aside>

                </div>
            </div>
        </main>
    );
}