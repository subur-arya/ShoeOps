export type OrderStatus = string  // supports custom statuses configured per tenant
export type UserRole = 'owner' | 'operasional'
export type SubscriptionStatus = 'trial' | 'active' | 'expired'

export interface Tenant {
  id: string
  name: string
  slug: string
  token: string | null
  wa_number: string | null
  address: string | null
  created_at: string
  trial_ends_at: string
  subscription_status: SubscriptionStatus
  active_until: string | null
}

export interface AppUser {
  id: string
  tenant_id: string
  role: UserRole
  name: string
  email: string
  created_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  total_orders: number
  last_order_at: string | null
  created_at: string
}

export interface Treatment {
  id: string
  tenant_id: string
  name: string
  price: number
  is_active: boolean
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  treatment_id: string
  treatment_name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  tenant_id: string
  order_code: string
  customer_id: string
  status: OrderStatus
  total_price: number
  notes: string | null
  estimated_done_at: string | null
  created_at: string
  updated_at: string
  payment_method: 'cash' | 'transfer' | 'qris' | null
  amount_paid: number | null
  shoe_type: string | null
  shoe_color: string | null
  shoe_brand: string | null
  customers?: Customer
  order_items?: OrderItem[]
}

export interface OrderWithDetails extends Order {
  customers: Customer
  order_items: OrderItem[]
}

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  yesterdayOrders: number
  yesterdayRevenue: number
}

export interface OwnerStats {
  todayRevenue: number
  monthRevenue: number
  yearRevenue: number
  totalOrders: number
  avgTransaction: number
  repeatRate: number
  lastMonthRevenue: number
  lastYearRevenue: number
  todayOrders: number
  monthOrders: number
  yearOrders: number
  lastMonthOrders: number
}

export interface TreatmentStat {
  name: string
  orders: number
  revenue: number
  pct: number
}

export interface CustomerStat {
  totalUnique: number
  repeatRate: number
  loyalCount: number
  dormantCount: number
}

export interface DormantCustomer {
  id: string
  name: string
  phone: string | null
  lastOrderAt: string
  daysSince: number
}

export interface PeakHour {
  hour: string
  count: number
}

export interface DailySale {
  day: string
  value: number
  orders: number
}

export interface MonthlyRevenue {
  month: string
  value: number
  isCurrent?: boolean
}

// ── MATERIAL TYPES ──────────────────────────────────────────

export interface Material {
  id: string
  tenant_id: string
  name: string
  unit: string
  stock: number
  min_stock: number
  cost_per_unit: number
  created_at: string
  updated_at: string
}

export interface MaterialUsage {
  id: string
  tenant_id: string
  treatment_id: string
  material_id: string
  deduct_type: 'qty' | 'pct'
  deduct_value: number
  material?: Material
}

export interface StockLog {
  id: string
  tenant_id: string
  material_id: string
  type: 'in' | 'out' | 'adjust'
  qty: number
  note: string | null
  order_id: string | null
  changed_by: string | null
  created_at: string
  material?: Material
}