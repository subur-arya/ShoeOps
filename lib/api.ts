// ─────────────────────────────────────────────────────────────
// lib/api.ts — Data layer: Supabase jika tersedia, fallback localStorage
// ─────────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/client'
import * as local from '@/lib/store'
import type { OrderWithDetails, OrderStatus, Treatment, Customer } from '@/types'
import type { Discount } from '@/lib/store'

// Cek runtime — bukan build time
function isSupabaseEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && url.includes('.supabase.co'))
}

function supabase() { return createClient() }

function getTenantId(): string {
  if (typeof window === 'undefined') return ''
  const raw = localStorage.getItem('shoeops_user')
  if (!raw) return ''
  try { return JSON.parse(raw).tenant_id ?? '' } catch { return '' }
}

function getUserName(): string {
  if (typeof window === 'undefined') return ''
  const raw = localStorage.getItem('shoeops_user')
  if (!raw) return ''
  try {
    const u = JSON.parse(raw)
    const name = u.name ?? ''
    const role = u.role === 'owner' ? 'Owner' : u.role === 'operasional' ? 'Operasional' : ''
    return name ? `${name} (${role})` : role
  } catch { return '' }
}

// ── ORDER CODE GENERATOR ─────────────────────────────────────

export async function nextOrderCodeFromDB(): Promise<string> {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('shoeops_user') : null
  const token = stored ? (JSON.parse(stored).tenant_token ?? 'SHO-001') : 'SHO-001'

  if (!isSupabaseEnabled()) return local.nextOrderCode()

  try {
    const tenantId = getTenantId()
    // Ambil order terakhir berdasarkan order_code untuk nomor urut
    const { data } = await supabase()
      .from('orders')
      .select('order_code')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!data || data.length === 0) return `${token}-0001`

    const nums = data
      .map((o: any) => {
        const parts = o.order_code.split('-')
        return parseInt(parts[parts.length - 1])
      })
      .filter((n: number) => !isNaN(n))

    if (!nums.length) return `${token}-0001`
    const next = Math.max(...nums) + 1
    return `${token}-${String(next).padStart(4, '0')}`
  } catch (e) {
    console.error('[nextOrderCodeFromDB] error:', e)
    return local.nextOrderCode()
  }
}

// ── ORDERS ────────────────────────────────────────────────────

export async function fetchOrders(): Promise<OrderWithDetails[]> {
  if (!isSupabaseEnabled()) return local.getOrders()
  try {
    const tenantId = getTenantId()
    let query = supabase()
      .from('orders')
      .select('*, customers(*), order_items(*)')
      .order('created_at', { ascending: false })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as OrderWithDetails[]
  } catch (e) {
    console.error('[fetchOrders] Supabase error, fallback ke localStorage:', e)
    return local.getOrders()
  }
}

