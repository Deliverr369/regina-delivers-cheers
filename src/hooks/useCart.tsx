import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "deliverr_cart_v1";
const PROMO_KEY = "deliverr_promo_v1";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  storeId: string;
  storeName: string;
}

export interface AppliedPromo {
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  promo_code_id: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  appliedPromo: AppliedPromo | null;
  applyPromo: (promo: AppliedPromo) => void;
  removePromo: () => void;
  /** Calculated discount based on current subtotal — returns 0 if cart is below min order amount. */
  getDiscountAmount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(PROMO_KEY) : null;
      return raw ? (JSON.parse(raw) as AppliedPromo) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      if (appliedPromo) localStorage.setItem(PROMO_KEY, JSON.stringify(appliedPromo));
      else localStorage.removeItem(PROMO_KEY);
    } catch {
      // ignore
    }
  }, [appliedPromo]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCartItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedPromo(null);
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const applyPromo = (promo: AppliedPromo) => setAppliedPromo(promo);
  const removePromo = () => setAppliedPromo(null);

  const getDiscountAmount = () => {
    if (!appliedPromo) return 0;
    const subtotal = getCartTotal();
    if (subtotal < appliedPromo.min_order_amount) return 0;
    if (appliedPromo.discount_type === "percentage") {
      return Math.min(subtotal, +(subtotal * (appliedPromo.discount_value / 100)).toFixed(2));
    }
    return Math.min(subtotal, appliedPromo.discount_value);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        appliedPromo,
        applyPromo,
        removePromo,
        getDiscountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
