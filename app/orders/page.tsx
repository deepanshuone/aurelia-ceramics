"use client";

import Link from "next/link";
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

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const savedOrders = localStorage.getItem(
            "aurelia-orders"
        );

        if (savedOrders) {
            try {
                const parsedOrders = JSON.parse(savedOrders);

                if (Array.isArray(parsedOrders)) {
                    setOrders(parsedOrders);
                }
            } catch (error) {
                console.error(
                    "Unable to load orders:",
                    error
                );
            }
        }
    }, []);

    if (orders.length === 0) {
        return (
            <main className="orders-page">

                <div className="orders-container orders-empty">

                    <p className="section-label">
                        MY ORDERS
                    </p>

                    <h1>
                        No orders
                        <br />
                        <em>yet.</em>
                    </h1>

                    <p>
                        You have not placed any orders yet.
                    </p>

                    <Link
                        href="/products"
                        className="primary-btn"
                    >
                        Start Shopping →
                    </Link>

                </div>

            </main>
        );
    }

    return (
        <main className="orders-page">

            <div className="orders-container">

                <div className="orders-header">

                    <p className="section-label">
                        MY ORDERS
                    </p>

                    <h1>
                        Your
                        <br />
                        <em>orders.</em>
                    </h1>

                </div>

                <div className="orders-list">

                    {orders.map((order) => (

                        <div
                            className="order-card"
                            key={order.orderId}
                        >

                            {/* HEADER */}

                            <div className="order-card-header">

                                <div>
                                    <span>
                                        ORDER ID
                                    </span>

                                    <strong>
                                        {order.orderId}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        ORDER DATE
                                    </span>

                                    <strong>
                                        {new Date(
                                            order.date
                                        ).toLocaleDateString(
                                            "en-IN"
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        STATUS
                                    </span>

                                    <strong className="order-status">
                                        {order.status}
                                    </strong>
                                </div>

                            </div>

                            {/* PRODUCTS */}

                            <div className="order-products">

                                {order.items.map(
                                    (item) => (

                                        <div
                                            className="order-product"
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

                                            <div className="order-product-info">

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

                            </div>

                            {/* TOTAL */}

                            <div className="order-total">

                                <span>
                                    Total Amount
                                </span>

                                <strong>
                                    ₹
                                    {order.total.toLocaleString(
                                        "en-IN"
                                    )}
                                </strong>

                            </div>

                            <Link
                                href={`/orders/${order.orderId}`}
                                className="view-order-btn"
                            >
                                View Order →
                            </Link>

                            {/* ADDRESS */}

                            <div className="order-address">

                                <h3>
                                    Delivery Address
                                </h3>

                                <p>
                                    {order.customer?.name}
                                    <br />

                                    {order.customer?.address}
                                    <br />

                                    {order.customer?.city},{" "}
                                    {order.customer?.state} -{" "}
                                    {order.customer?.pin}
                                    <br />

                                    Phone:{" "}
                                    {order.customer?.phone}
                                </p>

                            </div>

                        </div>

                    ))}

                </div>

                <div className="orders-actions">

                    <Link
                        href="/products"
                        className="primary-btn"
                    >
                        Continue Shopping →
                    </Link>

                    <Link
                        href="/"
                        className="secondary-btn"
                    >
                        Back to Home
                    </Link>

                </div>

            </div>

        </main>
    );
}