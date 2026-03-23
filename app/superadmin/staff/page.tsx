"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  UserCog, 
  Search, 
  ShieldCheck, 
  UserPlus,
  RefreshCw,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { registerStaff } from "@/app/actions/auth"

const supabase = createClient()

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<"promote" | "register">("promote")
  const [newStaffEmail, setNewStaffEmail] = useState("")
  const [newStaffPassword, setNewStaffPassword] = useState("")
  const [newStaffName, setNewStaffName] = useState("")
  const [newStaffRole, setNewStaffRole] = useState<"super_admin" | "saas_assistant">("saas_assistant")
  const [submitting, setSubmitting] = useState(false)

  const loadStaff = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["super_admin", "saas_assistant"])
    
    if (data) setStaff(data)
    setLoading(false)
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (addMode === "promote") {
        // First, find the user by email in the profiles table
        const { data: userProfile, error: searchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newStaffEmail)
        .single()

        if (searchError || !userProfile) {
        toast.error("El usuario no existe o no tiene el email registrado")
        setSubmitting(false)
        return
        }

        // Promote the user to the selected role
        const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: newStaffRole })
        .eq("id", userProfile.id)

        if (updateError) {
        toast.error("Error al asignar rol de administrador")
        } else {
        toast.success("Nuevo administrador añadido con éxito")
        setShowAddModal(false)
        setNewStaffEmail("")
        loadStaff()
        }
    } else {
        // Register brand new user
        if (newStaffPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            setSubmitting(false)
            return
        }

        const res = await registerStaff(newStaffEmail, newStaffPassword, newStaffName, newStaffRole)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Usuario registrado y perfil creado con éxito")
            setShowAddModal(false)
            setNewStaffEmail("")
            setNewStaffPassword("")
            setNewStaffName("")
            loadStaff()
        }
    }
    setSubmitting(false)
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Personal SaaS</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Administradores de la plataforma central</p>
        </div>
        <div className="flex items-center gap-4 w-full max-w-md">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar admin..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
            <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-all flex items-center justify-center"
            >
                <UserPlus size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Cargando equipo de administración...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500 italic">No se encontraron administradores auxiliares</div>
          ) : (
            filteredStaff.map(admin => (
                <div key={admin.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-start justify-between group hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{admin.full_name || admin.username}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                {admin.role === 'super_admin' ? 'Super Admin' : 'Asistente SaaS'}
                            </p>
                        </div>
                    </div>
                    <button className="text-slate-600 hover:text-white transition-colors">
                        <MoreVertical size={18} />
                    </button>
                </div>
            ))
          )}
      </div>

      <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-6 items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
              <ShieldCheck size={32} />
          </div>
          <div>
              <h4 className="text-amber-400 font-bold mb-1">Seguridad de Acceso</h4>
              <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
                Los usuarios con rol de Super Admin tienen acceso total a todos los negocios y configuraciones críticas del sistema. Asigne este rol únicamente a personal de absoluta confianza.
              </p>
          </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-white">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold">Añadir Personal SaaS</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleAddStaff} className="p-8 space-y-6">
                        <div className="flex bg-slate-950 p-1 rounded-xl mb-6">
                            <button 
                                type="button"
                                onClick={() => setAddMode("promote")}
                                className={cn(
                                    "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    addMode === "promote" ? "bg-slate-800 text-white shadow-xl" : "text-slate-500 hover:text-white"
                                )}
                            >Promover Existente</button>
                            <button 
                                type="button"
                                onClick={() => setAddMode("register")}
                                className={cn(
                                    "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    addMode === "register" ? "bg-emerald-500 text-white shadow-xl" : "text-slate-500 hover:text-white"
                                )}
                            >Registrar Nuevo</button>
                        </div>

                        <div className="space-y-4">
                            {addMode === "register" && (
                                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newStaffName}
                                        onChange={(e) => setNewStaffName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder:text-slate-700 text-sm"
                                        placeholder="Nombre del ayudante"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email del Usuario</label>
                                <input 
                                    type="email" 
                                    required
                                    value={newStaffEmail}
                                    onChange={(e) => setNewStaffEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder:text-slate-700 text-sm"
                                    placeholder="ejemplo@aurapos.local"
                                />
                            </div>

                            {addMode === "register" && (
                                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Contraseña Inicial</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={newStaffPassword}
                                        onChange={(e) => setNewStaffPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder:text-slate-700 text-sm"
                                        placeholder="Min. 6 caracteres"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rol Asignado</label>
                                <select 
                                    value={newStaffRole}
                                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                >
                                    <option value="saas_assistant">Asistente (Ayudante)</option>
                                    <option value="super_admin">Super Administrador (Total)</option>
                                </select>
                            </div>
                        </div>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-4 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Ejecutando...' : addMode === 'promote' ? 'Añadir al Equipo Central' : 'Registrar y Nombrar Ayudante'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
