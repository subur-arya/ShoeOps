'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useCallback } from 'react'
import {
  fetchReceiptConfig, saveReceiptConfig, fetchTenantSettings,
  DEFAULT_RECEIPT_CONFIG, type ReceiptConfig
} from '@/lib/api'
import { formatRupiah } from '@/lib/utils'
import {
  Save, Eye, GripVertical, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, Type, Layout, FileText, Printer
} from 'lucide-react'

// ── Demo order untuk preview ─────────────────────────────────
const DEMO_ORDER = {
  order_code: 'CLN-001-0042',
  created_at: new Date().toISOString(),
  estimated_done_at: new Date(Date.now() + 2 * 86400000).toISOString(),
  customers: { name: 'Budi Santoso', phone: '08123456789' },
  order_items: [{ treatment_name: 'Deep Cleaning', price: 85000, quantity: 1 }],
  shoe_brand: 'Nike', shoe_type: 'Sneakers', shoe_color: 'Putih',
  total_price: 75000,
  payment_method: 'cash' as const,
  amount_paid: 100000,
  notes: 'Sol kanan sedikit kotor',
  status: 'diterima' as const,
}

const SECTION_LABELS: Record<string, string> = {
  header: '🏪 Header Toko',
  meta: '🧾 Info Pesanan',
  customer: '👤 Data Customer',
  shoe: '👟 Detail Sepatu',
  treatment: '💊 Treatment & Harga',
  payment: '💳 Pembayaran',
  status: '📋 Status',
  footer: '📝 Footer & QR',
}

const TABS = [
  { id: 'kertas',   label: 'Kertas & Font',   icon: Printer },
  { id: 'sections', label: 'Bagian Struk',     icon: Layout  },
  { id: 'teks',     label: 'Teks Custom',      icon: Type    },
  { id: 'urutan',   label: 'Urutan Bagian',    icon: FileText },
]

