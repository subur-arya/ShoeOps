'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { Toast, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDate } from '@/lib/utils'
import {
  fetchTreatments, fetchCustomers, createOrder,
  fetchDiscounts, redeemDiscount,
  nextOrderCodeFromDB, fetchTenantSettings, fetchOrderByCode,
  fetchReceiptConfig, DEFAULT_RECEIPT_CONFIG, type ReceiptConfig
} from '@/lib/api'
import type { Treatment, Customer, OrderWithDetails } from '@/types'
import { Search, Tag, CheckCircle, XCircle, ChevronDown, Printer, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Cash' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'qris',     label: 'QRIS' },
]

export default function InputPesananPage() {
  const router = useRouter()
  const { toast, show, hide } = useToast()

  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [customers,  setCustomers]  = useState<Customer[]>([])

  // Form state
  const [custName,    setCustName]    = useState('')
  const [custPhone,   setCustPhone]   = useState('')
  const [estDate,     setEstDate]     = useState('')
  const [notes,       setNotes]       = useState('')

  // Tiap pair = 1 pasang sepatu + treatment
  type ShoePair = {
    id: string
    brand: string
    type: string
    color: string
    treatId: string
    qty: number
  }
  const newPair = (): ShoePair => ({ id: crypto.randomUUID(), brand: '', type: '', color: '', treatId: '', qty: 1 })
  const [pairs, setPairs] = useState<ShoePair[]>([newPair()])

  function addPair() { setPairs(prev => [...prev, newPair()]) }
  function removePair(id: string) { setPairs(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev) }
  function updatePair(id: string, field: keyof ShoePair, val: string | number) {
    setPairs(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
    if (field === 'treatId') clearPromo()
  }

  const validPairs  = pairs.filter(p => p.treatId)
  const firstTreatId = pairs[0]?.treatId ?? ''

  // Pembayaran
  const [payMethod,   setPayMethod]   = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [amountPaid,  setAmountPaid]  = useState('')

  // Promo
  const [promoCode,    setPromoCode]    = useState('')
  const [promoResult,  setPromoResult]  = useState<{ saving: number; error: string; discountId: string } | null>(null)
  const [promoChecked, setPromoChecked] = useState(false)

  // Print
  const [printAfterSave, setPrintAfterSave] = useState(true)
  const [storeName,  setStoreName]  = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeAddr,  setStoreAddr]  = useState('')
  const [storeToken, setStoreToken] = useState('')
  const [logoUrl,    setLogoUrl]    = useState<string | null>(null)
  const [receiptCfg, setReceiptCfg] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG)

  async function printReceipt(order: OrderWithDetails, info: { storeName: string; storePhone: string; storeAddr: string; storeToken: string; logoUrl: string | null }, cfg: ReceiptConfig = DEFAULT_RECEIPT_CONFIG) {
    const items   = order.order_items ?? []
    const subtotal = items.length > 0
      ? items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0)
      : order.total_price
    const discount   = subtotal > order.total_price ? subtotal - order.total_price : 0
    const amountPaid = order.amount_paid ?? order.total_price
    const change     = order.payment_method === 'cash' && amountPaid > order.total_price ? amountPaid - order.total_price : 0
    const payLabel   = order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'transfer' ? 'Transfer Bank' : order.payment_method === 'qris' ? 'QRIS' : '-'
    const printTime  = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    const baseUrl    = window.location.origin
    const cekUrl     = `${baseUrl}/cek-pesanan?kode=${order.order_code}`

    // Generate QR sebagai base64 — tidak butuh CDN, jalan di localhost sekalipun
    let qrDataUrl = ''
    try {
      const QRCode = (await import('qrcode')).default
      qrDataUrl = await QRCode.toDataURL(cekUrl, { width: 80, margin: 1, color: { dark: '#000', light: '#fff' } })
    } catch (e) {
      console.warn('QR gagal:', e)
    }
    const qrHtml = qrDataUrl
      ? `<img src="${qrDataUrl}" style="width:80px;height:80px;display:block;margin:4px auto">`
      : `<div style="font-size:9px">${cekUrl}</div>`

    const fs  = cfg.fontSizeBase
    const ff  = cfg.fontFamily === 'monospace' ? 'Courier New,Courier,monospace' : 'system-ui,sans-serif'
    const pw  = cfg.paperWidth === '58mm' ? '54mm' : '72mm'
    const hr  = `<div style="border-top:1px solid #000;margin:5px 0"></div>`
    const hrd = `<div style="border-top:1px dashed #000;margin:5px 0"></div>`
    const row = (l: string, r: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;gap:8px;font-weight:${bold ? 700 : 400};font-size:${fs-1}px;margin-bottom:1px"><span style="flex-shrink:0">${l}</span><span style="text-align:right">${r}</span></div>`

    const itemsHtml = items.length > 0
      ? items.map(item => {
          const [treatName, shoeInfo] = item.treatment_name.split('||')
          return `
          <div style="margin-bottom:8px">
            <div style="font-weight:600;font-size:${fs}px">${treatName}</div>
            ${shoeInfo ? `<div style="font-size:${fs-2}px;color:#555;padding-left:8px;margin-bottom:2px">${shoeInfo}</div>` : ''}
            <div style="display:flex;justify-content:space-between;padding-left:8px;font-size:${fs-2}px">
              <span>${item.quantity || 1}x @ ${formatRupiah(Number(item.price))}</span>
              <span>${formatRupiah(Number(item.price) * Number(item.quantity || 1))}</span>
            </div>
          </div>`
        }).join('')
      : `<div style="display:flex;justify-content:space-between;padding-left:8px;margin-bottom:6px;font-size:${fs}px"><span>1x treatment</span><span>${formatRupiah(order.total_price)}</span></div>`

    // Hanya tampil section DETAIL SEPATU untuk pesanan lama (tanpa format baru ||)
    const hasNewFormat = items.some(i => i.treatment_name.includes('||'))

    // Build sections sesuai urutan config
    const sectionHtml: Record<string, string> = {
      header: `
        <div style="text-align:center;margin-bottom:8px">
          ${cfg.showLogo && info.logoUrl ? `<img src="${info.logoUrl}" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 6px">` : ''}
          ${cfg.showStoreName ? `<div style="font-size:${fs+3}px;font-weight:900;letter-spacing:3px;text-transform:uppercase">${info.storeName || 'SHOEOPS'}</div>` : ''}
          ${cfg.showStoreToken && info.storeToken ? `<div style="font-size:${fs-2}px;letter-spacing:1px">${info.storeToken}</div>` : ''}
          ${cfg.showStoreAddress && info.storeAddr  ? `<div style="font-size:${fs-2}px;margin-top:2px">${info.storeAddr}</div>` : ''}
          ${cfg.showStorePhone  && info.storePhone  ? `<div style="font-size:${fs-2}px">WA: ${info.storePhone}</div>` : ''}
          ${cfg.headerText ? `<div style="font-size:${fs-2}px;margin-top:3px;font-style:italic">${cfg.headerText}</div>` : ''}
        </div>`,
      meta: `
        ${hr}
        ${cfg.showPrintTime ? `<div style="text-align:center;font-size:${fs-2}px">Dicetak: ${printTime}</div>` : ''}
        ${hr}
        ${cfg.showOrderCode  ? row('No. Pesanan',  order.order_code, true) : ''}
        ${cfg.showOrderCode  ? row('Tgl Masuk',    formatDate(order.created_at)) : ''}
        ${cfg.showEstDate && order.estimated_done_at ? row('Est. Selesai', formatDate(order.estimated_done_at)) : ''}`,
      customer: `
        ${hr}
        ${cfg.showCustomer      ? row('Customer', order.customers?.name ?? '-', true) : ''}
        ${cfg.showCustomerPhone && order.customers?.phone ? row('No. HP', order.customers.phone) : ''}`,
      shoe: (cfg.showShoeDetail && !hasNewFormat && (order.shoe_brand || order.shoe_type || order.shoe_color)) ? `
        ${hr}
        <div style="font-weight:700;font-size:${fs-1}px;margin-bottom:3px">DETAIL SEPATU:</div>
        ${order.shoe_brand ? row('  Merek', order.shoe_brand) : ''}
        ${order.shoe_type  ? row('  Jenis', order.shoe_type)  : ''}
        ${order.shoe_color ? row('  Warna', order.shoe_color) : ''}` : '',
      treatment: cfg.showTreatment ? `
        ${hr}
        <div style="font-weight:700;font-size:${fs-1}px;margin-bottom:4px">TREATMENT:</div>
        ${itemsHtml}
        ${hrd}
        ${cfg.showDiscount && discount > 0 ? row('Subtotal', formatRupiah(subtotal)) + row('Diskon', `- ${formatRupiah(discount)}`) : ''}
        ${cfg.showNotes && order.notes ? `${hrd}<div style="font-size:${fs-2}px"><strong>Catatan:</strong> ${order.notes}</div>` : ''}
        ${hr}
        <div style="display:flex;justify-content:space-between;font-weight:900;font-size:${fs+2}px">
          <span>TOTAL</span><span>${formatRupiah(order.total_price)}</span>
        </div>` : '',
      payment: cfg.showPayment ? `
        ${hr}
        <div style="font-weight:700;font-size:${fs-1}px;margin-bottom:3px">PEMBAYARAN:</div>
        ${row('  Metode', payLabel)}
        ${order.payment_method === 'cash' ? row('  Dibayar', formatRupiah(amountPaid)) + row('  Kembalian', formatRupiah(change), true) : ''}` : '',
      status: cfg.showStatus ? `
        ${hr}
        ${row('Status', order.status === 'diterima' ? 'Diterima' : order.status === 'diproses' ? 'Sedang Diproses' : order.status === 'selesai' ? 'Selesai' : 'Sedang Diantar')}` : '',
      footer: `
        ${hr}
        <div style="text-align:center;font-size:${fs-2}px;margin-top:6px;line-height:1.8">
          ${cfg.footerText ? `<div>${cfg.footerText}</div>` : ''}
          ${cfg.showQR ? `<div style="margin-top:6px;font-size:${fs-3}px;margin-bottom:2px">Scan untuk cek status pesanan:</div>${qrHtml}` : ''}
          ${cfg.showOrderCodeFooter ? `<div style="font-size:${fs-3}px;margin-top:2px">Kode: <strong>${order.order_code}</strong></div>` : ''}
        </div>
        <div style="text-align:center;margin-top:10px;font-size:${fs-3}px;letter-spacing:3px">- - - - - - - - - - - - - -</div>`,
    }

    const html = `
      <div style="font-family:${ff};font-size:${fs}px;width:${pw};color:#000;line-height:1.6;margin:0 auto">
        ${cfg.sectionOrder.map(sec => sectionHtml[sec] ?? '').join('')}
      </div>`

    // Inject ke iframe — QR sudah base64, tidak butuh CDN
    const iframe = document.createElement('iframe')
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${cfg.paperWidth};height:0;border:0`
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><style>@page{size:${cfg.paperWidth} auto;margin:4mm 3mm}body{margin:0}</style></head><body>${html}</body></html>`)
    doc.close()
    iframe.onload = () => {
      iframe.contentWindow!.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }

  // Autocomplete
  const [custSugg, setCustSugg] = useState<Customer[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const custRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTreatments().then(ts => setTreatments(ts.filter(t => t.is_active)))
    fetchCustomers().then(setCustomers)
    fetchTenantSettings().then(info => {
      if (!info) return
      if (info.name)    setStoreName(info.name)
      if (info.phone)   setStorePhone(info.phone)
      if (info.addr)    setStoreAddr(info.addr)
      if (info.logoUrl) setLogoUrl(info.logoUrl)
      const stored = localStorage.getItem('shoeops_user')
      if (stored) setStoreToken(JSON.parse(stored).tenant_token ?? '')
    })
    fetchReceiptConfig().then(setReceiptCfg)
    setLoading(false)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (custRef.current && !custRef.current.contains(e.target as Node)) setShowSugg(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const basePrice  = validPairs.reduce((s, p) => {
    const t = treatments.find(t => t.id === p.treatId)
    return s + (t ? t.price * p.qty : 0)
  }, 0)
  const discount   = promoResult?.saving || 0
  const finalPrice = Math.max(0, basePrice - discount)
  const paid       = parseInt(amountPaid.replace(/\D/g, '')) || 0
  const change     = payMethod === 'cash' && paid >= finalPrice ? paid - finalPrice : 0

  function handleCustInput(val: string) {
    setCustName(val)
    if (val.length >= 1) {
      const sugg = customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
      setCustSugg(sugg)
      setShowSugg(sugg.length > 0)
    } else setShowSugg(false)
  }

  function selectCustomer(c: Customer) {
    setCustName(c.name); setCustPhone(c.phone || ''); setShowSugg(false)
  }

  async function checkPromo() {
    if (!promoCode.trim()) return
    const discounts = await fetchDiscounts()
    const code = promoCode.trim().toUpperCase()
    const now  = new Date()
    const d = discounts.find(disc =>
      disc.code === code && disc.active &&
      !(disc.expiresAt && new Date(disc.expiresAt) < now) &&
      !(disc.maxUses !== null && disc.usedCount >= disc.maxUses) &&
      basePrice >= disc.minOrder
    )
    setPromoChecked(true)
    if (d) {
      const saving = d.type === 'pct' ? Math.round(basePrice * d.value / 100) : d.value
      setPromoResult({ saving, error: '', discountId: d.id })
    } else {
      const exists = discounts.find(disc => disc.code === code)
      const error = !exists ? 'Kode promo tidak ditemukan'
        : !exists.active ? 'Promo sudah tidak aktif'
        : exists.expiresAt && new Date(exists.expiresAt) < now ? 'Promo sudah kadaluarsa'
        : exists.maxUses !== null && exists.usedCount >= exists.maxUses ? 'Kuota promo sudah habis'
        : `Minimum pesanan ${exists.minOrder > 0 ? `Rp${exists.minOrder.toLocaleString()}` : ''} tidak terpenuhi`
      setPromoResult({ saving: 0, error, discountId: '' })
    }
  }

  function clearPromo() {
    setPromoCode(''); setPromoResult(null); setPromoChecked(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!custName.trim() || validPairs.length === 0) return

    const code        = await nextOrderCodeFromDB()
    const storedUser  = localStorage.getItem('shoeops_user')
    const tenantId    = storedUser ? JSON.parse(storedUser).tenant_id ?? 'local' : 'local'

    const existingCust = customers.find(c => c.name.toLowerCase() === custName.trim().toLowerCase())
    const customer: Customer = existingCust ?? {
      id: crypto.randomUUID(), tenant_id: tenantId,
      name: custName.trim(), phone: custPhone.trim() || null,
      total_orders: 0, last_order_at: null, created_at: new Date().toISOString(),
    }

    const newOrder: OrderWithDetails = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      order_code: code,
      customer_id: customer.id,
      status: 'diterima',
      total_price: finalPrice,
      notes: notes.trim() || null,
      estimated_done_at: estDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payment_method: payMethod,
      amount_paid: paid || finalPrice,
      // Ambil dari pair pertama untuk field utama
      shoe_type:  validPairs[0]?.type.trim()  || null,
      shoe_brand: validPairs[0]?.brand.trim() || null,
      shoe_color: validPairs[0]?.color.trim() || null,
      customers: customer,
      order_items: validPairs.map(p => {
        const t = treatments.find(tr => tr.id === p.treatId)!
        const unitPrice = validPairs.length === 1 && promoResult ? finalPrice / p.qty : t.price
        // Selalu encode info sepatu ke treatment_name agar bisa ditampilkan per-item
        const shoeInfo = [p.brand, p.type, p.color].filter(Boolean).join(' · ')
        const label = shoeInfo ? `${t.name}||${shoeInfo}` : t.name
        return {
          id: crypto.randomUUID(), order_id: '',
          treatment_id: t.id,
          treatment_name: label,
          price: unitPrice,
          quantity: p.qty,
        }
      }),
    }

    await createOrder(newOrder)
    if (promoResult?.discountId) redeemDiscount(promoResult.discountId)
    show(`✓ ${code} berhasil disimpan!`)

    // Reset form
    setCustName(''); setCustPhone(''); setEstDate(''); setNotes('')
    setPairs([newPair()])
    setAmountPaid(''); setPayMethod('cash'); clearPromo()

    if (printAfterSave) {
      // Retry fetch sampai order_items tersedia (max 5x, interval 400ms)
      let fullOrder = null
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 400))
        fullOrder = await fetchOrderByCode(code)
        if (fullOrder && fullOrder.order_items && fullOrder.order_items.length > 0) break
      }
      const orderToPrint = fullOrder ?? newOrder
      await printReceipt(orderToPrint, { storeName, storePhone, storeAddr, storeToken, logoUrl }, receiptCfg)
      setTimeout(() => router.push('/operasional/pesanan'), 1200)
    } else {
      setTimeout(() => router.push('/operasional/pesanan'), 1200)
    }
  }

  const inputCls = "w-full px-3.5 py-3 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8] placeholder:font-normal"

  if (loading) return <PageSkeleton />

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-8 px-4 animate-fade-up">
      <div className="w-full max-w-lg">
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Input Pesanan Baru</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Isi data pesanan customer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* DATA CUSTOMER */}
          <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-[#0d0d0d]">Data Customer</h2>
            <div ref={custRef} className="relative">
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Nama Customer <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
                <input value={custName} onChange={e => handleCustInput(e.target.value)}
                  onFocus={() => custName && setShowSugg(custSugg.length > 0)}
                  placeholder="Nama lengkap atau cari customer lama"
                  className={`${inputCls} pl-9`} required />
              </div>
              {showSugg && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dddbd5] rounded-xl shadow-lg z-20 overflow-hidden">
                  {custSugg.map(c => (
                    <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#fdf0ea] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-[#f5f4f1] flex items-center justify-center text-[10px] font-extrabold text-[#525252] flex-shrink-0">
                        {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0d0d0d]">{c.name}</p>
                        <p className="text-[10px] text-[#8a8a8a]">{c.total_orders}x pesanan · {c.phone || 'No HP belum ada'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">No. WhatsApp</label>
              <input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                placeholder="08xxxxxxxxxx" className={inputCls} />
            </div>
          </div>

          {/* PASANG SEPATU & TREATMENT */}
          <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0d0d0d]">Sepatu & Treatment</h2>
              {pairs.length > 1 && (
                <span className="text-[11px] font-bold text-[#d4510c] bg-[#fdf0ea] px-2.5 py-1 rounded-full">
                  {pairs.length} pasang
                </span>
              )}
            </div>

            {pairs.map((pair, idx) => {
              const selT = treatments.find(t => t.id === pair.treatId)
              return (
                <div key={pair.id} className={`space-y-3 ${pairs.length > 1 ? 'border border-[#eceae6] rounded-xl p-4' : ''}`}>
                  {pairs.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#8a8a8a] uppercase tracking-widest">Pasang {idx + 1}</span>
                      <button type="button" onClick={() => removePair(pair.id)}
                        className="p-1.5 text-[#c0bdb8] hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Merek</label>
                      <input value={pair.brand} onChange={e => updatePair(pair.id, 'brand', e.target.value)}
                        placeholder="Nike…" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Jenis</label>
                      <input value={pair.type} onChange={e => updatePair(pair.id, 'type', e.target.value)}
                        placeholder="Sneakers…" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Warna</label>
                      <input value={pair.color} onChange={e => updatePair(pair.id, 'color', e.target.value)}
                        placeholder="Putih…" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                      Treatment <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <select value={pair.treatId} onChange={e => updatePair(pair.id, 'treatId', e.target.value)}
                          className={`${inputCls} appearance-none pr-8 cursor-pointer`}>
                          <option value="">Pilih treatment</option>
                          {treatments.map(t => (
                            <option key={t.id} value={t.id}>{t.name} — {formatRupiah(t.price)}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
                      </div>
                      <div className="flex items-center border-[1.5px] border-[#dddbd5] rounded-xl bg-[#f5f4f1] overflow-hidden flex-shrink-0">
                        <button type="button" onClick={() => updatePair(pair.id, 'qty', Math.max(1, pair.qty - 1))}
                          className="px-2.5 py-2.5 text-[#525252] hover:bg-[#eceae6] font-bold text-sm transition-all">−</button>
                        <span className="w-7 text-center text-sm font-bold text-[#0d0d0d]">{pair.qty}</span>
                        <button type="button" onClick={() => updatePair(pair.id, 'qty', pair.qty + 1)}
                          className="px-2.5 py-2.5 text-[#525252] hover:bg-[#eceae6] font-bold text-sm transition-all">+</button>
                      </div>
                    </div>
                    {selT && (
                      <p className="text-[11px] text-[#8a8a8a] mt-1.5 text-right">
                        {selT.name} × {pair.qty} = <span className="font-bold text-[#525252]">{formatRupiah(selT.price * pair.qty)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            <button type="button" onClick={addPair}
              className="flex items-center gap-2 text-[#d4510c] text-xs font-bold transition-all w-full border-[1.5px] border-dashed border-[#f0c9b0] hover:border-[#d4510c] rounded-xl justify-center py-2.5">
              <Plus size={13} /> Tambah Pasang Sepatu
            </button>

            {validPairs.length > 1 && (
              <div className="bg-[#f5f4f1] rounded-xl p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-[#8a8a8a]">Total {validPairs.length} pasang</span>
                <span className="text-sm font-extrabold text-[#0d0d0d]">{formatRupiah(basePrice)}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Estimasi Selesai</label>
              <input type="date" value={estDate} onChange={e => setEstDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Catatan Khusus</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Kondisi sepatu, permintaan khusus, dll..."
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* KODE PROMO */}
          <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-[#d4510c]" />
              <h2 className="text-sm font-extrabold text-[#0d0d0d]">Kode Promo</h2>
              <span className="text-[10px] text-[#8a8a8a]">opsional</span>
            </div>
            <div className="flex gap-2">
              <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoChecked(false); setPromoResult(null) }}
                placeholder="Masukkan kode promo" disabled={!firstTreatId}
                className={`${inputCls} flex-1 font-mono tracking-widest ${!firstTreatId ? 'opacity-50 cursor-not-allowed' : ''}`} />
              <button type="button" onClick={checkPromo} disabled={!promoCode.trim() || !firstTreatId}
                className="px-4 py-2.5 bg-[#0d0d0d] hover:bg-[#1f1f1f] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0">
                Cek
              </button>
              {promoChecked && (
                <button type="button" onClick={clearPromo}
                  className="px-3 py-2.5 border border-[#dddbd5] text-[#8a8a8a] hover:text-[#0d0d0d] text-xs font-bold rounded-xl transition-all flex-shrink-0">
                  ✕
                </button>
              )}
            </div>
            {!firstTreatId && <p className="text-[11px] text-[#8a8a8a]">Pilih treatment terlebih dahulu.</p>}
            {promoChecked && promoResult && (
              promoResult.error ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle size={14} className="text-red-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-red-700">{promoResult.error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-green-700">
                    Promo berhasil! Hemat <strong>{formatRupiah(promoResult.saving)}</strong>
                  </span>
                </div>
              )
            )}
          </div>

          {/* PEMBAYARAN */}
          <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-[#0d0d0d]">Pembayaran</h2>

            {/* Metode */}
            <div>
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setPayMethod(m.value as any)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-[1.5px] transition-all ${
                      payMethod === m.value
                        ? 'bg-[#d4510c] text-white border-[#d4510c]'
                        : 'bg-[#f5f4f1] text-[#525252] border-[#dddbd5] hover:border-[#d4510c]'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nominal bayar (hanya cash) */}
            {payMethod === 'cash' && (
              <div>
                <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                  Uang Dibayar
                </label>
                <input
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Min. ${formatRupiah(finalPrice)}`}
                  className={inputCls}
                  inputMode="numeric"
                />
                {paid > 0 && paid >= finalPrice && (
                  <div className="mt-2 flex items-center justify-between px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-xs font-semibold text-green-700">Kembalian</span>
                    <span className="text-sm font-extrabold text-green-700">{formatRupiah(change)}</span>
                  </div>
                )}
                {paid > 0 && paid < finalPrice && (
                  <div className="mt-2 flex items-center justify-between px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-xs font-semibold text-red-600">Kurang</span>
                    <span className="text-sm font-extrabold text-red-600">{formatRupiah(finalPrice - paid)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RINGKASAN & SUBMIT */}
          <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#0d0d0d] mb-4">Ringkasan</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#525252]">Treatment</span>
                <span className="font-semibold">{validPairs.length > 0 ? formatRupiah(basePrice) : '—'}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Diskon ({promoCode})</span>
                  <span className="font-semibold text-green-600">- {formatRupiah(discount)}</span>
                </div>
              )}
              <div className="h-px bg-[#eceae6] my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#0d0d0d]">Total</span>
                <span className="text-2xl font-extrabold text-[#d4510c] tracking-tight">{formatRupiah(finalPrice)}</span>
              </div>
              {payMethod === 'cash' && paid >= finalPrice && paid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#525252]">Kembalian</span>
                  <span className="font-bold text-green-600">{formatRupiah(change)}</span>
                </div>
              )}
            </div>

            {/* Toggle cetak nota */}
            <button type="button" onClick={() => setPrintAfterSave(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-[1.5px] mb-3 transition-all ${
                printAfterSave
                  ? 'bg-[#0d0d0d] border-[#0d0d0d] text-white'
                  : 'bg-[#f5f4f1] border-[#dddbd5] text-[#525252]'
              }`}>
              <div className="flex items-center gap-2.5">
                <Printer size={15} />
                <span className="text-sm font-bold">Cetak nota setelah simpan</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-all ${printAfterSave ? 'bg-[#d4510c]' : 'bg-[#c0bdb8]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${printAfterSave ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>

            <button type="submit" disabled={!custName.trim() || validPairs.length === 0}
              className="w-full py-3.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all">
              {printAfterSave ? 'Simpan & Cetak Nota' : 'Simpan Pesanan'}
            </button>
            <p className="text-center text-xs text-[#8a8a8a] mt-2.5">Pesanan otomatis masuk ke Daftar Pesanan</p>
          </div>

        </form>

        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </div>
    </div>
  )
}