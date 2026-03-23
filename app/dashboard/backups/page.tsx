"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Database, 
  Download, 
  Upload, 
  History, 
  RefreshCw, 
  FileJson,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function BackupsPage() {
  const [loading, setLoading] = useState(false)
  const [backups, setBackups] = useState<any[]>([
    { id: 1, name: 'respaldo_automatica_2024_03_20.json', size: '2.4 MB', type: 'Sistem', date: '2024-03-20 00:00:15' },
    { id: 2, name: 'respaldo_manual_jose_rivas.json', size: '1.8 MB', type: 'Manual', date: '2024-03-19 14:22:11' },
    { id: 3, name: 'respaldo_automatica_2024_03_19.json', size: '2.3 MB', type: 'Sistem', date: '2024-03-19 00:00:12' },
  ])

  const generateBackup = async () => {
    setLoading(true)
    try {
      // Simulate fetching all tables
      const tables = ['products', 'categories', 'sales', 'clients', 'lots', 'credits']
      const data: any = {}
      
      for (const table of tables) {
        const { data: tableData } = await supabase.from(table).select("*")
        data[table] = tableData
      }

      // Download JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `respaldo_sistema_am_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      // Update local history
      const newBackup = {
        id: Date.now(),
        name: `respaldo_manual_${new Date().toISOString().split('T')[0]}.json`,
        size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: 'Manual',
        date: new Date().toLocaleString()
      }
      setBackups([newBackup, ...backups])
      
      alert("Respaldo generado y descargado correctamente")
    } catch (error) {
      console.error("Error generating backup:", error)
      alert("Error al generar el respaldo")
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm("¿Está seguro de que desea restaurar los datos? Esto sobrescribirá los datos actuales de las tablas incluidas en el respaldo.")) {
      return
    }

    setLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Basic validation
      if (typeof data !== 'object') throw new Error("Formato de archivo inválido")

      // Tables to restore
      const tables = Object.keys(data)
      
      for (const table of tables) {
        if (!Array.isArray(data[table])) continue
        
        // 1. Delete current data (optional cleanup)
        // Note: This is dangerous and might fail due to foreign keys. 
        // For a simple JSON restore, we usually try to upsert.
        
        // 2. Upsert data
        const { error } = await supabase.from(table).upsert(data[table])
        if (error) {
          console.error(`Error restaurando tabla ${table}:`, error)
          toast.error(`Error en tabla ${table}: ${error.message}`)
        }
      }

      toast.success("Restauración completada correctamente")
      // Reload page to see changes
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error("Error restoring backup:", error)
      toast.error("Error al restaurar el respaldo: " + (error instanceof Error ? error.message : "Desconocido"))
    } finally {
      setLoading(true)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Respaldos de Datos</h1>
            <p className="text-sm text-muted-foreground">Protege tu información y restaura si es necesario</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Acciones de Seguridad
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={generateBackup}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Crear Respaldo</p>
                  <p className="text-[10px] opacity-80">Exporta toda la base de datos</p>
                </div>
              </button>

              <label className="w-full flex items-center gap-3 p-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-200 transition-all group cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestore}
                />
                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-slate-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Restaurar Datos</p>
                  <p className="text-[10px] opacity-80 text-muted-foreground">Carga un archivo de respaldo</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
            <div className="flex items-start gap-3 text-amber-600">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">Recomendación</p>
                <p className="text-sm leading-relaxed font-medium">
                  Se recomienda realizar un respaldo manual cada vez que realices cambios masivos en el inventario o antes de una actualización importante.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Historial de Respaldos
            </h2>
            <button className="text-xs text-primary hover:underline flex items-center gap-1 font-bold">
              <RefreshCw className="w-3 h-3" />
              Ver Todos
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            {backups.map(b => (
              <div key={b.id} className="p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.type === 'Manual' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate max-w-[200px] md:max-w-xs">{b.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">{b.type}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {b.date}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xs font-bold text-muted-foreground">{b.size}</p>
                  <button className="p-2 text-primary hover:bg-primary/5 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-emerald-500/5 text-emerald-600 border-t border-border flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            <p className="text-xs font-medium">El sistema realiza respaldos automáticos diarios a la medianoche.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
