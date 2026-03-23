"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Users, 
  Search, 
  Plus, 
  RefreshCw, 
  UserCircle,
  Shield,
  ShieldCheck,
  UserPlus,
  X,
  Lock,
  Mail,
  MoreVertical,
  CheckCircle2,
  XCircle,
  HardDrive,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const supabase = createClient()

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>("vendedor")
  const [branches, setBranches] = useState<any[]>([])
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "cajero",
    password: "",
    branch_id: "",
  })

  const loadUsers = async () => {
    const [usersRes, tenantRes, branchesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*, tenants(*, subscription_plans(*))").single(),
      supabase.from("branches").select("*")
    ])
    
    if (usersRes.data) setUsers(usersRes.data)
    if (tenantRes.data) {
      setTenantInfo(tenantRes.data.tenants)
      setCurrentUserRole(tenantRes.data.role)
    }
    if (branchesRes.data) setBranches(branchesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", id)
    
    if (error) {
      alert("Error al actualizar estado")
    } else {
      loadUsers()
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id)
    
    if (error) {
      alert("Error al actualizar rol")
    } else {
      loadUsers()
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground">Administra quién tiene acceso al sistema y sus roles</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Modal Nueva Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Agregar Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  // Plan limit check
                  if (tenantInfo?.subscription_plans) {
                    const limit = tenantInfo.subscription_plans.user_limit
                    if (limit !== -1 && users.length >= limit) {
                      toast.error(`Has alcanzado el límite de ${limit} usuarios de tu plan ${tenantInfo.subscription_plans.name}.`)
                      return
                    }
                  }

                  const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                      data: {
                        full_name: formData.full_name,
                        tenant_id: tenantInfo?.id,
                        branch_id: formData.branch_id || null,
                      }
                    }
                  })
                  
                  if (authError) throw authError

                  // Profile is usually created via trigger, but we can ensure it here if needed
                  // However, signUp logs in the user by default unless redirected.
                  
                  toast.success("Usuario registrado. Se ha enviado un correo de confirmación.")
                  setShowModal(false)
                  setFormData({ email: "", full_name: "", role: "cajero", password: "", branch_id: "" })
                  loadUsers()
                } catch (error: any) {
                  console.error("Error creating user:", error)
                  toast.error("Error: " + error.message)
                }
              }} 
              className="p-4 space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Correo Electrónico *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Contraseña *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {(currentUserRole === "super_admin" || currentUserRole === "saas_assistant") && (
                    <>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                  <option value="cajero">Cajero</option>
                  <option value="vendedor">Vendedor</option>
                </select>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Sucursal asignada</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    <option value="">Seleccionar sucursal</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats/Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Super Admins</p>
            <p className="text-xl font-black">{users.filter(u => u.role === 'super_admin').length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Admins</p>
            <p className="text-xl font-black">{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Cajeros</p>
            <p className="text-xl font-black">{users.filter(u => u.role === 'cajero').length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Vendedores</p>
            <p className="text-xl font-black">{users.filter(u => u.role === 'vendedor').length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Usuario</th>
                <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Correo</th>
                <th className="text-center p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Rol</th>
                <th className="text-center p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Estado</th>
                <th className="text-center p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground italic">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground italic">No se encontraron usuarios</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-sm">{user.full_name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight outline-none border-none cursor-pointer appearance-none text-center",
                          user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' :
                          user.role === 'admin' ? 'bg-primary/10 text-primary' :
                          user.role === 'cajero' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        )}
                      >
                        {(currentUserRole === "super_admin" || currentUserRole === "saas_assistant") && (
                          <>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                          </>
                        )}
                        <option value="cajero">Cajero</option>
                        <option value="vendedor">Vendedor</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        user.is_active ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-destructive/5 text-destructive border-destructive/20'
                      }`}>
                        {user.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className={`p-2 rounded-lg transition-colors ${user.is_active ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                          title={user.is_active ? "Desactivar" : "Activar"}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg">
                          <MoreVertical className="w-4 h-4" />
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

      {/* Note: Registration is usually special in Supabase, but UI shows where it would be */}
      <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 text-slate-500">
        <ShieldCheck className="w-10 h-10 opacity-20" />
        <p className="text-sm">
          Los nuevos usuarios registrados en el sistema aparecen aquí automáticamente. Puedes cambiar sus roles o desactivar su acceso temporalmente desde esta tabla.
        </p>
      </div>
    </div>
  )
}