export async function createOrder(order: OrderWithDetails): Promise<OrderWithDetails[]> {
  if (!isSupabaseEnabled()) return local.addOrder(order)

  const tenantId = getTenantId()
  if (!tenantId) {
    console.error('[createOrder] tenant_id kosong, fallback ke localStorage')
    return local.addOrder(order)
  }

  try {
    // Upsert customer
    let customerId = order.customer_id

    const { data: custData, error: custErr } = await supabase()
      .from('customers')
      .upsert({
        tenant_id: tenantId,
        name: order.customers.name,
        phone: order.customers.phone ?? null,
      }, { onConflict: 'tenant_id,name' })
      .select('id')
      .single()

    if (custErr || !custData) {
      console.error('[createOrder] upsert customer error:', custErr)
      // Coba insert biasa kalau upsert gagal
      const { data: insertCust } = await supabase()
        .from('customers')
        .insert({ tenant_id: tenantId, name: order.customers.name, phone: order.customers.phone ?? null })
        .select('id')
        .single()
      if (insertCust) customerId = insertCust.id
    } else {
      customerId = custData.id
    }

    // Insert order
    const { data: orderData, error: orderErr } = await supabase()
      .from('orders')
      .insert({
        tenant_id: tenantId,
        order_code: order.order_code,
        customer_id: customerId,
        status: order.status,
        total_price: order.total_price,
        notes: order.notes ?? null,
        estimated_done_at: order.estimated_done_at ?? null,
        payment_method: order.payment_method ?? 'cash',
        amount_paid: order.amount_paid ?? order.total_price,
        shoe_type:  order.shoe_type  ?? null,
        shoe_brand: order.shoe_brand ?? null,
        shoe_color: order.shoe_color ?? null,
      })
      .select('id')
      .single()

    if (orderErr || !orderData) {
      console.error('[createOrder] insert order error:', orderErr)
      return local.addOrder(order)
    }

    // Insert order items
    const { error: itemsErr } = await supabase()
      .from('order_items')
      .insert(order.order_items.map(item => ({
        order_id: orderData.id,
        treatment_id: item.treatment_id,
        treatment_name: item.treatment_name,
        price: item.price,
        quantity: item.quantity,
      })))
    if (itemsErr) console.error('[createOrder] insert items error:', itemsErr)

    // Update customer stats
    await supabase()
      .from('customers')
      .update({ total_orders: (order.customers.total_orders ?? 0) + 1, last_order_at: new Date().toISOString() })
      .eq('id', customerId)

    console.log('[createOrder] ✅ Berhasil simpan ke Supabase:', order.order_code)

    // Auto-kurang stok bahan baku
    const treatmentId = order.order_items?.[0]?.treatment_id
    if (treatmentId) {
      deductStockForOrder(orderData.id, treatmentId).catch(e => console.warn('[deductStock]', e))
    }
    return fetchOrders()

  } catch (e) {
    console.error('[createOrder] Unexpected error, fallback ke localStorage:', e)
    return local.addOrder(order)
  }
}

export async function changeOrderStatus(orderId: string, status: OrderStatus): Promise<OrderWithDetails[]> {
  if (!isSupabaseEnabled()) return local.updateOrderStatus(orderId, status)
  try {
    const { error } = await supabase()
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) throw error
    return fetchOrders()
  } catch (e) {
    console.error('[changeOrderStatus] error:', e)
    return local.updateOrderStatus(orderId, status)
  }
}

export async function removeOrder(orderId: string): Promise<OrderWithDetails[]> {
  if (!isSupabaseEnabled()) return local.deleteOrder(orderId)
  try {
    const { error } = await supabase().from('orders').delete().eq('id', orderId)
    if (error) throw error
    return fetchOrders()
  } catch (e) {
    console.error('[removeOrder] error:', e)
    return local.deleteOrder(orderId)
  }
}

export async function fetchOrderByCode(code: string): Promise<OrderWithDetails | null> {
  if (!isSupabaseEnabled()) {
    return local.getOrders().find(o => o.order_code === code) ?? null
  }
  try {
    const { data, error } = await supabase()
      .from('orders')
      .select('*, customers(*), order_items(*)')
      .eq('order_code', code)
      .single()
    if (error) throw error
    return data as OrderWithDetails
  } catch {
    return null
  }
}

// ── TREATMENTS ───────────────────────────────────────────────

export async function fetchTreatments(): Promise<Treatment[]> {
  if (!isSupabaseEnabled()) return local.getTreatments()
  try {
    const tenantId = getTenantId()
    let query = supabase()
      .from('treatments')
      .select('*')
      .order('created_at')
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Treatment[]
  } catch (e) {
    console.error('[fetchTreatments] error:', e)
    return local.getTreatments()
  }
}

export async function createTreatment(t: Omit<Treatment, 'id' | 'tenant_id' | 'created_at'>): Promise<Treatment[]> {
  if (!isSupabaseEnabled()) return local.addTreatment(t)
  try {
    const { error } = await supabase().from('treatments').insert({ ...t, tenant_id: getTenantId() })
    if (error) throw error
    return fetchTreatments()
  } catch (e) {
    console.error('[createTreatment] error:', e)
    return local.addTreatment(t)
  }
}

