"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Building2, 
  Search, 
  Edit2, 
  Shield, 
  Activity, 
  Clock,
  Plus,
  X,
  Key,
  Trash2,
  ShieldAlert,
  Gift,
  Check,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { registerStaff } from "@/app/actions/auth"

const supabase = createClient()

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewModal, setShowNewModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)

  // Form states
  const [newTenantData, setNewTenantData] = useState({
    name: "",
    email: "",
    password: "",
    plan_id: "",
  })

  const [renewalData, setRenewalData] = useState({
    months: 1,
    customMonths: "",
    discount: 0,
  })

  const loadData = async () => {
    setLoading(true)
    const [tenantsRes, plansRes] = await Promise.all([
      supabase.from("tenants").select("*, subscription_plans(*)").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*"),
    ])
    
    if (tenantsRes.data) setTenants(tenantsRes.data)
    if (plansRes.data) setPlans(plansRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdatePlan = async (tenantId: string, planId: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({ plan_id: planId })
      .eq("id", tenantId)
    
    if (error) {
      toast.error("Error al actualizar plan")
    } else {
      toast.success("Plan actualizado correctamente")
      loadData()
    }
  }

  const handleUpdateStatus = async (tenantId: string, status: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({ status: status })
      .eq("id", tenantId)
    
    if (error) {
      toast.error("Error al actualizar estado")
    } else {
      toast.success(status === 'active' ? "Negocio activado" : "Negocio suspendido")
      loadData()
    }
  }

  const handleSupportMode = async (tenantId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("id", user.id)

    if (error) {
      toast.error("Error al iniciar modo soporte")
    } else {
      toast.success("Entrando en Modo Soporte / Auditoría...")
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 1000)
    }
  }

  const handleLinkOwner = async (tenantId: string, email: string) => {
    if (!email) {
      toast.error("El negocio no tiene un email de dueño asignado")
      return
    }

    // 1. Find user by email
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single()

    if (findError || !profile) {
      toast.error("No se encontró ningún usuario con ese email registrado")
      return
    }

    // 2. Link tenant to profile
    const { error: linkError } = await supabase
      .from("profiles")
      .update({ 
        tenant_id: tenantId,
        role: 'admin' // Ensure they are admin of their business
      })
      .eq("id", profile.id)

    if (linkError) {
      toast.error("Error al vincular: " + linkError.message)
    } else {
      toast.success("¡Usuario vinculado como dueño con éxito!")
      loadData()
    }
  }

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el negocio "${name}"? Esta acción borrará todos sus datos vinculados comercialmente.`)) return

    try {
        setLoading(true)
        
        // 1. Unlink current user if they are linked to this tenant (Modo Soporte safety)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase
                .from("profiles")
                .update({ tenant_id: null })
                .eq("id", user.id)
                .eq("tenant_id", id)
        }

        // 2. Clear impersonation from session if deleting the current support tenant
        const impersonating = typeof window !== 'undefined' && localStorage.getItem('impersonated_tenant_id') === id
        if (impersonating) {
            localStorage.removeItem('impersonated_tenant_id')
        }

        // 3. Delete the tenant (Cascade will handle the rest)
        const { error } = await supabase
            .from("tenants")
            .delete()
            .eq("id", id)

        if (error) throw error
        
        toast.success("Negocio eliminado correctamente")
        loadData()
    } catch (err: any) {
        toast.error("Error al eliminar: " + err.message)
    } finally {
        setLoading(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate initial expiration (today + 30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 1. Create the tenant
    const { data: tenant, error } = await supabase.from("tenants").insert({
      name: newTenantData.name,
      plan_id: newTenantData.plan_id,
      status: 'active',
      owner_email: newTenantData.email,
      expires_at: expiresAt.toISOString(),
    }).select().single()

    if (error || !tenant) {
      console.error("Tenant creation error:", error)
      toast.error(`Error al crear negocio: ${error?.message || 'Fallo desconocido'}. ¿Ha aplicado la migración SQL 006?`)
      return
    }

    // 2. Auto-setup business profile
    await supabase.from("business_profile").insert({
        tenant_id: tenant.id,
        name: tenant.name,
    })

    // 3. Register the owner account if password provided
    if (newTenantData.password) {
        const res = await registerStaff(
            newTenantData.email, 
            newTenantData.password, 
            newTenantData.name + " Owner", 
            'admin', 
            tenant.id
        )
        if (res.error) {
            toast.warning("Negocio creado, pero falló el acceso: " + res.error)
        } else {
            toast.success("¡Negocio y acceso de dueño creados!")
        }
    } else {
        toast.success("¡Negocio registrado! El dueño deberá registrarse.")
    }

    setShowNewModal(false)
    setNewTenantData({ name: "", email: "", password: "", plan_id: "" })
    loadData()
  }

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return

    const monthsToRenew = renewalData.months === 0 ? parseInt(renewalData.customMonths) : renewalData.months
    if (isNaN(monthsToRenew) || monthsToRenew <= 0) {
      toast.error("Ingrese una cantidad de meses válida")
      return
    }

    // Calculate new expiration date
    const currentExpiry = selectedTenant.expires_at ? new Date(selectedTenant.expires_at) : new Date()
    const newExpiry = new Date(currentExpiry)
    newExpiry.setMonth(newExpiry.getMonth() + monthsToRenew)

    const { error } = await supabase
      .from("tenants")
      .update({ 
        status: 'active',
        expires_at: newExpiry.toISOString()
      })
      .eq("id", selectedTenant.id)

    if (error) {
      toast.error("Error al renovar: " + error.message)
    } else {
      toast.success(`Suscripción renovada hasta ${newExpiry.toLocaleDateString()}`)
      setShowRenewModal(false)
      loadData()
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subscription_plans?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control de Businesses</h1>
          <p className="text-slate-500 text-[10px] font-black mt-1 uppercase tracking-[0.3em] leading-none">Gestión SaaS & Facturación Proactiva</p>
        </div>
        <div className="flex items-center gap-4 w-full max-w-2xl">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por Nombre, Plan o Email..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                />
            </div>
            <button 
                onClick={() => setShowNewModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
            >
                <Plus size={16} />
                Alta Negocio
            </button>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
              <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800">
                      <th className="px-5 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Negocio / Owner</th>
                      <th className="px-5 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Suscripción</th>
                      <th className="px-5 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic text-center">Estatus</th>
                      <th className="px-5 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Expiración</th>
                      <th className="px-5 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic text-right">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center text-slate-500 font-bold animate-pulse uppercase tracking-[0.3em] text-[10px]">
                        Accediendo al Backplane de Datos...
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        No se encontraron registros de businesses
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map(tenant => {
                      const isExpired = tenant.expires_at && new Date(tenant.expires_at) < new Date()
                      return (
                        <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors group">
                           <td className="px-5 py-6">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                                       <Building2 size={20} />
                                   </div>
                                   <div>
                                       <p className="text-[13px] font-black text-white tracking-tight leading-none">{tenant.name}</p>
                                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter truncate max-w-[120px] mt-1">{tenant.owner_email || 'Sin vincular'}</p>
                                   </div>
                               </div>
                           </td>
                           <td className="px-5 py-6">
                                <select 
                                    value={tenant.plan_id}
                                    onChange={(e) => handleUpdatePlan(tenant.id, e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg text-primary outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-slate-900 transition-colors"
                                >
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (RD${p.price_rd})</option>
                                    ))}
                                </select>
                           </td>
                           <td className="px-5 py-6">
                                <div className="flex justify-center">
                                    <button 
                                        onClick={() => handleUpdateStatus(tenant.id, tenant.status === 'active' ? 'suspended' : 'active')}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all active:scale-90",
                                            tenant.status === 'active' 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                                            : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-lg shadow-red-500/5"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", tenant.status === 'active' ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
                                        {tenant.status === 'active' ? 'Activo' : 'Suspendido'}
                                    </button>
                                </div>
                           </td>
                           <td className="px-5 py-6">
                               <div className={cn(
                                   "flex flex-col text-[10px] font-mono tracking-tighter",
                                   isExpired ? "text-red-400" : "text-slate-400"
                               )}>
                                   <span className="font-bold flex items-center gap-1">
                                       {isExpired && <ShieldAlert size={10} />}
                                       {tenant.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'N/A'}
                                   </span>
                                   <span className="text-[8px] uppercase font-black opacity-50 leading-none mt-1">{isExpired ? 'Vencido' : 'Restantes'}</span>
                               </div>
                           </td>
                           <td className="px-5 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => { setSelectedTenant(tenant); setShowRenewModal(true); }}
                                      className="p-2 text-emerald-500 hover:text-white bg-emerald-500/5 hover:bg-emerald-500 rounded-lg transition-all shadow-md active:scale-90 border border-transparent hover:border-emerald-400/30" 
                                      title="Renovar Suscripción"
                                    >
                                        <Clock size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleSupportMode(tenant.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:brightness-110 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 active:scale-90 border border-primary/50"
                                        title="Entrar en Modo Soporte"
                                    >
                                        <Shield size={12} />
                                        <span>Soporte</span>
                                    </button>
                                    {!tenant.profiles && tenant.owner_email && (
                                        <button 
                                            onClick={() => handleLinkOwner(tenant.id, tenant.owner_email)}
                                            className="w-8 h-8 bg-slate-800 text-amber-500 rounded-lg flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-lg border border-slate-700/50"
                                            title="Vincular Dueño Existente"
                                        >
                                            <Key size={14} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                                        className="w-8 h-8 bg-slate-800 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg border border-slate-700/50"
                                        title="Eliminar Negocio"
                                    >
                                        <Trash2 size={14} />
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
    </div>

    {/* New Tenant Modal */}
    {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-32 duration-500 text-slate-300">
                <div className="p-10 border-b border-slate-800 flex items-center justify-between relative bg-gradient-to-r from-primary/5 to-transparent">
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tighter">ALTA DE NEGOCIO</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Configuración Inicial del Tenant</p>
                    </div>
                    <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-950 p-2 rounded-full border border-slate-800 active:scale-90">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateTenant} className="p-10 space-y-8">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic flex gap-2 items-center">
                                <Building2 size={10} className="text-primary" /> Nombre Comercial
                            </label>
                            <input 
                                type="text" 
                                required
                                value={newTenantData.name}
                                onChange={(e) => setNewTenantData({...newTenantData, name: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-700"
                                placeholder="Ej: Distribuidora Nacional"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic flex gap-2 items-center">
                                <Search size={10} className="text-primary" /> Email del Propietario
                                <span className="text-emerald-500 lowercase opacity-50 ml-auto">Usuario del cliente</span>
                            </label>
                            <input 
                                type="email" 
                                required
                                value={newTenantData.email}
                                onChange={(e) => setNewTenantData({...newTenantData, email: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-700"
                                placeholder="dueño@negocio.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic flex gap-2 items-center">
                                <Key size={10} className="text-primary" /> Contraseña Sugerida
                            </label>
                            <input 
                                type="text" 
                                required
                                value={newTenantData.password}
                                onChange={(e) => setNewTenantData({...newTenantData, password: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-700 font-mono"
                                placeholder="Asigna una contraseña inicial"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic flex gap-2 items-center">
                                <Activity size={10} className="text-primary" /> Plan Seleccionado
                            </label>
                            <select 
                                required
                                value={newTenantData.plan_id}
                                onChange={(e) => setNewTenantData({...newTenantData, plan_id: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Seleccionar Plan...</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} (RD${p.price_rd}/mes)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 bg-primary text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : 'Registrar Business'}
                    </button>
                </form>
            </div>
        </div>
    )}

    {/* Renew Modal */}
    {showRenewModal && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tighter">RENOVAR SUSCRIPCIÓN</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Negocio: {selectedTenant.name}</p>
                    </div>
                    <button onClick={() => setShowRenewModal(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-950 p-2 rounded-full border border-slate-800">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleRenewSubscription} className="p-10 space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Periodo de Extensión</label>
                        <div className="grid grid-cols-5 gap-3">
                            {[1, 2, 3, 6, 12].map(m => (
                                <button 
                                    key={m}
                                    type="button"
                                    onClick={() => setRenewalData({...renewalData, months: m, customMonths: ""})}
                                    className={cn(
                                        "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-90 shadow-lg",
                                        renewalData.months === m 
                                        ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20" 
                                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-emerald-500/50"
                                    )}
                                >
                                    {m} {m === 1 ? 'Mes' : 'Meses'}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">O Cantidad Personalizada (Meses)</label>
                            <input 
                                type="number" 
                                value={renewalData.months === 0 ? renewalData.customMonths : ""}
                                onChange={(e) => setRenewalData({...renewalData, months: 0, customMonths: e.target.value})}
                                placeholder="Ej: 5, 8, 24..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic flex justify-between">
                            Bonificación / Descuento
                            <span className="text-emerald-500 lowercase opacity-60">Control Directo</span>
                        </label>
                        <div className="relative">
                            <Gift size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" />
                            <input 
                                type="number" 
                                value={renewalData.discount}
                                onChange={(e) => setRenewalData({...renewalData, discount: parseInt(e.target.value) || 0})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-5 py-4 text-white text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Subtotal</span>
                            <span className="text-[11px] font-mono text-slate-300">
                                RD${(selectedTenant.subscription_plans?.price_rd * (renewalData.months === 0 ? (parseInt(renewalData.customMonths) || 0) : renewalData.months)).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-400 border-t border-slate-800 pt-4">
                            <span className="text-[11px] font-black uppercase tracking-widest italic">Total a Cobrar</span>
                            <span className="text-xl font-black italic tracking-tighter">
                                RD${Math.max(0, (selectedTenant.subscription_plans?.price_rd * (renewalData.months === 0 ? (parseInt(renewalData.customMonths) || 0) : renewalData.months)) - renewalData.discount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all">
                        Autorizar Pago y Renovar
                    </button>
                    <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest italic">
                        La nueva fecha de expiración se calculará a partir del vencimiento actual.
                    </p>
                </form>
            </div>
        </div>
    )}
    </>
  )
}
