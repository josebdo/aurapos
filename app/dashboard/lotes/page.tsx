"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Lot, Product } from "@/lib/types"
import { 
  Layers, 
  Search, 
  RefreshCw, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Plus,
  Minus,
  Trash2,
} from "lucide-react"

const supabase = createClient()

export default function LotesPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [adjustType, setAdjustType] = useState<'agregar' | 'restar'>('restar')
  const { formatUsd } = useExchangeRate()

  const loadData = async () => {
    setLoading(true)
    const { data: lotsData, error: lotsError } = await supabase
      .from("lots")
      .select("*, product:products(*)")
      .order("expiry_date", { ascending: true })
    
    if (lotsData) setLots(lotsData)
    if (lotsError) console.error("Error loading lots:", lotsError)

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("uses_lots", true)
      .eq("is_active", true)
    
    if (productsData) setProducts(productsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLots = lots.filter(l => {
    const matchesSearch = !searchQuery || 
      l.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.number.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getDaysUntilExpiry = (date: string) => {
    const expiry = new Date(date)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const expiringSoon = lots.filter(l => l.expiry_date && getDaysUntilExpiry(l.expiry_date) <= 30 && l.status === 'activo').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Lotes</h1>
            <p className="text-sm text-muted-foreground">Control de vencimientos y trazabilidad de productos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-input rounded-lg hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Crear Lote
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {expiringSoon > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6 flex items-center gap-4 text-amber-500">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Alerta de Vencimiento</p>
            <p className="text-xs">Tienes {expiringSoon} lotes que vencen en los próximos 30 días.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Lotes Activos</p>
            <p className="text-xl font-bold">{lots.filter(l => l.status === 'activo').length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Próximos a Vencer</p>
            <p className="text-xl font-bold text-amber-500">{expiringSoon}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Items en Lotes</p>
            <p className="text-xl font-bold text-emerald-500">{lots.reduce((sum, l) => sum + l.quantity, 0)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto o número de lote..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">PRODUCTO</th>
                <th className="text-left p-4 font-medium text-muted-foreground">LOTE</th>
                <th className="text-right p-4 font-medium text-muted-foreground">INICIAL</th>
                <th className="text-left p-4 font-medium text-muted-foreground">RESTANTE</th>
                <th className="text-right p-4 font-medium text-muted-foreground">VENDIDO</th>
                <th className="text-left p-4 font-medium text-muted-foreground">VENCIMIENTO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ESTADO</th>
                <th className="text-right p-4 font-medium text-muted-foreground">COSTO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">CREADO</th>
                <th className="text-center p-4 font-medium text-muted-foreground uppercase text-[10px]">Ajustar</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">No hay lotes registrados</td>
                </tr>
              ) : (
                filteredLots.map(lot => {
                  const daysLeft = lot.expiry_date ? getDaysUntilExpiry(lot.expiry_date) : null
                  const isExpiring = daysLeft !== null && daysLeft <= 30 && lot.status === 'activo'
                  const isExpired = lot.status === 'vencido' || (daysLeft !== null && daysLeft <= 0)
                  const soldCount = lot.initial_quantity - lot.quantity
                  const soldPercentage = lot.initial_quantity > 0 ? Math.round((soldCount / lot.initial_quantity) * 100) : 0
                  const remainingPercentage = lot.initial_quantity > 0 ? Math.round((lot.quantity / lot.initial_quantity) * 100) : 0

                  return (
                    <tr key={lot.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4">
                        <p className="font-medium text-sm capitalize">{lot.product?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">Código: {lot.product?.code}</p>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {lot.number}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {lot.initial_quantity}
                      </td>
                      <td className="p-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{lot.quantity}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                            <div 
                              className={`h-full rounded-full ${remainingPercentage > 50 ? 'bg-emerald-500' : remainingPercentage > 20 ? 'bg-amber-500' : 'bg-destructive'}`}
                              style={{ width: `${remainingPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-sm">{soldCount} <span className="text-xs text-muted-foreground">({soldPercentage}%)</span></p>
                      </td>
                      <td className="p-4">
                        {lot.expiry_date ? (
                          <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                            isExpired ? 'bg-destructive/10 text-destructive' : 
                            isExpiring ? 'bg-amber-500/10 text-amber-500' : 
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isExpired ? 'Vencido' : isExpiring ? `Vence en ${daysLeft} días` : new Date(lot.expiry_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Sin vencimiento</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center justify-center gap-1 mx-auto w-fit ${
                          isExpired || lot.status === 'vencido' ? 'border-destructive text-destructive' : 
                          isExpiring ? 'border-amber-500 text-amber-500' : 
                          lot.status === 'agotado' ? 'border-slate-500 text-slate-500' :
                          'border-emerald-500 text-emerald-500'
                        }`}>
                          {lot.status === 'activo' && <CheckCircle2 className="w-3 h-3" />}
                          {(isExpired || lot.status === 'vencido') && <XCircle className="w-3 h-3" />}
                          {lot.status === 'agotado' && <XCircle className="w-3 h-3" />}
                          <span className="capitalize">{isExpired ? 'Vencido' : lot.status}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatUsd(lot.cost)}
                      </td>
                      <td className="p-4 text-center text-xs text-muted-foreground font-mono">
                        {new Date(lot.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => {
                              setSelectedLot(lot)
                              setAdjustType('restar')
                              setShowAdjustModal(true)
                            }}
                            className="w-6 h-6 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                            title="Reducir lote"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedLot(lot)
                              setAdjustType('agregar')
                              setShowAdjustModal(true)
                            }}
                            className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20"
                            title="Agregar lote"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('¿Estás seguro de que deseas eliminar este lote?')) {
                                const { error } = await supabase.from('lots').delete().eq('id', lot.id)
                                if (!error) loadData()
                                else alert('Error al eliminar lote: ' + error.message)
                              }
                            }}
                            className="w-6 h-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500/20"
                            title="Eliminar lote"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Modal Header - Teal styled */}
            <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-emerald-900">Crear Lote Manualmente</h2>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const productId = formData.get('productId') as string
              let number = formData.get('number') as string
              const quantity = parseInt(formData.get('quantity') as string)
              const cost = parseFloat(formData.get('cost') as string)
              const expiryDate = formData.get('expiryDate') as string
              const notes = formData.get('notes') as string

              if (!productId || isNaN(quantity) || isNaN(cost)) return alert('Por favor complete los campos obligatorios (*)')

              // Auto generate lot number if empty
              if (!number) {
                const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
                number = `LOT-${date}-${random}`
              }

              const { data: newLot, error } = await supabase.from('lots').insert({
                product_id: productId,
                number,
                initial_quantity: quantity,
                quantity: quantity,
                cost,
                expiry_date: expiryDate || null,
                status: 'activo'
              }).select().single()

              if (!error) {
                // Record adjustment if notes provided or just as initial entry
                if (notes || true) {
                    await supabase.from('inventory_adjustments').insert({
                        product_id: productId,
                        lot_id: newLot.id,
                        type: 'agregar',
                        quantity: quantity,
                        reason: 'Carga inicial de lote',
                        notes: notes || 'Creación manual de lote',
                        created_at: new Date().toISOString()
                    })
                }
                setShowCreateModal(false)
                loadData()
              } else {
                alert('Error al crear lote: ' + error.message)
              }
            }} className="p-6 space-y-5">
              
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Producto * <span className="text-xs font-normal text-muted-foreground">(solo productos con control de lotes)</span></label>
                <select 
                    name="productId" 
                    required 
                    className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600 italic">No hay productos con control de lotes activado. Activa "Usa Lotes" en un producto primero.</p>
                )}
              </div>

              {/* Quantity & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Cantidad *</label>
                  <input 
                    name="quantity" 
                    type="number" 
                    step="1" 
                    required 
                    min="1" 
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Costo Unitario (USD) *</label>
                  <input 
                    name="cost" 
                    type="number" 
                    step="0.01" 
                    required 
                    min="0" 
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Fecha de Vencimiento (opcional)</label>
                <input 
                  name="expiryDate" 
                  type="date" 
                  className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                />
              </div>

              {/* Batch Number */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Número de Lote (opcional)</label>
                <input 
                    name="number" 
                    type="text" 
                    placeholder="Se generará automáticamente si se deja vacío" 
                    className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                />
                <p className="mt-1 text-[10px] text-muted-foreground italic">Si lo dejas vacío, se generará automáticamente (formato: LOT-YYYYMMDD-XXXX)</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Notas (opcional)</label>
                <textarea 
                    name="notes" 
                    rows={3}
                    placeholder="Notas adicionales sobre el lote..."
                    className="w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 px-4 py-2.5 border border-input rounded-xl hover:bg-muted font-semibold text-sm transition-all"
                >
                    Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[1.5] px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedLot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {adjustType === 'agregar' ? (
                  <Plus className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Minus className="w-5 h-5 text-destructive" />
                )}
                <h2 className="text-xl font-bold">{adjustType === 'agregar' ? 'Agregar a Lote' : 'Reducir Lote'}</h2>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-muted/30 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Producto</p>
              <p className="font-medium text-sm">{selectedLot.product?.name}</p>
              <p className="text-[10px] text-muted-foreground">Lote: {selectedLot.number} | Disponible: {selectedLot.quantity}</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const amount = parseInt(formData.get('amount') as string)
              const reason = formData.get('reason') as string

              if (isNaN(amount) || amount <= 0) return alert('Cantidad no válida')
              
              const newQuantity = adjustType === 'agregar' ? selectedLot.quantity + amount : selectedLot.quantity - amount
              if (newQuantity < 0) return alert('La cantidad resultante no puede ser negativa')

              const { error } = await supabase.from('lots').update({ 
                quantity: newQuantity,
                status: newQuantity === 0 ? 'agotado' : selectedLot.status
              }).eq('id', selectedLot.id)

              if (!error) {
                // Record adjustment
                await supabase.from('inventory_adjustments').insert({
                  product_id: selectedLot.product_id,
                  lot_id: selectedLot.id,
                  type: adjustType === 'agregar' ? 'entrada' : 'salida',
                  quantity: amount,
                  reason,
                  created_at: new Date().toISOString()
                })
                setShowAdjustModal(false)
                loadData()
              } else {
                alert('Error al ajustar lote: ' + error.message)
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Cantidad a {adjustType === 'agregar' ? 'Sumar' : 'Restar'}</label>
                <input name="amount" type="number" step="1" required min="1" autoFocus className="w-full p-2 rounded-lg border border-input bg-background text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Motivo</label>
                <select name="reason" required className="w-full p-2 rounded-lg border border-input bg-background text-sm">
                  {adjustType === 'agregar' ? (
                    <>
                      <option value="Ingreso manual">Ingreso manual</option>
                      <option value="Devolución">Devolución</option>
                      <option value="Error de inventario">Error de inventario</option>
                    </>
                  ) : (
                    <>
                        <option value="Mermas/Desecho">Mermas/Desecho</option>
                        <option value="Vencimiento">Vencimiento</option>
                        <option value="Uso interno">Uso interno</option>
                        <option value="Error de inventario">Error de inventario</option>
                        <option value="Destrucción">Destrucción</option>
                    </>
                  )}
                </select>
              </div>
              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted font-medium transition-colors">Cancelar</button>
                <button type="submit" className={`flex-2 px-4 py-2 text-white rounded-lg font-bold transition-colors ${adjustType === 'agregar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