export default function PengaturanStrukPage() {
  const [cfg,       setCfg]       = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG)
  const [storeInfo, setStoreInfo] = useState({ name: '', phone: '', addr: '', token: '', logoUrl: null as string | null })
  const [tab,       setTab]       = useState('kertas')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetchReceiptConfig().then(setCfg)
    fetchTenantSettings().then(info => {
      if (info) {
        const token = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('shoeops_user') ?? '{}').tenant_token ?? '') : ''
        setStoreInfo({ name: info.name, phone: info.phone, addr: info.addr, token, logoUrl: info.logoUrl })
      }
      setLoading(false)
    })
  }, [])

  function update<K extends keyof ReceiptConfig>(key: K, val: ReceiptConfig[K]) {
    setCfg(prev => ({ ...prev, [key]: val }))
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const arr = [...cfg.sectionOrder]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    update('sectionOrder', arr)
  }

  async function handleSave() {
    setSaving(true)
    await saveReceiptConfig(cfg)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = "w-full px-3 py-2 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all"

  if (loading) return <PageSkeleton />

  return (
    <div className="min-h-full py-8 px-4 animate-fade-up">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Pengaturan Struk</h1>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Kustomisasi tampilan nota cetak toko Anda</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-xl transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-[#d4510c] hover:bg-[#b84309] text-white disabled:opacity-50'
            }`}>
            <Save size={15} />
            {saved ? 'Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── PANEL KIRI: Settings ── */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-[#f5f4f1] rounded-xl p-1 gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === t.id ? 'bg-white text-[#0d0d0d] shadow-sm' : 'text-[#8a8a8a] hover:text-[#525252]'
                  }`}>
                  <t.icon size={12} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* TAB: Kertas & Font */}
            {tab === 'kertas' && (
              <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 space-y-5">
                <h3 className="font-extrabold text-[#0d0d0d] text-sm">Kertas & Font</h3>

                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Lebar Kertas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['58mm', '80mm'] as const).map(w => (
                      <button key={w} onClick={() => update('paperWidth', w)}
                        className={`py-3 rounded-xl border-[1.5px] font-bold text-sm transition-all ${
                          cfg.paperWidth === w
                            ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                            : 'bg-[#f5f4f1] text-[#525252] border-[#dddbd5] hover:border-[#0d0d0d]'
                        }`}>
                        {w}
                        <span className="block text-[10px] font-normal opacity-70">
                          {w === '58mm' ? 'Printer mini' : 'Printer standar'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">Font</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['monospace', 'Monospace', 'Courier style'], ['sans-serif', 'Sans-serif', 'Modern clean']] as const).map(([val, label, sub]) => (
                      <button key={val} onClick={() => update('fontFamily', val)}
                        className={`py-3 rounded-xl border-[1.5px] transition-all ${
                          cfg.fontFamily === val
                            ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                            : 'bg-[#f5f4f1] text-[#525252] border-[#dddbd5] hover:border-[#0d0d0d]'
                        }`}>
                        <span className={`block font-bold text-sm ${val === 'monospace' ? 'font-mono' : 'font-sans'}`}>{label}</span>
                        <span className="block text-[10px] font-normal opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-2">
                    Ukuran Font Dasar — {cfg.fontSizeBase}px
                  </label>
                  <input type="range" min={9} max={16} value={cfg.fontSizeBase}
                    onChange={e => update('fontSizeBase', parseInt(e.target.value))}
                    className="w-full accent-[#d4510c]" />
                  <div className="flex justify-between text-[10px] text-[#c0bdb8] mt-1">
                    <span>9px (kecil)</span><span>16px (besar)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Bagian Struk */}
            {tab === 'sections' && (
              <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 space-y-2">
                <h3 className="font-extrabold text-[#0d0d0d] text-sm mb-4">Tampilkan / Sembunyikan</h3>
                {([
                  ['showLogo',            'Logo toko'],
                  ['showStoreName',       'Nama toko'],
                  ['showStoreToken',      'Kode toko (token)'],
                  ['showStoreAddress',    'Alamat toko'],
                  ['showStorePhone',      'No. WhatsApp toko'],
                  null,
                  ['showPrintTime',       'Waktu cetak'],
                  ['showOrderCode',       'Nomor pesanan'],
                  ['showEstDate',         'Estimasi selesai'],
                  null,
                  ['showCustomer',        'Nama customer'],
                  ['showCustomerPhone',   'No. HP customer'],
                  null,
                  ['showShoeDetail',      'Detail sepatu (merek, jenis, warna)'],
                  null,
                  ['showTreatment',       'Treatment & harga'],
                  ['showDiscount',        'Diskon'],
                  ['showNotes',           'Catatan pesanan'],
                  null,
                  ['showPayment',         'Info pembayaran & kembalian'],
                  null,
                  ['showStatus',          'Status pesanan'],
                  null,
                  ['showQR',              'QR code cek pesanan'],
                  ['showOrderCodeFooter', 'Kode pesanan di footer'],
                ] as (string[] | null)[]).map((item, i) => {
                  if (!item) return <div key={i} className="h-px bg-[#f5f4f1] my-1" />
                  const [key, label] = item
                  const val = cfg[key as keyof ReceiptConfig] as boolean
                  return (
                    <button key={key} onClick={() => update(key as keyof ReceiptConfig, !val as any)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#fafaf9] transition-all">
                      <span className="text-sm text-[#0d0d0d]">{label}</span>
                      {val
                        ? <ToggleRight size={22} className="text-[#d4510c]" />
                        : <ToggleLeft  size={22} className="text-[#c0bdb8]" />
                      }
                    </button>
                  )
                })}
              </div>
            )}

            {/* TAB: Teks Custom */}
            {tab === 'teks' && (
              <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 space-y-5">
                <h3 className="font-extrabold text-[#0d0d0d] text-sm">Teks Custom</h3>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                    Teks Tambahan Header
                    <span className="ml-1 normal-case font-normal text-[#c0bdb8]">(opsional, di bawah nama toko)</span>
                  </label>
                  <input value={cfg.headerText} onChange={e => update('headerText', e.target.value)}
                    placeholder="Contoh: Buka Setiap Hari 08.00–20.00"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">
                    Teks Footer
                  </label>
                  <textarea value={cfg.footerText} onChange={e => update('footerText', e.target.value)}
                    rows={3} placeholder="Ucapan terima kasih, info toko, dll..."
                    className={`${inputCls} resize-none`} />
                </div>
              </div>
            )}

            {/* TAB: Urutan */}
            {tab === 'urutan' && (
              <div className="bg-white rounded-2xl border border-[#dddbd5] p-5 space-y-3">
                <h3 className="font-extrabold text-[#0d0d0d] text-sm">Urutan Bagian Struk</h3>
                <p className="text-xs text-[#8a8a8a]">Geser urutan bagian yang ditampilkan di struk.</p>
                <div className="space-y-2">
                  {cfg.sectionOrder.map((sec, idx) => (
                    <div key={sec} className="flex items-center gap-3 bg-[#f5f4f1] border border-[#eceae6] rounded-xl px-3 py-2.5">
                      <GripVertical size={14} className="text-[#c0bdb8] flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-[#0d0d0d]">{SECTION_LABELS[sec] ?? sec}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                          className="p-1 rounded hover:bg-[#eceae6] disabled:opacity-30 transition-all">
                          <ChevronUp size={13} className="text-[#525252]" />
                        </button>
                        <button onClick={() => moveSection(idx, 1)} disabled={idx === cfg.sectionOrder.length - 1}
                          className="p-1 rounded hover:bg-[#eceae6] disabled:opacity-30 transition-all">
                          <ChevronDown size={13} className="text-[#525252]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── PANEL KANAN: Live Preview ── */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl border border-[#dddbd5] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f4f1] border-b border-[#dddbd5]">
                <Eye size={13} className="text-[#8a8a8a]" />
                <span className="text-xs font-bold text-[#525252]">Preview Struk</span>
                <span className="ml-auto text-[10px] text-[#c0bdb8]">{cfg.paperWidth}</span>
              </div>
              <div className="p-4 overflow-y-auto max-h-[75vh] bg-[#fafaf9]">
                <div className="flex justify-center">
                  <ReceiptPreview cfg={cfg} storeInfo={storeInfo} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Live Preview Component ────────────────────────────────────
function ReceiptPreview({ cfg, storeInfo }: { cfg: ReceiptConfig; storeInfo: { name: string; phone: string; addr: string; token: string; logoUrl: string | null } }) {
  const order = DEMO_ORDER
  const discount = (order.order_items[0].price * order.order_items[0].quantity) - order.total_price
  const change   = order.amount_paid - order.total_price
  const paperPx  = cfg.paperWidth === '58mm' ? 220 : 304
  const fs       = cfg.fontSizeBase
  const ff       = cfg.fontFamily === 'monospace' ? 'Courier New, Courier, monospace' : 'system-ui, sans-serif'
  const printTime = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })

  const Hr = ({ dashed }: { dashed?: boolean }) => (
    <div style={{ borderTop: `1px ${dashed ? 'dashed' : 'solid'} #000`, margin: '5px 0' }} />
  )
  const Row = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : 400, fontSize: fs - 1, marginBottom: 1 }}>
      <span style={{ flexShrink: 0 }}>{l}</span><span style={{ textAlign: 'right' }}>{r}</span>
    </div>
  )

  const sections: Record<string, JSX.Element | null> = {
    header: (
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        {cfg.showLogo && storeInfo.logoUrl && (
          <img src={storeInfo.logoUrl} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
        )}
        {cfg.showStoreName && (
          <div style={{ fontSize: fs + 3, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>{storeInfo.name || 'NAMA TOKO'}</div>
        )}
        {cfg.showStoreToken && storeInfo.token && (
          <div style={{ fontSize: fs - 2, letterSpacing: 1 }}>{storeInfo.token}</div>
        )}
        {cfg.showStoreAddress && storeInfo.addr && (
          <div style={{ fontSize: fs - 2 }}>{storeInfo.addr}</div>
        )}
        {cfg.showStorePhone && storeInfo.phone && (
          <div style={{ fontSize: fs - 2 }}>WA: {storeInfo.phone}</div>
        )}
        {cfg.headerText && (
          <div style={{ fontSize: fs - 2, marginTop: 3, fontStyle: 'italic' }}>{cfg.headerText}</div>
        )}
      </div>
    ),
    meta: cfg.showPrintTime || cfg.showOrderCode || cfg.showEstDate ? (
      <>
        <Hr />
        {cfg.showPrintTime && <div style={{ textAlign: 'center', fontSize: fs - 2 }}>Dicetak: {printTime}</div>}
        <Hr />
        {cfg.showOrderCode  && <Row l="No. Pesanan"  r={order.order_code} bold />}
        {cfg.showOrderCode  && <Row l="Tgl Masuk"    r={new Date(order.created_at).toLocaleDateString('id-ID')} />}
        {cfg.showEstDate    && <Row l="Est. Selesai" r={new Date(order.estimated_done_at).toLocaleDateString('id-ID')} />}
      </>
    ) : null,
    customer: cfg.showCustomer || cfg.showCustomerPhone ? (
      <>
        <Hr />
        {cfg.showCustomer      && <Row l="Customer" r={order.customers.name} bold />}
        {cfg.showCustomerPhone && <Row l="No. HP"   r={order.customers.phone} />}
      </>
    ) : null,
    shoe: cfg.showShoeDetail ? (
      <>
        <Hr />
        <div style={{ fontWeight: 700, fontSize: fs - 1, marginBottom: 2 }}>DETAIL SEPATU:</div>
        <Row l="  Merek" r={order.shoe_brand} />
        <Row l="  Jenis" r={order.shoe_type} />
        <Row l="  Warna" r={order.shoe_color} />
      </>
    ) : null,
    treatment: cfg.showTreatment ? (
      <>
        <Hr />
        <div style={{ fontWeight: 700, fontSize: fs - 1, marginBottom: 3 }}>TREATMENT:</div>
        {order.order_items.map((item, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: fs }}>{item.treatment_name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 8, fontSize: fs - 2 }}>
              <span>{item.quantity}x @ {formatRupiah(item.price)}</span>
              <span>{formatRupiah(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}
        <Hr dashed />
        {cfg.showDiscount && discount > 0 && <>
          <Row l="Subtotal" r={formatRupiah(order.order_items[0].price)} />
          <Row l="Diskon"   r={`- ${formatRupiah(discount)}`} />
        </>}
        {cfg.showNotes && order.notes && (
          <>
            <Hr dashed />
            <div style={{ fontSize: fs - 2 }}><strong>Catatan:</strong> {order.notes}</div>
          </>
        )}
        <Hr />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: fs + 2 }}>
          <span>TOTAL</span><span>{formatRupiah(order.total_price)}</span>
        </div>
      </>
    ) : null,
    payment: cfg.showPayment ? (
      <>
        <Hr />
        <div style={{ fontWeight: 700, fontSize: fs - 1, marginBottom: 2 }}>PEMBAYARAN:</div>
        <Row l="  Metode"    r="Cash" />
        <Row l="  Dibayar"   r={formatRupiah(order.amount_paid)} />
        <Row l="  Kembalian" r={formatRupiah(change)} bold />
      </>
    ) : null,
    status: cfg.showStatus ? (
      <>
        <Hr />
        <Row l="Status" r="Diterima" />
      </>
    ) : null,
    footer: (
      <>
        <Hr />
        <div style={{ textAlign: 'center', fontSize: fs - 2, marginTop: 6, lineHeight: 1.8 }}>
          {cfg.footerText && <div>{cfg.footerText}</div>}
          {cfg.showQR && (
            <div style={{ margin: '6px 0', fontSize: fs - 3 }}>
              <div style={{ margin: '0 auto', width: 60, height: 60, background: '#f0f0f0', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa' }}>
                QR Code
              </div>
            </div>
          )}
          {cfg.showOrderCodeFooter && (
            <div style={{ fontSize: fs - 3, marginTop: 2 }}>Kode: <strong>{order.order_code}</strong></div>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: fs - 3, letterSpacing: 3 }}>- - - - - - - - - - -</div>
      </>
    ),
  }

  return (
    <div style={{
      width: paperPx,
      fontFamily: ff,
      fontSize: fs,
      color: '#000',
      background: '#fff',
      padding: '12px 10px',
      boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
      lineHeight: 1.6,
      minHeight: 200,
    }}>
      {cfg.sectionOrder.map(sec => (
        <div key={sec}>{sections[sec] ?? null}</div>
      ))}
    </div>
  )
}