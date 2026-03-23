"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import { 
  Banknote, 
  History, 
  TrendingUp, 
  Save, 
  RefreshCw,
  ArrowRightLeft,
  Calendar,
} from "lucide-react"

const supabase = createClient()

export default function TasaCambioPage() {
  const [history, setHistory] = useState<any[]>([])
  const [newRate, setNewRate] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { currentRate, refreshRate } = useExchangeRate()

  const loadHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    if (data) setHistory(data)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const rate = parseFloat(newRate)
    if (!rate || rate <= 0) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from("exchange_rates").insert({
        rate,
        created_by: user?.id
      })
      if (error) throw error
      
      setNewRate("")
      await refreshRate()
      loadHistory()
      alert("Tasa de cambio actualizada correctamente")
    } catch (error) {
      console.error("Error saving rate:", error)
      alert("Error al actualizar la tasa")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tasa de Cambio</h1>
            <p className="text-sm text-muted-foreground">Define el valor del dólar en pesos dominicanos (DOP)</p>
          </div>
        </div>
        <button 
          onClick={loadHistory}
          className="p-2 border border-input rounded-lg hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Update Form */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Actualizar Tasa
            </h2>
            
            {/* Current Rate Badge */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Tasa Actual</p>
                <p className="text-3xl font-black text-primary">{currentRate.toFixed(2)} <span className="text-sm font-medium">RD$/$</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nueva Tasa (RD$ por 1 USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background font-bold text-xl text-center focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Ej: 58.50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Nueva Tasa
              </button>
            </form>
          </div>

          {/* Quick Info */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
            <p className="text-sm text-amber-600 leading-relaxed font-medium">
              Nota: Al cambiar la tasa, todos los precios calculados en pesos dominicanos en el POS y reportes se actualizarán automáticamente. Las facturas emitidas anteriormente conservan la tasa que tenían al momento de la venta.
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Historial Reciente
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {history.map((h, i) => (
              <div key={h.id} className="p-4 border-b border-border last:border-0 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">{h.rate.toFixed(2)} RD$</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {i > 0 && (
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.rate > history[i-1].rate ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {h.rate > history[i-1].rate ? 'Subió' : 'Bajó'}
                  </div>
                )}
                {i === 0 && (
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">Actual</span>
                )}
              </div>
            ))}
            {history.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                No hay historial de tasas registrado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
