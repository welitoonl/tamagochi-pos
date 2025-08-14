export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'GERENTE' | 'FUNCIONARIO';
  active: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  sku: string;
  barcode: string;
  stock: number;
  active: boolean;
  ean?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'DINHEIRO' | 'CARTAO';
  status: 'PENDENTE' | 'FECHADA' | 'CANCELADA';
  operatorId: string;
  operatorName: string;
  createdAt: Date;
  voidedAt?: Date;
  voidedBy?: string;
}

export interface DashboardMetrics {
  totalToday: number;
  totalWeek: number;
  salesByOperator: {
    operatorName: string;
    sales: number;
    total: number;
  }[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export type PaymentMethod = 'DINHEIRO' | 'CARTAO';
export type SaleStatus = 'PENDENTE' | 'FECHADA' | 'CANCELADA';
export type UserRole = 'ADMIN' | 'GERENTE' | 'FUNCIONARIO';