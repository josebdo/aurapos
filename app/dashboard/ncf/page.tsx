"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Receipt, 
  Save, 
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function NCFPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sequences, setSequences] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    next_number: 0,
    is_active: true
  })

  const loadSequences = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("ncf_sequences")
      .select("*")
      .order("type", { ascending: true })
    
    if (data) setSequences(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSequences()
  }, [])

  const handleEdit = (seq: any) => {
    setEditingId(seq.id)
    setEditForm({
      next_number: seq.next_number,
      is_active: seq.is_active
    })
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("ncf_sequences")
        .update({
          next_number: editForm.next_number,
          is_active: editForm.is_active,
          updated_at: new Date()
        })
        .eq("id", id)

      if (error) throw error
      setEditingId(null)
      loadSequences()
      toast.success("Secuencia de NCF actualizada correctamente")
    } catch (error) {
      console.error("Error updating sequence:", error)
      toast.error("Error al actualizar la secuencia")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Comprobantes NCF</h1>
            <p className="text-sm text-muted-foreground">Gestiona las secuencias de Números de Comprobante Fiscal (RD)</p>
          </div>
        </div>
        <button 
          onClick={loadSequences}
          className="p-2 border border-input rounded-lg hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Sequence Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Secuencias Activas
            </h2>
          </div>
          
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/20">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Prefijo</th>
                <th className="px-6 py-4">Siguiente No.</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sequences.map((seq) => (
                <tr key={seq.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{seq.type}</td>
                  <td className="px-6 py-4 font-medium">{seq.name}</td>
                  <td className="px-6 py-4 opacity-70 font-mono tracking-widest">{seq.prefix}</td>
                  <td className="px-6 py-4">
                    {editingId === seq.id ? (
                      <input
                        type="number"
                        value={editForm.next_number}
                        onChange={(e) => setEditForm({...editForm, next_number: parseInt(e.target.value)})}
                        className="w-24 px-2 py-1 border border-primary rounded bg-background"
                      />
                    ) : (
                      <span className="font-mono text-emerald-500 font-bold">
                        {seq.next_number.toString().padStart(8, '0')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === seq.id ? (
                      <button 
                        onClick={() => setEditForm({...editForm, is_active: !editForm.is_active})}
                        className={`p-1 rounded ${editForm.is_active ? 'text-emerald-500' : 'text-red-500'}`}
                      >
                        {editForm.is_active ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${seq.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-bold uppercase">{seq.is_active ? 'Activa' : 'Inactiva'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === seq.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs hover:bg-muted rounded border border-input transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleSave(seq.id)}
                          disabled={saving}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all flex items-center gap-1"
                        >
                          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEdit(seq)}
                        className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sequences.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                    No se han encontrado secuencias de NCF. Asegúrese de correr la migración SQL.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-amber-700 mb-1">Información sobre NCF</h3>
            <p className="text-sm text-amber-600/80 leading-relaxed">
              El sistema generará automáticamente el siguiente número disponible según el tipo seleccionado en el Punto de Venta (POS). Si necesita reiniciar una secuencia o corregir un salto, puede editar el campo <strong>Siguiente No.</strong> directamente aquí. El NCF resultante tendrá siempre el formato oficial (ej: B0200000001).
            </p>
          </div>
        </div>

        {/* NCF Preview Example */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Vista Previa del Formato</h3>
            <div className="flex items-center gap-4 font-mono text-2xl">
                <div className="px-4 py-2 bg-slate-800 rounded-lg text-primary border border-primary/20">B02</div>
                <ArrowRight className="text-slate-600" />
                <div className="px-4 py-2 bg-slate-800 rounded-lg text-emerald-400">00000123</div>
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">Ejemplo de una Factura de Consumo generada por el sistema.</p>
        </div>
      </div>
    </div>
  )
}
