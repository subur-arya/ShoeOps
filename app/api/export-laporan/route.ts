import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { rateLimit, getIdentifier, tooManyRequests } from '@/lib/rateLimit'

const C = {
  NAVY:'1E3A5F', NAVY_LIGHT:'2E5F9E', TITLE_BG:'EBF3FB', HEADER_TBL:'D6E4F7',
  ALT_ROW:'F7FAFD', GREEN:'1A7A3D', GREEN_BG:'E8F5EE', RED:'C0392B', RED_BG:'FDEDEC',
  BLUE:'1A5EA8', BRAND:'D4510C', GRAY:'6B7280', GRAY_LIGHT:'9CA3AF',
  WHITE:'FFFFFF', BORDER:'BFCFE8',
}
const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function fmtRp(n: number) { return `Rp ${Math.round(n).toLocaleString('id-ID')}` }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }

function hdrStyle() {
  return { font:{name:'Calibri',bold:true,color:{rgb:C.WHITE},sz:9}, fill:{fgColor:{rgb:C.NAVY_LIGHT},patternType:'solid'}, alignment:{horizontal:'center',vertical:'center'}, border:{left:{style:'thin',color:{rgb:C.BORDER}},right:{style:'thin',color:{rgb:C.BORDER}},top:{style:'thin',color:{rgb:C.BORDER}},bottom:{style:'thin',color:{rgb:C.BORDER}}} }
}
function secStyle() {
  return { font:{name:'Calibri',bold:true,color:{rgb:C.NAVY},sz:9}, fill:{fgColor:{rgb:C.HEADER_TBL},patternType:'solid'}, alignment:{horizontal:'left',vertical:'center'}, border:{left:{style:'medium',color:{rgb:C.NAVY_LIGHT}},right:{style:'thin',color:{rgb:C.BORDER}},top:{style:'thin',color:{rgb:C.BORDER}},bottom:{style:'thin',color:{rgb:C.BORDER}}} }
}
function dataStyle(alt=false, align='left') {
  return { font:{name:'Calibri',color:{rgb:C.NAVY},sz:9}, fill:{fgColor:{rgb:alt?C.ALT_ROW:C.WHITE},patternType:'solid'}, alignment:{horizontal:align,vertical:'center'}, border:{left:{style:'thin',color:{rgb:'E2EAF4'}},right:{style:'thin',color:{rgb:'E2EAF4'}},top:{style:'thin',color:{rgb:'E2EAF4'}},bottom:{style:'thin',color:{rgb:'E2EAF4'}}} }
}

class SheetBuilder {
  d: Record<string,any> = {}
  merges: any[] = []
  rh: Record<number,number> = {}
  row = 0

  c(r:number, c:number, v:any, s?:any) {
    const a = XLSX.utils.encode_cell({r,c})
    this.d[a] = {v, t: typeof v==='number'?'n':'s', s}
  }
  m(r1:number,c1:number,r2:number,c2:number) { this.merges.push({s:{r:r1,c:c1},e:{r:r2,c:c2}}) }

  title(title:string, sub:string) {
    const r = this.row
    this.m(r,0,r,7)
    this.c(r,0,`  ${title}`,{font:{name:'Calibri',bold:true,color:{rgb:C.NAVY},sz:14},fill:{fgColor:{rgb:C.TITLE_BG},patternType:'solid'},alignment:{horizontal:'left',vertical:'center'},border:{left:{style:'thick',color:{rgb:C.BRAND}},top:{style:'thin',color:{rgb:C.BORDER}},right:{style:'thin',color:{rgb:C.BORDER}}}})
    this.rh[r] = 30
    this.m(r+1,0,r+1,7)
    this.c(r+1,0,`  ${sub}`,{font:{name:'Calibri',italic:true,color:{rgb:C.GRAY},sz:9},fill:{fgColor:{rgb:C.TITLE_BG},patternType:'solid'},alignment:{horizontal:'left',vertical:'center'},border:{left:{style:'thick',color:{rgb:C.BRAND}},bottom:{style:'thin',color:{rgb:C.BORDER}},right:{style:'thin',color:{rgb:C.BORDER}}}})
    this.rh[r+1] = 18; this.row += 3
  }

  sec(label:string, ncols=8) {
    const r = this.row; this.m(r,0,r,ncols-1)
    this.c(r,0,`  ▸  ${label}`,secStyle()); this.rh[r]=20; this.row++
  }

  th(headers:string[]) {
    const r = this.row; headers.forEach((h,c)=>this.c(r,c,h,hdrStyle()))
    this.rh[r]=20; this.row++
  }

  dr(vals:(string|number)[], alt=false) {
    const r = this.row
    vals.forEach((v,c)=>this.c(r,c,v,dataStyle(alt, c<=1?'left':typeof v==='number'?'right':'left')))
    this.rh[r]=16; this.row++
  }

