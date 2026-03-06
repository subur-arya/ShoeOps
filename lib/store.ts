'use client'
// ─────────────────────────────────────────────────────────
// Simple localStorage-based store untuk semua data app
// Saat Supabase sudah siap, tinggal ganti fungsi-fungsi ini
// ─────────────────────────────────────────────────────────
import {
  MOCK_ORDERS, MOCK_TREATMENTS, MOCK_CUSTOMERS,
} from './mock-data'
import type { OrderWithDetails, Treatment, Customer, OrderStatus } from '@/types'

const KEYS = {
  orders:    'shoeops_orders',
  treatments:'shoeops_treatments',
  customers: 'shoeops_customers',
}

// ── Orders ──────────────────────────────────────────────
export function getOrders(): OrderWithDetails[] {
  if (typeof window === 'undefined') return MOCK_ORDERS
  const raw = localStorage.getItem(KEYS.orders)
  if (!raw) { saveOrders(MOCK_ORDERS); return MOCK_ORDERS }
  return JSON.parse(raw)
}
export function saveOrders(orders: OrderWithDetails[]) {
  localStorage.setItem(KEYS.orders, JSON.stringify(orders))
}
export function addOrder(order: OrderWithDetails) {
  const orders = getOrders()
  const updated = [order, ...orders]
  saveOrders(updated)
  return updated
}
export function updateOrderStatus(orderId: string, status: OrderStatus): OrderWithDetails[] {
  const orders = getOrders()
  const updated = orders.map(o =>
    o.id === orderId
      ? { ...o, status, updated_at: new Date().toISOString() }
      : o
  )
  saveOrders(updated)
  return updated
}
export function deleteOrder(orderId: string): OrderWithDetails[] {
  const orders = getOrders()
  const updated = orders.filter(o => o.id !== orderId)
  saveOrders(updated)
  return updated
}

// ── Treatments ──────────────────────────────────────────
export function getTreatments(): Treatment[] {
  if (typeof window === 'undefined') return MOCK_TREATMENTS
  const raw = localStorage.getItem(KEYS.treatments)
  if (!raw) { saveTreatments(MOCK_TREATMENTS); return MOCK_TREATMENTS }
  return JSON.parse(raw)
}
export function saveTreatments(treatments: Treatment[]) {
  localStorage.setItem(KEYS.treatments, JSON.stringify(treatments))
}
export function addTreatment(t: Omit<Treatment, 'id' | 'tenant_id' | 'created_at'>): Treatment[] {
  const treatments = getTreatments()
  const newT: Treatment = {
    ...t,
    id: `t-${Date.now()}`,
    tenant_id: 'local',
    created_at: new Date().toISOString(),
  }
  const updated = [...treatments, newT]
  saveTreatments(updated)
  return updated
}
export function updateTreatment(id: string, data: Partial<Treatment>): Treatment[] {
  const treatments = getTreatments()
  const updated = treatments.map(t => t.id === id ? { ...t, ...data } : t)
  saveTreatments(updated)
  return updated
}
export function deleteTreatment(id: string): Treatment[] {
  const treatments = getTreatments()
  const updated = treatments.filter(t => t.id !== id)
  saveTreatments(updated)
  return updated
}

