"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Supplier, Purchase } from "@/lib/types"
import { Wallet, Search, Plus, RefreshCw, X } from "lucide-react"

const supabase = createClient()

interface SupplierPaymentWithPurchase {
  id: string
  purchase_id: string
  amount: number
  amount_bs: number
  payment_method: string
  reference: string | null
  notes: string | null
  created_at: string
  purchase?: Purchase
}

export default function PagosProveedoresPage() {
  const [payments, setPayments] = useState<SupplierPaymentWithPurchase[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { rate, formatUsd, formatBs } = useExchangeRate()

  const [formData, setFormData] = useState({
    purchase_id: "",
    amount: "",
    payment_method: "efectivo",
    reference: "",
    notes: "",
  })

  const loadData = async () => {
    setLoading(true)
    const [paymentsRes, purchasesRes, suppliersRes] = await Promise.all([
      supabase.from("supplier_payments").select("*, purchase:purchases(*, supplier:suppliers(*))").order("created_at", { ascending: false }),
      supabase.from("purchases").select("*, supplier:suppliers(*)").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    ])
    if (paymentsRes.data) setPayments(paymentsRes.data)
    if (purchasesRes.data) setPurchases(purchasesRes.data)
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredPayments = payments.filter(p => {
    const matchesSearch = !searchQuery || 
      p.purchase?.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const amount = parseFloat(formData.amount) || 0

      await supabase.from("supplier_payments").insert({
        purchase_id: formData.purchase_id,
        amount,
        amount_bs: amount * rate,
        payment_method: formData.payment_method,
        reference: formData.reference || null,
        notes: formData.notes || null,
        created_by: user?.id,
      })

      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving payment:", error)
      alert("Error al guardar el pago")
    }
  }

  const resetForm = () => {
    setFormData({
      purchase_id: "",
      amount: "",
      payment_method: "efectivo",
      reference: "",
      notes: "",
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pagos a Proveedores</h1>
            <p className="text-sm text-muted-foreground">Gestiona los pagos realizados a proveedores</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Pago
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por compra o referencia..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
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
                <th className="text-left p-4 font-medium text-muted-foreground">COMPRA</th>
                <th className="text-left p-4 font-medium text-muted-foreground">PROVEEDOR</th>
                <th className="text-right p-4 font-medium text-muted-foreground">MONTO (USD)</th>
                <th className="text-right p-4 font-medium text-muted-foreground">MONTO (BS)</th>
                <th className="text-left p-4 font-medium text-muted-foreground">MÉTODO</th>
                <th className="text-left p-4 font-medium text-muted-foreground">REFERENCIA</th>
                <th className="text-left p-4 font-medium text-muted-foreground">FECHA</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No hay pagos registrados</td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4 font-medium">{payment.purchase?.number}</td>
                    <td className="p-4">{payment.purchase?.supplier?.name || "-"}</td>
                    <td className="p-4 text-right font-medium">{formatUsd(payment.amount)}</td>
                    <td className="p-4 text-right text-muted-foreground">{formatBs(payment.amount_bs)}</td>
                    <td className="p-4 capitalize">{payment.payment_method}</td>
                    <td className="p-4 text-muted-foreground">{payment.reference || "-"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(payment.created_at).toLocaleDateString("es-VE")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filteredPayments.length} pagos
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Registrar Pago a Proveedor</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Compra *</label>
                <select
                  value={formData.purchase_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="">Seleccionar compra...</option>
                  {purchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number} - {p.supplier?.name} ({formatUsd(p.total)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Monto (USD) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  step="0.01"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                />
                {formData.amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatBs((parseFloat(formData.amount) || 0) * rate)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Método de Pago</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Referencia</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Número de referencia o comprobante"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