  kv(label:string, value:string|number, vc?:string) {
    const r = this.row
    this.c(r,0,label,{font:{name:'Calibri',color:{rgb:C.GRAY_LIGHT},sz:9},fill:{fgColor:{rgb:C.WHITE},patternType:'solid'},alignment:{horizontal:'left',vertical:'center'}})
    this.c(r,1,value,{font:{name:'Calibri',bold:true,color:{rgb:vc||C.NAVY},sz:10},fill:{fgColor:{rgb:C.WHITE},patternType:'solid'},alignment:{horizontal:'left',vertical:'center'}})
    this.rh[r]=18; this.row++
  }

  sub(lc:number, label:string, vc:number, value:number, fc:string, bg:string) {
    const r = this.row
    this.c(r,lc,label,{font:{name:'Calibri',bold:true,sz:9},fill:{fgColor:{rgb:C.WHITE},patternType:'solid'}})
    this.c(r,vc,value,{font:{name:'Calibri',bold:true,color:{rgb:fc},sz:9},fill:{fgColor:{rgb:bg},patternType:'solid'},alignment:{horizontal:'right',vertical:'center'}})
    this.rh[r]=16; this.row+=2
  }

  skip(n=1) { this.row+=n }

  build(cws:number[]): XLSX.WorkSheet {
    const ws:XLSX.WorkSheet = {...this.d}
    const addrs = Object.keys(this.d).map(a=>XLSX.utils.decode_cell(a))
    const maxR = Math.max(...addrs.map(c=>c.r),0)
    const maxC = Math.max(...addrs.map(c=>c.c),0)
    ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:maxR,c:maxC}})
    ws['!merges'] = this.merges
    ws['!cols'] = cws.map(w=>({wch:w}))
    ws['!rows'] = Object.entries(this.rh).reduce((acc,[r,h])=>{acc[Number(r)]={hpt:h};return acc},{} as any)
    return ws
  }
}