export async function editTreatment(id: string, data: Partial<Treatment>): Promise<Treatment[]> {
  if (!isSupabaseEnabled()) return local.updateTreatment(id, data)
  try {
    const { error } = await supabase().from('treatments').update(data).eq('id', id)
    if (error) throw error
    return fetchTreatments()
  } catch (e) {
    console.error('[editTreatment] error:', e)
    return local.updateTreatment(id, data)
  }
}

export async function removeTreatment(id: string): Promise<Treatment[]> {
  if (!isSupabaseEnabled()) return local.deleteTreatment(id)
  try {
    const { error } = await supabase().from('treatments').delete().eq('id', id)
    if (error) throw error
    return fetchTreatments()
  } catch (e) {
    console.error('[removeTreatment] error:', e)
    return local.deleteTreatment(id)
  }
}

// ── CUSTOMERS ─────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  if (!isSupabaseEnabled()) return local.getCustomers()
  try {
    const tenantId = getTenantId()
    let query = supabase()
      .from('customers')
      .select('*')
      .order('total_orders', { ascending: false })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Customer[]
  } catch (e) {
    console.error('[fetchCustomers] error:', e)
    return local.getCustomers()
  }
}

// ── PENGATURAN TOKO (TENANT) ──────────────────────────────────

export async function fetchTenantSettings(): Promise<{ name: string; phone: string; addr: string; targetHarian: number; targetBulanan: number; targetPesanan: number; targetCustomer: number; logoUrl: string | null; activeUntil: string | null } | null> {
  const cached = typeof window !== 'undefined' ? localStorage.getItem('shoeops_store_info') : null
  const fallback = cached ? JSON.parse(cached) : null

  if (!isSupabaseEnabled()) return fallback

  try {
    const tenantId = getTenantId()
    if (!tenantId) return fallback
    const { data, error } = await supabase()
      .from('tenants')
      .select('name, wa_number, address, target_harian, target_bulanan, target_pesanan_bulanan, target_customer_bulanan, logo_url, active_until')
      .eq('id', tenantId)
      .single()
    if (error) throw error
    const result = {
      name:            data.name                    ?? '',
      phone:           data.wa_number               ?? '',
      addr:            data.address                 ?? '',
      targetHarian:    data.target_harian           ?? 0,
      targetBulanan:   data.target_bulanan          ?? 0,
      targetPesanan:   data.target_pesanan_bulanan  ?? 0,
      targetCustomer:  data.target_customer_bulanan ?? 0,
      logoUrl:         data.logo_url                ?? null,
      activeUntil:     data.active_until            ?? null,
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('shoeops_store_info', JSON.stringify(result))
    }
    return result
  } catch (e) {
    console.error('[fetchTenantSettings] error, pakai cache:', e)
    return fallback
  }
}

export async function saveTenantSettings(settings: { name: string; phone: string; addr: string; targetHarian: number; targetBulanan: number; targetPesanan: number; targetCustomer: number; logoUrl?: string | null }): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shoeops_store_info', JSON.stringify(settings))
  }
  if (!isSupabaseEnabled()) return
  try {
    const tenantId = getTenantId()
    const { error } = await supabase()
      .from('tenants')
      .update({
        name:                     settings.name,
        wa_number:                settings.phone,
        address:                  settings.addr,
        target_harian:            settings.targetHarian,
        target_bulanan:           settings.targetBulanan,
        target_pesanan_bulanan:   settings.targetPesanan,
        target_customer_bulanan:  settings.targetCustomer,
        logo_url:                 settings.logoUrl ?? null,
      })
      .eq('id', tenantId)
    if (error) throw error
    console.log('[saveTenantSettings] ✅ Tersimpan ke Supabase')
  } catch (e) {
    console.error('[saveTenantSettings] error:', e)
  }
}