// ── Customers ───────────────────────────────────────────
export function getCustomers(): Customer[] {
  if (typeof window === 'undefined') return MOCK_CUSTOMERS
  const raw = localStorage.getItem(KEYS.customers)
  if (!raw) { saveCustomers(MOCK_CUSTOMERS); return MOCK_CUSTOMERS }
  return JSON.parse(raw)
}
export function saveCustomers(customers: Customer[]) {
  localStorage.setItem(KEYS.customers, JSON.stringify(customers))
}
export function upsertCustomer(name: string, phone: string): { customer: Customer; customers: Customer[] } {
  const customers = getCustomers()
  const existing = customers.find(c =>
    c.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) {
    const updated = customers.map(c =>
      c.id === existing.id
        ? { ...c, phone: phone || c.phone, total_orders: c.total_orders + 1, last_order_at: new Date().toISOString() }
        : c
    )
    saveCustomers(updated)
    return { customer: updated.find(c => c.id === existing.id)!, customers: updated }
  }
  const newCustomer: Customer = {
    id: `c-${Date.now()}`,
    tenant_id: 'local',
    name,
    phone: phone || null,
    total_orders: 1,
    last_order_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
  const updated = [...customers, newCustomer]
  saveCustomers(updated)
  return { customer: newCustomer, customers: updated }
}

// ── Order code generator ─────────────────────────────────
export function nextOrderCode(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('shoeops_user') : null
  const token = stored ? (JSON.parse(stored).tenant_token ?? 'SHO-001') : 'SHO-001'
  // token bentuknya "CLN-001", prefix kode pesanan = token itu sendiri + nomor urut
  // contoh: CLN-001-0001, CLN-001-0002, dst
  const orders = getOrders()
  if (!orders.length) return `${token}-0001`
  const nums = orders
    .map(o => {
      const parts = o.order_code.split('-')
      return parseInt(parts[parts.length - 1])
    })
    .filter(n => !isNaN(n))
  if (!nums.length) return `${token}-0001`
  const next = Math.max(...nums) + 1
  return `${token}-${String(next).padStart(4, '0')}`
}

// ── Reset semua data ke mock ─────────────────────────────
export function resetAllData() {
  localStorage.removeItem(KEYS.orders)
  localStorage.removeItem(KEYS.treatments)
  localStorage.removeItem(KEYS.customers)
}

// ── Discounts ────────────────────────────────────────────
export interface Discount {
  id: string
  code: string           // kode promo, e.g. "HEMAT10"
  type: 'pct' | 'flat'  // persentase atau nominal
  value: number          // 10 = 10% atau 10000 = Rp10.000
  minOrder: number       // minimum pesanan
  maxUses: number | null // null = tidak terbatas
  usedCount: number
  active: boolean
  expiresAt: string | null
  createdAt: string
}

const DISC_KEY = 'shoeops_discounts'

const DEFAULT_DISCOUNTS: Discount[] = [
  { id: 'd1', code: 'HEMAT10', type: 'pct',  value: 10, minOrder: 50000,  maxUses: null, usedCount: 14, active: true,  expiresAt: null, createdAt: new Date().toISOString() },
  { id: 'd2', code: 'GRATIS5K', type: 'flat', value: 5000, minOrder: 0,   maxUses: 50,   usedCount: 23, active: true,  expiresAt: '2025-03-31T23:59:59Z', createdAt: new Date().toISOString() },
  { id: 'd3', code: 'LAUNCH20', type: 'pct',  value: 20, minOrder: 85000, maxUses: 100,  usedCount: 100,active: false, expiresAt: '2025-02-01T23:59:59Z', createdAt: new Date().toISOString() },
]

export function getDiscounts(): Discount[] {
  if (typeof window === 'undefined') return DEFAULT_DISCOUNTS
  const raw = localStorage.getItem(DISC_KEY)
  if (!raw) { saveDiscounts(DEFAULT_DISCOUNTS); return DEFAULT_DISCOUNTS }
  return JSON.parse(raw)
}
export function saveDiscounts(d: Discount[]) {
  localStorage.setItem(DISC_KEY, JSON.stringify(d))
}
export function addDiscount(d: Omit<Discount, 'id' | 'usedCount' | 'createdAt'>): Discount[] {
  const list = getDiscounts()
  const newD: Discount = { ...d, id: `d-${Date.now()}`, usedCount: 0, createdAt: new Date().toISOString() }
  const updated = [...list, newD]
  saveDiscounts(updated)
  return updated
}
export function updateDiscount(id: string, data: Partial<Discount>): Discount[] {
  const list = getDiscounts()
  const updated = list.map(d => d.id === id ? { ...d, ...data } : d)
  saveDiscounts(updated)
  return updated
}
export function deleteDiscount(id: string): Discount[] {
  const list = getDiscounts()
  const updated = list.filter(d => d.id !== id)
  saveDiscounts(updated)
  return updated
}
export function applyDiscount(code: string, orderTotal: number): { discount: Discount | null; saving: number; error: string } {
  const list = getDiscounts()
  const d = list.find(x => x.code.toUpperCase() === code.toUpperCase())
  if (!d) return { discount: null, saving: 0, error: 'Kode promo tidak ditemukan' }
  if (!d.active) return { discount: null, saving: 0, error: 'Kode promo sudah tidak aktif' }
  if (d.expiresAt && new Date(d.expiresAt) < new Date()) return { discount: null, saving: 0, error: 'Kode promo sudah kadaluarsa' }
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return { discount: null, saving: 0, error: 'Kuota promo sudah habis' }
  if (orderTotal < d.minOrder) return { discount: null, saving: 0, error: `Minimum pesanan ${d.minOrder.toLocaleString('id-ID')} untuk kode ini` }
  const saving = d.type === 'pct' ? Math.round(orderTotal * d.value / 100) : d.value
  return { discount: d, saving, error: '' }
}
export function useDiscountCode(id: string): void {
  const list = getDiscounts()
  const updated = list.map(d => d.id === id ? { ...d, usedCount: d.usedCount + 1 } : d)
  saveDiscounts(updated)
}