function generate(orders:any[], expenses:any[], nowStr:string): Uint8Array {
  const now = new Date(nowStr)
  const nowFmt = now.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})+' '+now.toTimeString().slice(0,5)

  const allMonths: string[] = []
  for (let i=0;i<24;i++) {
    let m=now.getMonth()+1-i, y=now.getFullYear()
    while(m<=0){m+=12;y--}
    allMonths.push(`${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}`)
  }
  const monthsSet = new Set([...orders.map(o=>o.created_at?.slice(0,7)),...expenses.map(e=>e.date?.slice(0,7))].filter(Boolean))
  const monthsWithData = allMonths.filter(m=>monthsSet.has(m))

  const wb = XLSX.utils.book_new()

  // ── Analitik Keseluruhan ──────────────────────────────────
  const sb = new SheetBuilder()
  const tRev=orders.reduce((s,o)=>s+(o.total_price||0),0)
  const tExp=expenses.reduce((s,e)=>s+(e.amount||0),0)

  sb.title('LAPORAN ANALITIK KESELURUHAN — ShoeOps',`Data 24 bulan terakhir  ·  Dibuat: ${nowFmt}`)
  sb.sec('RINGKASAN KESELURUHAN',6)
  sb.kv('Total Pesanan',orders.length)
  sb.kv('Total Pemasukan',fmtRp(tRev),C.GREEN)
  sb.kv('Total Pengeluaran',fmtRp(tExp),C.RED)
  sb.kv('Laba Bersih',fmtRp(tRev-tExp),C.BRAND)
  sb.kv('Margin Laba',fmtPct(tRev>0?(tRev-tExp)/tRev*100:0),C.BLUE)
  sb.skip()

  sb.sec('KINERJA PER BULAN',6)
  sb.th(['Bulan','Pesanan','Pemasukan (Rp)','Pengeluaran (Rp)','Laba (Rp)','Margin (%)'])
  allMonths.forEach((ym,idx)=>{
    const mo=orders.filter(o=>o.created_at?.startsWith(ym))
    const me=expenses.filter(e=>e.date?.startsWith(ym))
    if(!mo.length&&!me.length) return
    const rev=mo.reduce((s,o)=>s+o.total_price,0), exp=me.reduce((s,e)=>s+e.amount,0)
    const [y,m]=ym.split('-')
    sb.dr([`${MONTH_ID[parseInt(m)-1]} ${y}`,mo.length,rev,exp,rev-exp,fmtPct(rev>0?(rev-exp)/rev*100:0)],idx%2===0)
  })
  sb.skip(2)

  const tm:Record<string,{count:number,rev:number}>={}
  orders.forEach(o=>(o.order_items||[]).forEach((i:any)=>{
    const n=(i.treatment_name||'').split('||')[0]
    if(!tm[n])tm[n]={count:0,rev:0}
    tm[n].count+=i.quantity||1; tm[n].rev+=(i.price||0)*(i.quantity||1)
  }))
  const tops=Object.entries(tm).sort((a,b)=>b[1].count-a[1].count).slice(0,20)
  sb.sec('TREATMENT TERLARIS (TOP 20)',4)
  sb.th(['Treatment','Terjual','Pendapatan (Rp)','Avg per Order (Rp)'])
  tops.forEach(([n,v],i)=>sb.dr([n,v.count,v.rev,v.count?Math.floor(v.rev/v.count):0],i%2===0))
  sb.skip(2)

  const cm:Record<string,{name:string,orders:number,total:number}>={}
  orders.forEach(o=>{
    const id=o.customer_id||'x'
    if(!cm[id])cm[id]={name:o.customers?.name||'',orders:0,total:0}
    cm[id].orders++; cm[id].total+=o.total_price||0
  })
  const topc=Object.values(cm).sort((a,b)=>b.total-a.total).slice(0,20)
  sb.sec('CUSTOMER TERBAIK (TOP 20)',4)
  sb.th(['Customer','Pesanan','Total Belanja (Rp)','Rata-rata/Order (Rp)'])
  topc.forEach((c,i)=>sb.dr([c.name,c.orders,c.total,c.orders?Math.floor(c.total/c.orders):0],i%2===0))

  XLSX.utils.book_append_sheet(wb,sb.build([18,12,18,18,16,12,12,12]),'Analitik Keseluruhan')

  // ── Sheet per bulan ──────────────────────────────────────
  monthsWithData.forEach(ym=>{
    const [y,m]=ym.split('-'), label=`${MONTH_ID[parseInt(m)-1]} ${y}`
    const mo=orders.filter(o=>o.created_at?.startsWith(ym))
    const me=expenses.filter(e=>e.date?.startsWith(ym))
    const rev=mo.reduce((s,o)=>s+o.total_price,0), exp=me.reduce((s,e)=>s+e.amount,0)

    const msb=new SheetBuilder()
    msb.title(`LAPORAN BULANAN — ${label.toUpperCase()}`,`ShoeOps  ·  Dibuat: ${nowFmt}`)
    msb.sec('RINGKASAN BULAN INI',8)
    msb.kv('Total Pesanan',mo.length)
    msb.kv('Pemasukan',fmtRp(rev),C.GREEN)
    msb.kv('Pengeluaran',fmtRp(exp),C.RED)
    msb.kv('Laba Bersih',fmtRp(rev-exp),C.BRAND)
    msb.kv('Margin',fmtPct(rev>0?(rev-exp)/rev*100:0),C.BLUE)
    msb.skip()

    msb.sec(`DETAIL PESANAN (${mo.length} transaksi)`,8)
    if(mo.length){
      msb.th(['Kode','Customer','No HP','Treatment(s)','Total (Rp)','Status','Tanggal','Bayar'])
      const sorted=[...mo].sort((a,b)=>a.created_at?.localeCompare(b.created_at))
      sorted.forEach((o,i)=>{
        const treats=(o.order_items||[]).map((it:any)=>it.treatment_name?.split('||')[0]||'').join(', ')||'-'
        msb.dr([o.order_code||'',o.customers?.name||'',o.customers?.phone||'',treats,o.total_price||0,o.status||'',(o.created_at||'').slice(0,10),o.payment_method||''],i%2===0)
      })
      msb.sub(3,'TOTAL',4,rev,C.GREEN,C.GREEN_BG)
    } else { msb.c(msb.row,0,'Tidak ada pesanan bulan ini',{font:{name:'Calibri',italic:true,color:{rgb:C.GRAY},sz:9},fill:{fgColor:{rgb:C.WHITE},patternType:'solid'}}); msb.skip(2) }

    msb.sec(`DETAIL PENGELUARAN (${me.length} item)`,8)
    if(me.length){
      msb.th(['Nama Pengeluaran','Kategori','Jumlah (Rp)','Tanggal','Catatan','','',''])
      const sortedE=[...me].sort((a,b)=>a.date?.localeCompare(b.date))
      sortedE.forEach((e,i)=>msb.dr([e.name||'',e.category?.name||'Tanpa Kategori',e.amount||0,e.date||'',e.notes||''],i%2===0))
      msb.sub(1,'TOTAL',2,exp,C.RED,C.RED_BG)
    } else { msb.c(msb.row,0,'Tidak ada pengeluaran bulan ini',{font:{name:'Calibri',italic:true,color:{rgb:C.GRAY},sz:9},fill:{fgColor:{rgb:C.WHITE},patternType:'solid'}}) }

    XLSX.utils.book_append_sheet(wb,msb.build([14,20,14,32,14,12,12,14]),label)
  })

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true }))
}

export async function POST(req: NextRequest) {
  const id=getIdentifier(req)
  const rl=rateLimit(id,{limit:5,windowSec:600,blockSec:300})
  if(!rl.allowed) return tooManyRequests(rl.retryAfter)
  try {
    const {orders,expenses,now}=await req.json()
    const buf = generate(orders||[], expenses||[], now||new Date().toISOString())
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="laporan-shoeops.xlsx"',
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    })
  } catch(e:any) {
    console.error('[export-laporan]',e?.message)
    return NextResponse.json({error:e.message},{status:500})
  }
}