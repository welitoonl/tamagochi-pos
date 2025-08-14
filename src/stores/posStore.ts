import { create } from 'zustand';
import { CartItem, Product, Sale, PaymentMethod } from '@/types';
import { mockProducts } from '@/data/mockData';

interface PosState {
  cart: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  isOnline: boolean;
  lastSync: Date | null;
  
  // Actions
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  finalizeSale: () => Sale | null;
  findProductByBarcode: (barcode: string) => Product | null;
  searchProducts: (query: string) => Product[];
  setOnlineStatus: (status: boolean) => void;
  updateLastSync: () => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  total: 0,
  paymentMethod: 'DINHEIRO',
  isOnline: true,
  lastSync: new Date(),
  
  addToCart: (product: Product) => {
    const { cart } = get();
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      get().updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        subtotal: product.price
      };
      const newCart = [...cart, newItem];
      const newTotal = newCart.reduce((sum, item) => sum + item.subtotal, 0);
      
      set({ cart: newCart, total: newTotal });
    }
  },
  
  removeFromCart: (productId: string) => {
    const { cart } = get();
    const newCart = cart.filter(item => item.product.id !== productId);
    const newTotal = newCart.reduce((sum, item) => sum + item.subtotal, 0);
    
    set({ cart: newCart, total: newTotal });
  },
  
  updateQuantity: (productId: string, quantity: number) => {
    const { cart } = get();
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          subtotal: item.product.price * quantity
        };
      }
      return item;
    });
    
    const newTotal = newCart.reduce((sum, item) => sum + item.subtotal, 0);
    set({ cart: newCart, total: newTotal });
  },
  
  clearCart: () => {
    set({ cart: [], total: 0 });
  },
  
  setPaymentMethod: (method: PaymentMethod) => {
    set({ paymentMethod: method });
  },
  
  finalizeSale: () => {
    const { cart, total, paymentMethod } = get();
    
    if (cart.length === 0) return null;
    
    const sale: Sale = {
      id: Date.now().toString(),
      items: [...cart],
      total,
      paymentMethod,
      status: 'FECHADA',
      operatorId: '1', // Mock - would come from auth
      operatorName: 'Mock User',
      createdAt: new Date()
    };
    
    // Clear cart after sale
    get().clearCart();
    
    return sale;
  },
  
  findProductByBarcode: (barcode: string) => {
    return mockProducts.find(product => 
      product.barcode === barcode || product.ean === barcode
    ) || null;
  },
  
  searchProducts: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return mockProducts.filter(product =>
      product.active && (
        product.name.toLowerCase().includes(lowerQuery) ||
        product.sku.toLowerCase().includes(lowerQuery) ||
        product.barcode.includes(query)
      )
    );
  },
  
  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });
  },
  
  updateLastSync: () => {
    set({ lastSync: new Date() });
  }
}));