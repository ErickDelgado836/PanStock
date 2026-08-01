import { Category, Product, UserProfile, Warehouse, MovementRecord } from '../types';

export const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: '00',
    code: '00',
    name: 'Almacén de Distribución Interna',
    description: 'Principal: Toda mercancía que ingrese al sistema debe pasar por este almacén.',
    isMainEntry: true,
  },
  {
    id: '01',
    code: '01',
    name: 'DESPACHO',
    description: 'Almacén para despacho directo y atención a ventas.',
    isSalesWarehouse: true,
  },
  {
    id: '02',
    code: '02',
    name: 'MERCANCÍA PARA LA VENTA',
    description: 'Productos exhibidos y listos para venta comercial.',
  },
  {
    id: '002',
    code: '002',
    name: 'VENTAS AL MAYOR',
    description: 'Almacén especializado para despachos y pedidos al mayor.',
    isSalesWarehouse: true,
  },
  {
    id: '03',
    code: '03',
    name: 'MATERIA PRIMA',
    description: 'Harinas, azúcares, mantecas y levaduras para producción.',
  },
  {
    id: '09',
    code: '09',
    name: 'PAPELERÍA Y MANTENIMIENTO',
    description: 'Papelería, rollos térmicos, balanzas, cintas de embalar y lápices.',
  },
  {
    id: '05',
    code: '05',
    name: 'BOLSAS DE EMPAQUE',
    description: 'Bolsas plásticas, de papel y empaques especiales.',
  },
  {
    id: '06',
    code: '06',
    name: 'EDIFICIO LOS ILUSTRES',
    description: 'Almacén anexo para bolsas, repuestos y depósitos diversos.',
  },
  {
    id: '07',
    code: '07',
    name: 'PRODUCTOS EN PROCESO',
    description: 'Panes y masas en etapa cruda o fermentación.',
  },
  {
    id: '08',
    code: '08',
    name: 'PRODUCTOS TERMINADOS',
    description: 'Panes recién horneados e inventario final para empaque.',
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-ch', name: 'CHARCUTERÍA', codePrefix: 'CH', isDefault: true },
  { id: 'cat-lac', name: 'LÁCTEOS', codePrefix: 'LAC', isDefault: true },
  { id: 'cat-be', name: 'BEBIDAS', codePrefix: 'BE', isDefault: true },
  { id: 'cat-vi', name: 'VÍVERES', codePrefix: 'VI', isDefault: true },
  { id: 'cat-pa', name: 'PAPELERÍA', codePrefix: 'PA', isDefault: true },
  { id: 'cat-ma', name: 'MATERIA PRIMA', codePrefix: 'MA', isDefault: true },
  { id: 'cat-pan', name: 'PANIFICACIÓN', codePrefix: 'PAN', isDefault: true },
];

export const ALL_WAREHOUSE_IDS = DEFAULT_WAREHOUSES.map((w) => w.id);

