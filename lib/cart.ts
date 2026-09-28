export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

const CART_KEY = "aurelia-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  const cart = localStorage.getItem(CART_KEY);

  return cart ? JSON.parse(cart) : [];
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  window.dispatchEvent(new Event("cartUpdated"));
}

export function addToCart(item: CartItem) {
  const cart = getCart();

  const existingItem = cart.find(
    (product) => product.slug === item.slug
  );

  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
}

export function removeFromCart(slug: string) {
  const cart = getCart().filter(
    (product) => product.slug !== slug
  );

  saveCart(cart);
}

export function updateCartQuantity(
  slug: string,
  quantity: number
) {
  const cart = getCart();

  const item = cart.find(
    (product) => product.slug === slug
  );

  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(slug);
    return;
  }

  item.quantity = quantity;

  saveCart(cart);
}

export function getCartCount() {
  return getCart().reduce(
    (total, item) => total + item.quantity,
    0
  );
}