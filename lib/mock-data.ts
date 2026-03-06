import type { Order, Customer, Treatment, Tenant, OrderWithDetails, DailySale, PeakHour, MonthlyRevenue } from '@/types'

export const MOCK_TENANT: Tenant = {
  id: 'tenant-001',
  name: 'ShoeOps Surabaya',
  slug: 'surabaya',
  wa_number: '6281234567890',
  address: 'Jl. Raya Darmo No. 12, Surabaya',
  created_at: '2025-01-01T00:00:00Z',
  trial_ends_at: '2025-03-09T00:00:00Z',
  subscription_status: 'trial',
}

export const MOCK_TREATMENTS: Treatment[] = [
  { id: 't1', tenant_id: 'tenant-001', name: 'Basic Wash', price: 45000, is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 't2', tenant_id: 'tenant-001', name: 'Deep Cleaning', price: 85000, is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 't3', tenant_id: 'tenant-001', name: 'Unyellowing', price: 95000, is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 't4', tenant_id: 'tenant-001', name: 'Premium Restore', price: 135000, is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 't5', tenant_id: 'tenant-001', name: 'Water Repellent', price: 60000, is_active: false, created_at: '2025-01-01T00:00:00Z' },
]

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', tenant_id: 'tenant-001', name: 'Budi Santoso', phone: '0812-3456-7890', total_orders: 8, last_order_at: '2025-02-21T09:00:00Z', created_at: '2024-06-01T00:00:00Z' },
  { id: 'c2', tenant_id: 'tenant-001', name: 'Siti Rahayu', phone: '0813-2233-4455', total_orders: 6, last_order_at: '2025-02-18T10:30:00Z', created_at: '2024-07-15T00:00:00Z' },
  { id: 'c3', tenant_id: 'tenant-001', name: 'Ahmad Fauzi', phone: '0822-9988-7766', total_orders: 4, last_order_at: '2025-02-22T11:00:00Z', created_at: '2024-08-10T00:00:00Z' },
  { id: 'c4', tenant_id: 'tenant-001', name: 'Dewi Kusuma', phone: '0856-4433-2211', total_orders: 2, last_order_at: '2025-02-23T08:30:00Z', created_at: '2024-10-05T00:00:00Z' },
  { id: 'c5', tenant_id: 'tenant-001', name: 'Eko Prasetyo', phone: '0821-5544-3322', total_orders: 1, last_order_at: '2025-01-19T14:00:00Z', created_at: '2025-01-19T00:00:00Z' },
  { id: 'c6', tenant_id: 'tenant-001', name: 'Fitri Handayani', phone: '0878-1234-5678', total_orders: 3, last_order_at: '2025-02-20T09:45:00Z', created_at: '2024-09-20T00:00:00Z' },
  { id: 'c7', tenant_id: 'tenant-001', name: 'Gunawan Putra', phone: '0812-8765-4321', total_orders: 5, last_order_at: '2025-02-20T13:00:00Z', created_at: '2024-05-12T00:00:00Z' },
  { id: 'c8', tenant_id: 'tenant-001', name: 'Hendra Wijaya', phone: '0819-6543-2109', total_orders: 4, last_order_at: '2025-01-15T10:00:00Z', created_at: '2024-06-28T00:00:00Z' },
]