export const DEFAULT_ADMIN_USER: UserProfile = {
  username: 'admin',
  password: '192021',
  roleName: 'Administrador General',
  isAdmin: true,
  permissions: {
    canEntries: true,
    canExits: true,
    canTransfers: true,
    canExpiry: true,
    canSales: true,
    canPhysicalInventory: true,
    allowedWarehouses: ALL_WAREHOUSE_IDS,
  },
  createdAt: new Date().toISOString(),
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'CH-001',
    name: 'Jamón Superior de Pavo',
    categoryId: 'cat-ch',
    unit: 'kg',
    stockByWarehouse: {
      '00': 15.5,
      '01': 8.0,
      '02': 12.0,
      '002': 25.0,
    },
    expirationDate: '2026-08-20',
    entryDate: '2026-07-01',
    notes: 'Ingreso Lote J-901',
  },
  {
    id: 'prod-2',
    code: 'LAC-001',
    name: 'Queso Paisa Blanco',
    categoryId: 'cat-lac',
    unit: 'kg',
    stockByWarehouse: {
      '00': 10.0,
      '01': 5.0,
      '02': 15.0,
      '002': 30.0,
    },
    expirationDate: '2026-08-10',
    entryDate: '2026-07-05',
    notes: 'Refrigerado',
  },
  {
    id: 'prod-3',
    code: 'BE-001',
    name: 'Refresco Malta 1.5L',
    categoryId: 'cat-be',
    unit: 'unidades',
    stockByWarehouse: {
      '00': 120,
      '01': 40,
      '02': 60,
      '002': 100,
    },
    expirationDate: '2026-11-15',
    entryDate: '2026-06-10',
    notes: 'Cajas de 12u',
  },
  {
    id: 'prod-4',
    code: 'BE-002',
    name: 'Jugo Natural Naranja 1L',
    categoryId: 'cat-be',
    unit: 'L',
    stockByWarehouse: {
      '00': 30,
      '01': 12,
      '02': 18,
    },
    expirationDate: '2026-08-02', // Próximo a vencer
    entryDate: '2026-07-20',
  },
  {
    id: 'prod-5',
    code: 'VI-001',
    name: 'Salsa de Tomate Especial 500g',
    categoryId: 'cat-vi',
    unit: 'unidades',
    stockByWarehouse: {
      '00': 50,
      '01': 10,
      '02': 10,
    },
    expirationDate: '2027-01-10',
    entryDate: '2026-07-10',
  },
  {
    id: 'prod-6',
    code: 'MA-001',
    name: 'Harina de Trigo Panadera 45kg',
    categoryId: 'cat-ma',
    unit: 'kg',
    stockByWarehouse: {
      '00': 450,
      '03': 300,
      '07': 90,
    },
    expirationDate: '2026-12-30',
    entryDate: '2026-07-01',
  },
  {
    id: 'prod-7',
    code: 'MA-002',
    name: 'Levadura Fresca Activa',
    categoryId: 'cat-ma',
    unit: 'kg',
    stockByWarehouse: {
      '00': 25,
      '03': 15,
    },
    expirationDate: '2026-08-05', // Próximo a vencer
    entryDate: '2026-07-15',
  },
  {
    id: 'prod-8',
    code: 'PAN-001',
    name: 'Pan Canilla Tradicional',
    categoryId: 'cat-pan',
    unit: 'unidades',
    stockByWarehouse: {
      '01': 80,
      '02': 120,
      '07': 40,
      '08': 150,
    },
    expirationDate: '2026-07-30',
    entryDate: '2026-07-28',
  },
  {
    id: 'prod-9',
    code: 'PAN-002',
    name: 'Pan Campesino Especial',
    categoryId: 'cat-pan',
    unit: 'unidades',
    stockByWarehouse: {
      '01': 35,
      '02': 50,
      '08': 90,
    },
    expirationDate: '2026-07-31',
    entryDate: '2026-07-28',
  },
  {
    id: 'prod-10',
    code: 'PA-001',
    name: 'Rollos Térmicos para Balanza y Cajas',
    categoryId: 'cat-pa',
    unit: 'unidades',
    stockByWarehouse: {
      '00': 100,
      '09': 80,
    },
    entryDate: '2026-06-01',
  },
  {
    id: 'prod-11',
    code: 'PA-002',
    name: 'Cintas de Embalar Transparentes',
    categoryId: 'cat-pa',
    unit: 'unidades',
    stockByWarehouse: {
      '00': 50,
      '09': 35,
    },
    entryDate: '2026-06-05',
  },
  {
    id: 'prod-12',
    code: 'VI-002',
    name: 'Bolsas Plásticas Empaque Pan 1kg',
    categoryId: 'cat-vi',
    unit: 'unidades',
    stockByWarehouse: {
      '00': 5000,
      '05': 3000,
      '06': 2000,
    },
    entryDate: '2026-05-10',
  },
];

export const INITIAL_MOVEMENTS: MovementRecord[] = [
  {
    id: 'mov-1',
    movementNumber: 'ENT-2026-0001',
    type: 'ENTRADA',
    docRef: 'FAC-ESP-9801',
    date: '2026-07-25 09:30',
    responsibleUser: 'admin',
    targetWarehouseId: '00',
    notes: 'Ingreso inicial de despachos de salsa y charcutería',
    items: [
      { productId: 'prod-1', productCode: 'CH-001', productName: 'Jamón Superior de Pavo', quantity: 20, unit: 'kg' },
      { productId: 'prod-5', productCode: 'VI-001', productName: 'Salsa de Tomate Especial 500g', quantity: 70, unit: 'unidades' },
    ],
  },
  {
    id: 'mov-2',
    movementNumber: 'TRS-2026-0001',
    type: 'TRASLADO',
    docRef: 'TRS-ESP-0102',
    date: '2026-07-26 11:15',
    responsibleUser: 'admin',
    sourceWarehouseId: '00',
    targetWarehouseId: '01',
    notes: 'Traslado a Despacho para venta en mostrador',
    items: [
      { productId: 'prod-5', productCode: 'VI-001', productName: 'Salsa de Tomate Especial 500g', quantity: 10, unit: 'unidades' },
    ],
  },
];
