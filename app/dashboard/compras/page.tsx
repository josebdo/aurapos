"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Purchase, Supplier, Product } from "@/lib/types"
import { ShoppingBag, Search, Plus, RefreshCw, Eye, X, Trash2 } from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { rate, formatMain, formatSecondary, formatDop } = useExchangeRate()

  // Form state
  const [formData, setFormData] = useState({
    supplier_id: "",
    invoice_number: "",
    invoice_date: "",
    discount: "0",
    notes: "",
  })
  const [purchaseItems, setPurchaseItems] = useState<{ product_id: string; quantity: string; unit_cost: string }[]>([])

  const loadData = async () => {
    setLoading(true)
    const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(*)").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
    ])
    if (purchasesRes.data) setPurchases(purchasesRes.data)
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    if (productsRes.data) setProducts(productsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = !searchQuery || p.number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSupplier = !selectedSupplier || p.supplier_id === selectedSupplier
    const matchesStatus = !selectedStatus || p.status === selectedStatus
    return matchesSearch && matchesSupplier && matchesStatus
  })

  const addItem = () => {
    setPurchaseItems(prev => [...prev, { product_id: "", quantity: "", unit_cost: "" }])
  }

  const removeItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string) => {
    setPurchaseItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const calculateTotal = () => {
    const subtotal = purchaseItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
    }, 0)
    const discountRd = parseFloat(formData.discount) || 0
    const discountUsd = discountRd / rate
    return Math.max(0, subtotal - discountUsd)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (purchaseItems.length === 0 || purchaseItems.some(item => !item.product_id)) {
      alert("Agrega al menos un producto")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const today = new Date()
      const dateStr = today.toISOString().split("T")[0].replace(/-/g, "")
      const { count } = await supabase
        .from("purchases")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString().split("T")[0])
      
      const purchaseNumber = `COMP${dateStr}-${String((count || 0) + 1).padStart(4, "0")}`

      const subtotal = purchaseItems.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
      }, 0)
      const discountRd = parseFloat(formData.discount) || 0
      const discountUsd = discountRd / rate
      const total = Math.max(0, subtotal - discountUsd)

      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          number: purchaseNumber,
          supplier_id: formData.supplier_id || null,
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          subtotal,
          discount: discountUsd,
          total,
          total_bs: total * rate,
          exchange_rate: rate,
          status: "completada",
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single()

      if (purchaseError) throw purchaseError

      // Create purchase items
      const items = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: parseInt(item.quantity) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
        total: (parseInt(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
      }))
      await supabase.from("purchase_items").insert(items)

      // Update stock
      for (const item of purchaseItems) {
        const product = products.find(p => p.id === item.product_id)
        if (product) {
          await supabase
            .from("products")
            .update({ stock: product.stock + (parseInt(item.quantity) || 0) })
            .eq("id", item.product_id)
        }
      }

      setShowModal(false)
      resetForm()
      loadData()
      alert(`Compra ${purchaseNumber} registrada correctamente`)
    } catch (error) {
      console.error("Error saving purchase:", error)
      toast.error("Error al guardar la compra")
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      invoice_number: "",
      invoice_date: "",
      discount: "0",
      notes: "",
    })
    setPurchaseItems([])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completada": return "bg-emerald-500/10 text-emerald-600"
      case "pendiente": return "bg-amber-500/10 text-amber-600"
      case "cancelada": return "bg-destructive/10 text-destructive"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Compras</h1>
            <p className="text-sm text-muted-foreground">Registra y gestiona las compras a proveedores</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Compra
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg">
          <Search className="w-4 h-4" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número, factura o p..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="px-4 py-2 rounded-lg border border-input bg-background"
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-input bg-background"
        >
          <option value="">Todos los estados</option>
          <option value="completada">Completada</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button onClick={loadData} className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">NÚMERO</th>
                <th className="text-left p-4 font-medium text-muted-foreground">PROVEEDOR</th>
                <th className="text-left p-4 font-medium text-muted-foreground">FACTURA</th>
                <th className="text-right p-4 font-medium text-muted-foreground">TOTAL (USD)</th>
                <th className="text-right p-4 font-medium text-muted-foreground">TOTAL (RD$)</th>
                <th className="text-left p-4 font-medium text-muted-foreground">FECHA</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ESTADO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">No hay compras</td>
                </tr>
              ) : (
                filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4 font-medium">{purchase.number}</td>
                    <td className="p-4">{purchase.supplier?.name || "-"}</td>
                    <td className="p-4 text-muted-foreground">{purchase.invoice_number || "-"}</td>
                    <td className="p-4 text-right font-medium">{formatMain(purchase.total)}</td>
                    <td className="p-4 text-right text-muted-foreground">{formatSecondary(purchase.total_bs)}</td>
                    <td className="p-4 text-muted-foreground">{new Date(purchase.created_at).toLocaleDateString("es-DO")}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(purchase.status)}`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filteredPurchases.length} compras
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">Nueva Compra</h2>
                <p className="text-sm text-muted-foreground">Registrar compra recibida (entra a inventario)</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Tasa: 1 USD = RD$ {rate.toFixed(2)}</p>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Proveedor *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    required
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descuento (RD$)</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Número de Factura</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="Factura del proveedor"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha de Factura</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Agregar productos</label>
                  <button type="button" onClick={addItem} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                    + Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {purchaseItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, "product_id", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="Cantidad"
                        className="w-24 px-3 py-2 rounded-lg border border-input bg-background"
                      />
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                        placeholder="Costo unitario (USD)"
                        step="0.01"
                        className="w-36 px-3 py-2 rounded-lg border border-input bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-10 h-10 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {purchaseItems.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Agrega productos a la compra</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={2}
                />
              </div>

              {/* Total */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <div className="text-right">
                    <p>{formatMain(calculateTotal())}</p>
                    <p className="text-sm text-muted-foreground">{formatSecondary(calculateTotal())}</p>
                    <p className="text-sm text-muted-foreground">{formatDop(calculateTotal() * rate)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                  Cerrar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