export async function fetchDiscounts(): Promise<Discount[]> {
  if (!isSupabaseEnabled()) return local.getDiscounts()
  try {
    const tenantId = getTenantId()
    const { data, error } = await supabase()
      .from('discounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at')
    if (error) throw error
    // Map snake_case Supabase → camelCase lokal
    return (data ?? []).map((d: any) => ({
      id:         d.id,
      code:       d.code,
      type:       d.type,
      value:      d.value,
      minOrder:   d.min_order,
      maxUses:    d.max_uses,
      usedCount:  d.used_count,
      active:     d.active,
      expiresAt:  d.expires_at,
      createdAt:  d.created_at,
    })) as Discount[]
  } catch (e) {
    console.error('[fetchDiscounts] error:', e)
    return local.getDiscounts()
  }
}

export async function saveDiscount(d: Omit<Discount, 'id' | 'usedCount' | 'createdAt'>): Promise<Discount[]> {
  if (!isSupabaseEnabled()) return local.addDiscount(d)
  try {
    const tenantId = getTenantId()
    const { error } = await supabase().from('discounts').insert({
      tenant_id:  tenantId,
      code:       d.code.toUpperCase(),
      type:       d.type,
      value:      d.value,
      min_order:  d.minOrder,
      max_uses:   d.maxUses,
      active:     d.active,
      expires_at: d.expiresAt,
    })
    if (error) throw error
    return fetchDiscounts()
  } catch (e) {
    console.error('[saveDiscount] error:', e)
    return local.addDiscount(d)
  }
}

export async function editDiscount(id: string, d: Partial<Discount>): Promise<Discount[]> {
  if (!isSupabaseEnabled()) return local.updateDiscount(id, d)
  try {
    const patch: any = {}
    if (d.code       !== undefined) patch.code       = d.code
    if (d.type       !== undefined) patch.type       = d.type
    if (d.value      !== undefined) patch.value      = d.value
    if (d.minOrder   !== undefined) patch.min_order  = d.minOrder
    if (d.maxUses    !== undefined) patch.max_uses   = d.maxUses
    if (d.active     !== undefined) patch.active     = d.active
    if (d.expiresAt  !== undefined) patch.expires_at = d.expiresAt
    if (d.usedCount  !== undefined) patch.used_count = d.usedCount
    const { error } = await supabase().from('discounts').update(patch).eq('id', id)
    if (error) throw error
    return fetchDiscounts()
  } catch (e) {
    console.error('[editDiscount] error:', e)
    return local.updateDiscount(id, d)
  }
}

export async function removeDiscount(id: string): Promise<Discount[]> {
  if (!isSupabaseEnabled()) return local.deleteDiscount(id)
  try {
    const { error } = await supabase().from('discounts').delete().eq('id', id)
    if (error) throw error
    return fetchDiscounts()
  } catch (e) {
    console.error('[removeDiscount] error:', e)
    return local.deleteDiscount(id)
  }
}

export function checkDiscount(code: string, orderTotal: number) {
  return local.applyDiscount(code, orderTotal)
}

export async function redeemDiscount(id: string): Promise<void> {
  if (!isSupabaseEnabled()) { local.useDiscountCode(id); return }
  try {
    const { data } = await supabase()
      .from('discounts')
      .select('used_count')
      .eq('id', id)
      .single()
    if (data) {
      await supabase()
        .from('discounts')
        .update({ used_count: (data.used_count ?? 0) + 1 })
        .eq('id', id)
    }
  } catch (e) {
    console.error('[redeemDiscount] error:', e)
    local.useDiscountCode(id)
  }
}

// ── TENANT BY ORDER CODE (untuk cek-pesanan multi-toko) ───────

export async function fetchTenantByOrderCode(code: string): Promise<{ name: string; phone: string; addr: string; logoUrl: string | null; tenantId: string | null } | null> {
  if (!isSupabaseEnabled()) {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('shoeops_store_info') : null
    return cached ? { ...JSON.parse(cached), tenantId: null } : null
  }
  try {
    const { data: order, error: orderErr } = await supabase()
      .from('orders')
      .select('tenant_id')
      .eq('order_code', code)
      .single()
    if (orderErr || !order) return null

    const { data: tenant, error: tenantErr } = await supabase()
      .from('tenants')
      .select('name, wa_number, address, logo_url')
      .eq('id', order.tenant_id)
      .single()
    if (tenantErr || !tenant) return null

    return {
      name:     tenant.name       ?? '',
      phone:    tenant.wa_number  ?? '',
      addr:     tenant.address    ?? '',
      logoUrl:  tenant.logo_url   ?? null,
      tenantId: order.tenant_id,
    }
  } catch (e) {
    console.error('[fetchTenantByOrderCode] error:', e)
    return null
  }
}

