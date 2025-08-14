import { User, Product, Sale, CartItem } from '@/types';

// Mock users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin Sistema',
    email: 'admin@tamagochii.com',
    role: 'ADMIN',
    active: true,
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'João Gerente',
    email: 'joao@tamagochii.com',
    role: 'GERENTE',
    active: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '3',
    name: 'Maria Operadora',
    email: 'maria@tamagochii.com',
    role: 'FUNCIONARIO',
    active: true,
    createdAt: new Date('2024-02-01')
  }
];

// Mock products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Coca-Cola 2L',
    price: 8.50,
    image: '',
    sku: 'TGC001',
    barcode: '7894900011012',
    stock: 50,
    active: true,
    ean: '7894900011012',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Pão de Açúcar',
    price: 12.90,
    image: '',
    sku: 'TGC002',
    barcode: 'TGC002',
    stock: 25,
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Sabonete Dove',
    price: 4.50,
    image: '',
    sku: 'TGC003',
    barcode: '7891150047310',
    stock: 100,
    active: true,
    ean: '7891150047310',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '4',
    name: 'Leite Integral 1L',
    price: 5.90,
    image: '',
    sku: 'TGC004',
    barcode: 'TGC004',
    stock: 30,
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '5',
    name: 'Arroz Branco 5kg',
    price: 22.90,
    image: '',
    sku: 'TGC005',
    barcode: 'TGC005',
    stock: 15,
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Mock sales
export const mockSales: Sale[] = [
  {
    id: '1',
    items: [
      {
        product: mockProducts[0],
        quantity: 2,
        subtotal: 17.00
      },
      {
        product: mockProducts[2],
        quantity: 1,
        subtotal: 4.50
      }
    ],
    total: 21.50,
    paymentMethod: 'CARTAO',
    status: 'FECHADA',
    operatorId: '3',
    operatorName: 'Maria Operadora',
    createdAt: new Date()
  },
  {
    id: '2',
    items: [
      {
        product: mockProducts[4],
        quantity: 1,
        subtotal: 22.90
      }
    ],
    total: 22.90,
    paymentMethod: 'DINHEIRO',
    status: 'FECHADA',
    operatorId: '2',
    operatorName: 'João Gerente',
    createdAt: new Date(Date.now() - 3600000) // 1 hour ago
  }
];

// Authentication mock
export const authenticateUser = (email: string, password: string): User | null => {
  if (password !== '123456') return null; // Simple mock password
  
  const user = mockUsers.find(u => u.email === email && u.active);
  return user || null;
};

// Generate barcode function
export const generateBarcode = (sku: string): string => {
  return sku; // Simplified for mock - in real app would use Code 128
};

// Generate SKU function
export const generateSKU = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `TGC${timestamp}`;
};