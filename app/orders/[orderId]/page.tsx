"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OrderItem = {
    slug: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
};

type Customer = {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pin: string;
};

type Order = {
    orderId: string;
    items: OrderItem[];
    subtotal: number;
    delivery: number;
    total: number;
    date: string;
    status: string;
    customer: Customer;
};

export default function OrderDetailsPage() {
    const params = useParams();

    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        const savedOrders = localStorage.getItem(
            "aurelia-orders"
        );

        if (!savedOrders) {
            return;
        }

        try {
            const orders: Order[] = JSON.parse(
                savedOrders
            );

            const foundOrder = orders.find(
                (item) => item.orderId === orderId
            );

            if (foundOrder) {
                setOrder(foundOrder);
            }
        } catch (error) {
            console.error(
                "Unable to load order:",
                error
            );
        }
    }, [orderId]);

    if (!order) {
        return (
            <main className="orders-page">

                <div className="orders-container orders-empty">

                    <p className="section-label">
                        ORDER
                    </p>

                    <h1>
                        Order not
                        <br />
                        <em>found.</em>
                    </h1>

                    <Link
                        href="/orders"
                        className="primary-btn"
                    >
                        Back to Orders →
                    </Link>

                </div>

            </main>
        );
    }

    return (
        <main className="orders-page">

            <div className="orders-container">

                {/* BACK */}

                <Link
                    href="/orders"
                    className="back-link"
                >
                    ← Back to Orders
                </Link>

                {/* HEADER */}

                <div className="orders-header">

                    <p className="section-label">
                        ORDER DETAILS
                    </p>

                    <h1>
                        Order
                        <br />
                        <em>{order.orderId}</em>
                    </h1>

                    <p>
                        Placed on{" "}
                        {new Date(
                            order.date
                        ).toLocaleDateString(
                            "en-IN"
                        )}
                    </p>

                </div>

                {/* STATUS */}

                <div className="order-detail-status">

                    <div>
                        <span>
                            ORDER STATUS
                        </span>

                        <strong>
                            {order.status}
                        </strong>
                    </div>

                </div>

                <div className="order-detail-layout">

                    {/* LEFT */}

                    <div>

                        {/* PRODUCTS */}

                        <section className="order-detail-section">

                            <div className="checkout-section-title">
                                <span>01</span>
                                <h2>
                                    Products
                                </h2>
                            </div>

                            {order.items.map(
                                (item) => (

                                    <div
                                        className="order-detail-product"
                                        key={
                                            item.slug
                                        }
                                    >

                                        <img
                                            src={
                                                item.image
                                            }
                                            alt={
                                                item.name
                                            }
                                        />

                                        <div>

                                            <h3>
                                                {
                                                    item.name
                                                }
                                            </h3>

                                            <p>
                                                Quantity:{" "}
                                                {
                                                    item.quantity
                                                }
                                            </p>

                                            <strong>
                                                ₹
                                                {(
                                                    item.price *
                                                    item.quantity
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                )
                            )}

                        </section>

                        {/* CUSTOMER */}

                        <section className="order-detail-section">

                            <div className="checkout-section-title">
                                <span>02</span>
                                <h2>
                                    Customer Information
                                </h2>
                            </div>

                            <div className="customer-details">

                                <p>
                                    <span>
                                        Name
                                    </span>

                                    <strong>
                                        {
                                            order.customer
                                                ?.name
                                        }
                                    </strong>
                                </p>

                                <p>
                                    <span>
                                        Phone
                                    </span>

                                    <strong>
                                        {
                                            order.customer
                                                ?.phone
                                        }
                                    </strong>
                                </p>

                                <p>
                                    <span>
                                        Email
                                    </span>

                                    <strong>
                                        {
                                            order.customer
                                                ?.email
                                        }
                                    </strong>
                                </p>

                            </div>

                        </section>

                        {/* ADDRESS */}

                        <section className="order-detail-section">

                            <div className="checkout-section-title">
                                <span>03</span>
                                <h2>
                                    Delivery Address
                                </h2>
                            </div>

                            <p className="detail-address">

                                {
                                    order.customer
                                        ?.address
                                }

                                <br />

                                {
                                    order.customer
                                        ?.city
                                }
                                ,{" "}
                                {
                                    order.customer
                                        ?.state
                                }

                                {" - "}

                                {
                                    order.customer
                                        ?.pin
                                }

                            </p>

                        </section>

                    </div>

                    {/* RIGHT — SUMMARY */}

                    <aside className="order-detail-summary">

                        <p className="section-label">
                            ORDER SUMMARY
                        </p>

                        <div className="summary-row">
                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ₹
                                {order.subtotal.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>
                                Delivery
                            </span>

                            <strong>
                                {order.delivery === 0
                                    ? "FREE"
                                    : `₹${order.delivery}`}
                            </strong>
                        </div>

                        <div className="summary-line" />

                        <div className="summary-total">
                            <span>
                                Total
                            </span>

                            <strong>
                                ₹
                                {order.total.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                        <div className="secure-checkout">
                            🔒 Secure order
                        </div>

                    </aside>

                </div>

            </div>

        </main>
    );
}