// ── MATERIALS ─────────────────────────────────────────────────

export async function fetchMaterials(): Promise<import('../types').Material[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('materials').select('*').order('name')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchMaterials]', e); return [] }
}

export async function saveMaterial(m: { name: string; unit: string; stock: number; min_stock: number; cost_per_unit: number }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('materials').insert({ ...m, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function editMaterial(id: string, updates: Partial<{ name: string; unit: string; stock: number; min_stock: number; cost_per_unit: number }>) {
  const { data, error } = await supabase().from('materials').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeMaterial(id: string) {
  await supabase().from('materials').delete().eq('id', id)
}

export async function stockIn(materialId: string, qty: number, note: string, totalPrice?: number) {
  const tenantId = getTenantId()
  const changedBy = getUserName()

  // Update stok
  const { data: mat } = await supabase().from('materials').select('stock, name, unit').eq('id', materialId).single()
  const newStock = (mat?.stock ?? 0) + qty
  await supabase().from('materials').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', materialId)

  // Log masuk
  await supabase().from('stock_logs').insert({ tenant_id: tenantId, material_id: materialId, type: 'in', qty, note, changed_by: changedBy })

  // Auto-delete log lama di atas 30 per material
  const { data: allLogs } = await supabase().from('stock_logs').select('id, created_at').eq('tenant_id', tenantId).eq('material_id', materialId).order('created_at', { ascending: false })
  if (allLogs && allLogs.length > 30) {
    const toDelete = allLogs.slice(30).map((l: any) => l.id)
    await supabase().from('stock_logs').delete().in('id', toDelete)
  }

  // Catat sebagai pengeluaran jika ada harga
  if (totalPrice && totalPrice > 0) {
    const matName = mat?.name ?? 'Bahan baku'

    // Cari atau buat kategori "Stok Bahan Baku" otomatis
    let categoryId: string | null = null
    const { data: existCat } = await supabase()
      .from('expense_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', 'Stok Bahan Baku')
      .single()
    if (existCat) {
      categoryId = existCat.id
    } else {
      const { data: newCat } = await supabase()
        .from('expense_categories')
        .insert({ tenant_id: tenantId, name: 'Stok Bahan Baku', color: '#16a34a' })
        .select('id')
        .single()
      if (newCat) categoryId = newCat.id
    }

    await supabase().from('expenses').insert({
      tenant_id: tenantId,
      name: `Pembelian stok: ${matName} (${qty} ${mat?.unit ?? 'unit'})`,
      amount: totalPrice,
      date: new Date().toISOString().slice(0, 10),
      category_id: categoryId,
      notes: note || null,
    })
  }
}

export async function stockAdjust(materialId: string, newStock: number, note: string) {
  const tenantId = getTenantId()
  const changedBy = getUserName()
  const { data: mat } = await supabase().from('materials').select('stock').eq('id', materialId).single()
  const diff = newStock - (mat?.stock ?? 0)
  await supabase().from('materials').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', materialId)
  await supabase().from('stock_logs').insert({ tenant_id: tenantId, material_id: materialId, type: 'adjust', qty: diff, note, changed_by: changedBy })

  // Auto-delete log lama di atas 30 per material
  const { data: allLogs } = await supabase().from('stock_logs').select('id, created_at').eq('tenant_id', tenantId).eq('material_id', materialId).order('created_at', { ascending: false })
  if (allLogs && allLogs.length > 30) {
    const toDelete = allLogs.slice(30).map((l: any) => l.id)
    await supabase().from('stock_logs').delete().in('id', toDelete)
  }
}

export async function fetchStockLogs(materialId?: string): Promise<import('../types').StockLog[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('stock_logs').select('*, material:materials(name,unit)').order('created_at', { ascending: false }).limit(30)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (materialId) q = q.eq('material_id', materialId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchStockLogs]', e); return [] }
}

// ── MATERIAL USAGES ───────────────────────────────────────────

export async function fetchMaterialUsages(treatmentId?: string): Promise<import('../types').MaterialUsage[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('material_usages').select('*, material:materials(name,unit,stock)')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (treatmentId) q = q.eq('treatment_id', treatmentId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchMaterialUsages]', e); return [] }
}

export async function saveMaterialUsage(u: { treatment_id: string; material_id: string; deduct_type: 'qty' | 'pct'; deduct_value: number }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('material_usages')
    .upsert({ ...u, tenant_id: tenantId }, { onConflict: 'treatment_id,material_id' })
    .select().single()
  if (error) throw error
  return data
}

export async function removeMaterialUsage(id: string) {
  await supabase().from('material_usages').delete().eq('id', id)
}

// Auto-kurang stok saat pesanan dibuat
export async function deductStockForOrder(orderId: string, treatmentId: string) {
  try {
    const tenantId = getTenantId()
    const usages = await fetchMaterialUsages(treatmentId)
    for (const u of usages) {
      const { data: mat } = await supabase().from('materials').select('stock').eq('id', u.material_id).single()
      if (!mat) continue
      const deduct = u.deduct_type === 'qty'
        ? u.deduct_value
        : Math.round((u.deduct_value / 100) * mat.stock * 100) / 100
      const newStock = Math.max(0, mat.stock - deduct)
      await supabase().from('materials').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', u.material_id)
      await supabase().from('stock_logs').insert({
        tenant_id: tenantId, material_id: u.material_id,
        type: 'out', qty: -deduct, order_id: orderId,
        note: `Auto dari pesanan`
      })
    }
  } catch (e) { console.error('[deductStockForOrder]', e) }
}

// ── RECEIPT CONFIG ────────────────────────────────────────────

export interface ReceiptConfig {
  // Kertas
  paperWidth: '58mm' | '80mm'
  // Font
  fontFamily: 'monospace' | 'sans-serif'
  fontSizeBase: number       // px, default 12
  // Header
  showLogo: boolean
  showStoreName: boolean
  showStoreToken: boolean
  showStoreAddress: boolean
  showStorePhone: boolean
  headerText: string         // teks tambahan di bawah nama toko
  // Sections
  showPrintTime: boolean
  showOrderCode: boolean
  showEstDate: boolean
  showCustomer: boolean
  showCustomerPhone: boolean
  showShoeDetail: boolean
  showTreatment: boolean
  showDiscount: boolean
  showNotes: boolean
  showPayment: boolean
  showStatus: boolean
  // Footer
  footerText: string         // custom teks footer
  showQR: boolean
  showOrderCodeFooter: boolean
  // Struktur — urutan section
  sectionOrder: string[]
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  paperWidth: '80mm',
  fontFamily: 'monospace',
  fontSizeBase: 12,
  showLogo: true,
  showStoreName: true,
  showStoreToken: true,
  showStoreAddress: true,
  showStorePhone: true,
  headerText: '',
  showPrintTime: true,
  showOrderCode: true,
  showEstDate: true,
  showCustomer: true,
  showCustomerPhone: true,
  showShoeDetail: true,
  showTreatment: true,
  showDiscount: true,
  showNotes: true,
  showPayment: true,
  showStatus: true,
  footerText: 'Terima kasih telah mempercayakan perawatan sepatu Anda kepada kami!',
  showQR: true,
  showOrderCodeFooter: true,
  sectionOrder: ['header', 'meta', 'customer', 'shoe', 'treatment', 'payment', 'status', 'footer'],
}

export async function fetchReceiptConfig(): Promise<ReceiptConfig> {
  try {
    const tenantId = getTenantId()
    if (!tenantId) return DEFAULT_RECEIPT_CONFIG
    const { data, error } = await supabase()
      .from('tenants').select('receipt_config').eq('id', tenantId).single()
    if (error || !data?.receipt_config) return DEFAULT_RECEIPT_CONFIG
    return { ...DEFAULT_RECEIPT_CONFIG, ...data.receipt_config }
  } catch { return DEFAULT_RECEIPT_CONFIG }
}

export async function saveReceiptConfig(config: ReceiptConfig): Promise<void> {
  const tenantId = getTenantId()
  await supabase().from('tenants').update({ receipt_config: config }).eq('id', tenantId)
}

// ── EXPENSES ─────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string
  tenant_id: string
  name: string
  color: string
  created_at: string
}

export interface Expense {
  id: string
  tenant_id: string
  category_id: string | null
  name: string
  amount: number
  date: string
  notes: string | null
  created_at: string
  category?: ExpenseCategory
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('expense_categories').select('*').order('name')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchExpenseCategories]', e); return [] }
}

export async function saveExpenseCategory(c: { name: string; color: string }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('expense_categories').insert({ ...c, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function removeExpenseCategory(id: string) {
  await supabase().from('expense_categories').delete().eq('id', id)
}

export async function fetchExpenses(from?: string, to?: string): Promise<Expense[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('expenses').select('*, category:expense_categories(id,name,color)').order('date', { ascending: false }).order('created_at', { ascending: false })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (from) q = q.gte('date', from)
    if (to)   q = q.lte('date', to)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchExpenses]', e); return [] }
}

export async function saveExpense(e: { name: string; amount: number; date: string; category_id: string | null; notes: string }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('expenses').insert({ ...e, tenant_id: tenantId }).select('*, category:expense_categories(id,name,color)').single()
  if (error) throw error
  return data
}

export async function editExpense(id: string, e: { name: string; amount: number; date: string; category_id: string | null; notes: string }) {
  const { data, error } = await supabase().from('expenses').update(e).eq('id', id).select('*, category:expense_categories(id,name,color)').single()
  if (error) throw error
  return data
}

export async function removeExpense(id: string) {
  await supabase().from('expenses').delete().eq('id', id)
}

// ── EQUIPMENT ────────────────────────────────────────────────

export interface Equipment {
  id: string
  tenant_id: string
  name: string
  brand: string | null
  condition: 'baru' | 'baik' | 'perlu_servis' | 'rusak'
  purchase_date: string | null
  purchase_price: number
  estimated_lifetime_months: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EquipmentLog {
  id: string
  tenant_id: string
  equipment_id: string
  type: 'pembelian' | 'servis' | 'perbaikan' | 'penggantian' | 'lainnya'
  amount: number
  date: string
  notes: string | null
  created_at: string
  equipment?: Equipment
}

export interface EquipmentUsage {
  id: string
  tenant_id: string
  equipment_id: string
  treatment_id: string
  equipment?: Equipment
  treatment?: { id: string; name: string; price: number }
}

export async function fetchEquipment(): Promise<Equipment[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('equipment').select('*').order('name')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchEquipment]', e); return [] }
}

export async function saveEquipment(e: { name: string; brand: string; condition: string; purchase_date: string; purchase_price: number; estimated_lifetime_months: number; notes: string }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('equipment').insert({ ...e, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function editEquipment(id: string, e: Partial<{ name: string; brand: string; condition: string; purchase_date: string; purchase_price: number; estimated_lifetime_months: number; notes: string }>) {
  const { data, error } = await supabase().from('equipment').update({ ...e, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeEquipment(id: string) {
  await supabase().from('equipment').delete().eq('id', id)
}

export async function fetchEquipmentLogs(equipmentId?: string): Promise<EquipmentLog[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('equipment_logs').select('*, equipment:equipment(id,name,brand)').order('date', { ascending: false }).order('created_at', { ascending: false })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (equipmentId) q = q.eq('equipment_id', equipmentId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchEquipmentLogs]', e); return [] }
}

export async function saveEquipmentLog(l: { equipment_id: string; type: string; amount: number; date: string; notes: string }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('equipment_logs').insert({ ...l, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function removeEquipmentLog(id: string) {
  await supabase().from('equipment_logs').delete().eq('id', id)
}

export async function fetchEquipmentUsages(equipmentId?: string): Promise<EquipmentUsage[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('equipment_usages').select('*, equipment:equipment(id,name), treatment:treatments(id,name,price)')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (equipmentId) q = q.eq('equipment_id', equipmentId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchEquipmentUsages]', e); return [] }
}

export async function saveEquipmentUsage(u: { equipment_id: string; treatment_id: string }) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('equipment_usages').insert({ ...u, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function removeEquipmentUsage(id: string) {
  await supabase().from('equipment_usages').delete().eq('id', id)
}

// ── ORDER STATUSES (custom per tenant) ────────────────────────

export interface OrderStatusConfig {
  id: string
  tenant_id: string
  key: string
  label: string
  description: string | null
  color: string
  icon: string
  sort_order: number
  is_final: boolean
  created_at: string
}

export interface OrderStatusLog {
  id: string
  tenant_id: string
  order_id: string
  status_key: string
  status_label: string
  notes: string | null
  changed_by: string | null
  created_at: string
}

export const DEFAULT_ORDER_STATUSES: Omit<OrderStatusConfig, 'id' | 'tenant_id' | 'created_at'>[] = [
  { key: 'diterima',  label: 'Diterima',        description: 'Pesanan baru masuk',               color: '#2563eb', icon: '📥', sort_order: 0, is_final: false },
  { key: 'diproses',  label: 'Sedang Diproses',  description: 'Sepatu sedang dikerjakan',         color: '#d97706', icon: '⚙️', sort_order: 1, is_final: false },
  { key: 'selesai',   label: 'Selesai',           description: 'Pekerjaan selesai, siap diambil', color: '#16a34a', icon: '✅', sort_order: 2, is_final: false },
  { key: 'diantar',   label: 'Sedang Diantar',   description: 'Sepatu dalam pengiriman',          color: '#ea580c', icon: '🚚', sort_order: 3, is_final: true  },
]

export async function fetchOrderStatuses(): Promise<OrderStatusConfig[]> {
  try {
    const tenantId = getTenantId()
    let q = supabase().from('order_statuses').select('*').order('sort_order')
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchOrderStatuses]', e); return [] }
}

export async function saveOrderStatus(s: Omit<OrderStatusConfig, 'id' | 'tenant_id' | 'created_at'>) {
  const tenantId = getTenantId()
  const { data, error } = await supabase().from('order_statuses').insert({ ...s, tenant_id: tenantId }).select().single()
  if (error) throw error
  return data
}

export async function editOrderStatus(id: string, s: Partial<Omit<OrderStatusConfig, 'id' | 'tenant_id' | 'created_at'>>) {
  const { data, error } = await supabase().from('order_statuses').update(s).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeOrderStatus(id: string) {
  await supabase().from('order_statuses').delete().eq('id', id)
}

export async function initDefaultOrderStatuses() {
  const tenantId = getTenantId()
  const rows = DEFAULT_ORDER_STATUSES.map(s => ({ ...s, tenant_id: tenantId }))
  const { error } = await supabase().from('order_statuses').insert(rows)
  if (error) throw error
}

export async function fetchOrderStatusLogs(orderId: string): Promise<OrderStatusLog[]> {
  try {
    const { data, error } = await supabase()
      .from('order_status_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchOrderStatusLogs]', e); return [] }
}

export async function logOrderStatusChange(l: { order_id: string; status_key: string; status_label: string; notes?: string; changed_by?: string }) {
  const tenantId = getTenantId()
  const { error } = await supabase().from('order_status_logs').insert({ ...l, tenant_id: tenantId })
  if (error) console.error('[logOrderStatusChange]', error)
}

export async function fetchOrderStatusesByTenantId(tenantId: string): Promise<OrderStatusConfig[]> {
  try {
    const { data, error } = await supabase()
      .from('order_statuses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
    if (error) throw error
    return data ?? []
  } catch (e) { console.error('[fetchOrderStatusesByTenantId]', e); return [] }
}