export const MOCK_ORDERS: OrderWithDetails[] = [
  {
    id: 'o1', tenant_id: 'tenant-001', order_code: 'SO-1241',
    customer_id: 'c1', status: 'diproses', total_price: 85000,
    notes: 'Sepatu putih, hati-hati sol', estimated_done_at: '2025-02-24',
    created_at: '2025-02-23T09:00:00Z', updated_at: '2025-02-23T10:30:00Z',
    customers: MOCK_CUSTOMERS[0],
    order_items: [{ id: 'oi1', order_id: 'o1', treatment_id: 't2', treatment_name: 'Deep Cleaning', price: 85000, quantity: 1 }],
  },
  {
    id: 'o2', tenant_id: 'tenant-001', order_code: 'SO-1240',
    customer_id: 'c2', status: 'selesai', total_price: 45000,
    notes: null, estimated_done_at: '2025-02-23',
    created_at: '2025-02-22T10:30:00Z', updated_at: '2025-02-23T14:00:00Z',
    customers: MOCK_CUSTOMERS[1],
    order_items: [{ id: 'oi2', order_id: 'o2', treatment_id: 't1', treatment_name: 'Basic Wash', price: 45000, quantity: 1 }],
  },
  {
    id: 'o3', tenant_id: 'tenant-001', order_code: 'SO-1239',
    customer_id: 'c3', status: 'diantar', total_price: 135000,
    notes: 'Sepatu kulit, minta ekstra poles', estimated_done_at: '2025-02-23',
    created_at: '2025-02-22T11:00:00Z', updated_at: '2025-02-23T15:30:00Z',
    customers: MOCK_CUSTOMERS[2],
    order_items: [{ id: 'oi3', order_id: 'o3', treatment_id: 't4', treatment_name: 'Premium Restore', price: 135000, quantity: 1 }],
  },
  {
    id: 'o4', tenant_id: 'tenant-001', order_code: 'SO-1238',
    customer_id: 'c4', status: 'diterima', total_price: 95000,
    notes: null, estimated_done_at: '2025-02-25',
    created_at: '2025-02-23T08:30:00Z', updated_at: '2025-02-23T08:30:00Z',
    customers: MOCK_CUSTOMERS[3],
    order_items: [{ id: 'oi4', order_id: 'o4', treatment_id: 't3', treatment_name: 'Unyellowing', price: 95000, quantity: 1 }],
  },
  {
    id: 'o5', tenant_id: 'tenant-001', order_code: 'SO-1237',
    customer_id: 'c5', status: 'selesai', total_price: 60000,
    notes: null, estimated_done_at: '2025-02-22',
    created_at: '2025-02-21T14:00:00Z', updated_at: '2025-02-22T11:00:00Z',
    customers: MOCK_CUSTOMERS[4],
    order_items: [{ id: 'oi5', order_id: 'o5', treatment_id: 't5', treatment_name: 'Water Repellent', price: 60000, quantity: 1 }],
  },
  {
    id: 'o6', tenant_id: 'tenant-001', order_code: 'SO-1236',
    customer_id: 'c6', status: 'selesai', total_price: 45000,
    notes: null, estimated_done_at: '2025-02-21',
    created_at: '2025-02-20T09:45:00Z', updated_at: '2025-02-21T10:00:00Z',
    customers: MOCK_CUSTOMERS[5],
    order_items: [{ id: 'oi6', order_id: 'o6', treatment_id: 't1', treatment_name: 'Basic Wash', price: 45000, quantity: 1 }],
  },
  {
    id: 'o7', tenant_id: 'tenant-001', order_code: 'SO-1235',
    customer_id: 'c7', status: 'selesai', total_price: 85000,
    notes: 'Sole perlu perhatian ekstra', estimated_done_at: '2025-02-21',
    created_at: '2025-02-20T13:00:00Z', updated_at: '2025-02-21T13:00:00Z',
    customers: MOCK_CUSTOMERS[6],
    order_items: [{ id: 'oi7', order_id: 'o7', treatment_id: 't2', treatment_name: 'Deep Cleaning', price: 85000, quantity: 1 }],
  },
  {
    id: 'o8', tenant_id: 'tenant-001', order_code: 'SO-1234',
    customer_id: 'c8', status: 'selesai', total_price: 135000,
    notes: null, estimated_done_at: '2025-02-20',
    created_at: '2025-02-19T10:00:00Z', updated_at: '2025-02-20T10:00:00Z',
    customers: MOCK_CUSTOMERS[7],
    order_items: [{ id: 'oi8', order_id: 'o8', treatment_id: 't4', treatment_name: 'Premium Restore', price: 135000, quantity: 1 }],
  },
]

export const MOCK_DAILY_SALES: DailySale[] = [
  { day: 'Sen', value: 820000, orders: 10 },
  { day: 'Sel', value: 650000, orders: 8 },
  { day: 'Rab', value: 1100000, orders: 13 },
  { day: 'Kam', value: 940000, orders: 11 },
  { day: 'Jum', value: 1320000, orders: 15 },
  { day: 'Sab', value: 1560000, orders: 18 },
  { day: 'Min', value: 960000, orders: 12 },
]

export const MOCK_PEAK_HOURS: PeakHour[] = [
  { hour: '08', count: 4 }, { hour: '09', count: 8 }, { hour: '10', count: 12 },
  { hour: '11', count: 9 }, { hour: '12', count: 6 }, { hour: '13', count: 5 },
  { hour: '14', count: 10 }, { hour: '15', count: 14 }, { hour: '16', count: 11 },
  { hour: '17', count: 7 }, { hour: '18', count: 3 }, { hour: '19', count: 2 },
]

export const MOCK_MONTHLY_REVENUE: MonthlyRevenue[] = [
  { month: 'Ags', value: 9200000 },
  { month: 'Sep', value: 10800000 },
  { month: 'Okt', value: 11500000 },
  { month: 'Nov', value: 13200000 },
  { month: 'Des', value: 14900000 },
  { month: 'Jan', value: 12300000 },
  { month: 'Feb', value: 14200000, isCurrent: true },
]

export const MOCK_DORMANT_CUSTOMERS = [
  { id: 'c5', name: 'Eko Prasetyo', phone: '0821-5544-3322', lastOrderAt: '2025-01-19T00:00:00Z', daysSince: 35 },
  { id: 'c8', name: 'Hendra Wijaya', phone: '0819-6543-2109', lastOrderAt: '2025-01-15T00:00:00Z', daysSince: 39 },
  { id: 'ex1', name: 'Rina Kusuma', phone: '0856-7788-9900', lastOrderAt: '2025-01-10T00:00:00Z', daysSince: 44 },
  { id: 'ex2', name: 'Tono Santoso', phone: '0812-4455-6677', lastOrderAt: '2024-12-28T00:00:00Z', daysSince: 57 },
]
