"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Product, InventoryAdjustment } from "@/lib/types"
import { 
  Boxes, 
  Search, 
  Plus, 
  RefreshCw, 
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
} from "lucide-react"

const supabase = createClient()

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  
  // Adjustment Form state
  const [formData, setFormData] = useState({
    product_id: "",
    type: "agregar" as "agregar" | "restar",
    quantity: "",
    reason: "Ajuste manual",
    notes: "",
  })

  // Load data
  const loadData = async () => {
    setLoading(true)
    const [productsRes, adjustmentsRes] = await Promise.all([
      supabase.from("products").select("*, category:categories(*)").eq("is_active", true).order("stock", { ascending: true }),
      supabase.from("inventory_adjustments").select("*, product:products(name, code)").order("created_at", { ascending: false }).limit(50),
    ])
    if (productsRes.data) setProducts(productsRes.data)
    if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle adjustment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(formData.quantity)
    if (!qty || !formData.product_id) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const product = products.find(p => p.id === formData.product_id)
      if (!product) return

      const newStock = formData.type === "agregar" 
        ? product.stock + qty 
        : product.stock - qty

      // 1. Create adjustment record
      const { error: adjError } = await supabase.from("inventory_adjustments").insert({
        product_id: formData.product_id,
        type: formData.type,
        quantity: qty,
        reason: formData.reason,
        notes: formData.notes,
        created_by: user?.id
      })

      if (adjError) throw adjError

      // 2. Update product stock
      const { error: prodError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", formData.product_id)

      if (prodError) throw prodError

      setShowModal(false)
      loadData()
      setFormData({
        product_id: "",
        type: "agregar",
        quantity: "",
        reason: "Ajuste manual",
        notes: "",
      })
    } catch (error) {
      console.error("Error saving adjustment:", error)
      alert("Error al procesar el ajuste")
    }
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const lowStockCount = products.filter(p => p.stock < p.min_stock).length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Control de Inventario</h1>
            <p className="text-sm text-muted-foreground">Supervisa y ajusta las existencias de productos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 border border-input rounded-lg flex items-center gap-2 transition-colors ${showHistory ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            <History className="w-4 h-4" />
            {showHistory ? "Ver Stock" : "Historial"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Ajuste
          </button>
        </div>
      </div>

      {/* Stats */}
      {!showHistory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold text-[10px]">Total Items</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold text-[10px]">Stock Bajo</p>
              <p className="text-2xl font-bold text-amber-500">{lowStockCount}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold text-[10px]">Salud Inventario</p>
              <p className="text-2xl font-bold">{Math.round(100 - (lowStockCount / products.length * 100))}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showHistory ? (
        <>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">PRODUCTO</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">CATEGORÍA</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">MÍNIMO</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">STOCK ACTUAL</th>
                    <th className="text-center p-4 font-medium text-muted-foreground">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {p.category?.name || "-"}
                      </td>
                      <td className="p-4 text-right text-sm">
                        {p.min_stock} {p.sells_by_weight ? "KG" : "u"}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold text-lg ${p.stock < p.min_stock ? 'text-destructive' : 'text-primary'}`}>
                          {p.stock} {p.sells_by_weight ? "KG" : "u"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.stock <= 0 ? 'bg-destructive text-white' : 
                          p.stock < p.min_stock ? 'bg-amber-500 text-white' : 
                          'bg-emerald-500 text-white'
                        }`}>
                          {p.stock <= 0 ? 'Agotado' : p.stock < p.min_stock ? 'Bajo Stock' : 'Disponible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* History Table */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">FECHA / HORA</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">PRODUCTO</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">TIPO</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">CANTIDAD</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">MOTIVO / NOTAS</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(adj => (
                  <tr key={adj.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4 text-sm">
                      {new Date(adj.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{adj.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{adj.product?.code}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${adj.type === 'agregar' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {adj.type === 'agregar' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-bold ${adj.type === 'agregar' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {adj.type === 'agregar' ? '+' : '-'}{adj.quantity}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium">{adj.reason}</p>
                      <p className="text-xs text-muted-foreground">{adj.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Realizar Ajuste de Stock</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Producto *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) - Actual: {p.stock}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Ajuste</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'agregar' }))}
                    className={`py-2 rounded-lg border flex items-center justify-center gap-2 ${formData.type === 'agregar' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-input'}`}
                  >
                    <TrendingUp className="w-4 h-4" /> Entradas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'restar' }))}
                    className={`py-2 rounded-lg border flex items-center justify-center gap-2 ${formData.type === 'restar' ? 'bg-destructive text-white border-destructive' : 'border-input'}`}
                  >
                    <TrendingDown className="w-4 h-4" /> Salidas
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Cantidad *</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Motivo</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="Ajuste manual">Ajuste manual</option>
                  <option value="Recepción de pedido">Recepción de pedido</option>
                  <option value="Devolución de cliente">Devolución de cliente</option>
                  <option value="Merma/Deterioro">Merma/Deterioro</option>
                  <option value="Consumo interno">Consumo interno</option>
                  <option value="Error de inventario">Error de inventario</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Notas adicionales</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={2}
                  placeholder="Opcional..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-white font-medium ${formData.type === 'agregar' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-destructive hover:bg-destructive/90'}`}
                >
                  Confirmar {formData.type === 'agregar' ? 'Entrada' : 'Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
