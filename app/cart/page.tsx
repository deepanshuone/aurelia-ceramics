"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    CartItem,
    getCart,
    removeFromCart,
    updateCartQuantity,
} from "../../lib/cart";

export default function CartPage() {
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        setCart(getCart());
    }, []);

    function refreshCart() {
        setCart(getCart());
    }

    function increase(item: CartItem) {
        updateCartQuantity(item.slug, item.quantity + 1);
        refreshCart();
    }

    function decrease(item: CartItem) {
        updateCartQuantity(item.slug, item.quantity - 1);
        refreshCart();
    }

    function remove(item: CartItem) {
        removeFromCart(item.slug);
        refreshCart();
    }

    const subtotal = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const delivery = subtotal >= 2000 ? 0 : 99;

    const total = subtotal + delivery;

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

                <div className="cart-layout">
                    {/* CART ITEMS */}

                    <div className="cart-items">
                        {cart.map((item) => (
                            <div className="cart-item" key={item.slug}>
                                <img
                                    src={item.image}
                                    alt={item.name}
                                />

                                <div className="cart-item-info">
                                    <p>PRODUCT</p>

                                    <h2>{item.name}</h2>

                                    <strong>
                                        ₹{item.price.toLocaleString("en-IN")}
                                    </strong>

                                    <div className="cart-item-bottom">
                                        <div className="cart-quantity">
                                            <button
                                                onClick={() => decrease(item)}
                                            >
                                                −
                                            </button>

                                            <span>{item.quantity}</span>

                                            <button
                                                onClick={() => increase(item)}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            className="remove-btn"
                                            onClick={() => remove(item)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                <div className="cart-item-total">
                                    ₹
                                    {(
                                        item.price * item.quantity
                                    ).toLocaleString("en-IN")}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SUMMARY */}

                    <aside className="cart-summary">
                        <p className="section-label">ORDER SUMMARY</p>

                        <div className="summary-row">
                            <span>Subtotal</span>

                            <strong>
                                ₹{subtotal.toLocaleString("en-IN")}
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
                                ₹{total.toLocaleString("en-IN")}
                            </strong>
                        </div>
                        <Link href="/checkout" className="checkout-btn">
                            Proceed to Checkout →
                        </Link>

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
            </div>
        </main>
    );
}