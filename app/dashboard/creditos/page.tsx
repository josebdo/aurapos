"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Credit, CreditPayment, Client } from "@/lib/types"
import { 
  CreditCard, 
  Search, 
  Plus, 
  RefreshCw, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  History,
} from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function CreditosPage() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const { formatMain } = useExchangeRate()

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("credits")
      .select("*, client:clients(*), sale:sales(*)")
      .order("created_at", { ascending: false })
    
    if (data) setCredits(data)
    if (error) console.error("Error loading credits:", error)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCredit || !paymentAmount) return
    const amount = parseFloat(paymentAmount)
    if (amount <= 0 || amount > selectedCredit.balance) {
      alert("Monto inválido")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 1. Create payment record
      const { error: payError } = await supabase.from("credit_payments").insert({
        credit_id: selectedCredit.id,
        amount,
        payment_method: paymentMethod,
        created_by: user?.id
      })
      if (payError) throw payError

      // 2. Update credit balance
      const newPaid = selectedCredit.paid + amount
      const newBalance = selectedCredit.total - newPaid
      const newStatus = newBalance <= 0 ? 'pagado' : 'pendiente'
      
      const { error: credError } = await supabase
        .from("credits")
        .update({ 
          paid: newPaid, 
          balance: newBalance,
          status: newStatus
        })
        .eq("id", selectedCredit.id)

      if (credError) throw credError

      setShowModal(false)
      loadData()
      setPaymentAmount("")
      toast.success("Abono registrado correctamente")
    } catch (error) {
      console.error("Error saving payment:", error)
      toast.error("Error al registrar el pago")
    }
  }

  const filteredCredits = credits.filter(c => {
    const matchesSearch = !searchQuery || 
      c.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sale?.number.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: credits.reduce((sum, c) => sum + c.total, 0),
    paid: credits.reduce((sum, c) => sum + Number(c.paid), 0),
    balance: credits.reduce((sum, c) => sum + Number(c.balance), 0),
    overdue: credits.filter(c => c.status === 'vencido').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Créditos (Cuentas por Cobrar)</h1>
            <p className="text-sm text-muted-foreground">Monitorea las ventas a crédito (fiado) y registra los abonos de los clientes.</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 border border-input rounded-lg hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Monto de Créditos</p>
          <p className="text-2xl font-bold">{formatMain(stats.total)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Total Cobrado</p>
          <p className="text-2xl font-bold text-emerald-500">{formatMain(stats.paid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 ring-2 ring-primary/20">
          <p className="text-xs font-bold text-primary uppercase mb-1">Saldo Pendiente</p>
          <p className="text-2xl font-bold text-primary">{formatMain(stats.balance)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-destructive uppercase mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
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
            placeholder="Buscar por cliente o factura..."
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
                <th className="text-left p-4 font-medium text-muted-foreground">CLIENTE</th>
                <th className="text-left p-4 font-medium text-muted-foreground">VENTA</th>
                <th className="text-right p-4 font-medium text-muted-foreground">TOTAL</th>
                <th className="text-right p-4 font-medium text-muted-foreground">PAGADO</th>
                <th className="text-right p-4 font-medium text-muted-foreground">SALDO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ESTADO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No hay créditos registrados</td>
                </tr>
              ) : (
                filteredCredits.map(credit => (
                  <tr key={credit.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium text-sm">{credit.client?.name}</p>
                      <p className="text-xs text-muted-foreground">{credit.client?.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-mono">{credit.sale?.number}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(credit.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatMain(credit.total)}
                    </td>
                    <td className="p-4 text-right text-emerald-600">
                      {formatMain(credit.paid)}
                    </td>
                    <td className="p-4 text-right font-bold text-primary">
                      {formatMain(credit.balance)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        credit.status === 'pagado' ? 'bg-emerald-500 text-white' : 
                        credit.status === 'vencido' ? 'bg-destructive text-white' : 
                        'bg-amber-500 text-white'
                      }`}>
                        {credit.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {credit.balance > 0 && (
                          <button
                            onClick={() => { setSelectedCredit(credit); setShowModal(true) }}
                            className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 font-bold"
                          >
                            Abonar
                          </button>
                        )}
                        <button className="w-8 h-8 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80">
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && selectedCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border bg-emerald-500 text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Registrar Pago de Crédito</h2>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-bold">{selectedCredit.client?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Factura:</span>
                  <span className="font-mono">{selectedCredit.sale?.number}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Saldo Pendiente:</span>
                  <span className="font-bold text-primary text-lg">{formatMain(selectedCredit.balance)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Monto a Pagar (USD) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background font-bold text-lg"
                    placeholder="0.00"
                    max={selectedCredit.balance}
                    required
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setPaymentAmount(selectedCredit.balance.toString())}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Pagar saldo total
                </button>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="deposito">Depósito</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold flex-1"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
