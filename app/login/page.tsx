"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ShoppingCart } from "lucide-react"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // For this system, we use username as email format
      const email = username.includes("@") ? username : `${username}@aurapos.local`
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError("Usuario o contraseña incorrectos")
        return
      }

      // Get user profile to check role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        // Redirect based on role or special Super Admin email
        const isSuperAdminEmail = email.toLowerCase() === 'josebdo91@gmail.com'
        
        if (isSuperAdminEmail || profile?.role === "super_admin" || profile?.role === "saas_assistant") {
          router.push("/superadmin")
        } else {
          router.push("/dashboard")
        }
      } else {
        router.push("/dashboard")
      }
      
      router.refresh()
    } catch {
      setError("Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const email = username.includes("@") ? username : `${username}@aurapos.local`
      
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError || !authData.user) {
        setError(signupError?.message || "Error al registrar usuario")
        return
      }

      // 1. Check if this email matches any tenant as owner
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_email", email) // We'll add this column logic or just check a metadata
        .single()

      // 2. Create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          username: username.split("@")[0],
          full_name: fullName,
          email: email,
          role: tenant ? "admin" : "vendedor", // Default to vendedor if no tenant match
          tenant_id: tenant?.id || null,
        })

      if (profileError) {
        console.error("Profile creation error:", profileError)
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError("Error durante el registro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-lg overflow-hidden">
              <img src="/aura-pos.png" alt="aurapos logo" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              aura<span className="text-cyan-600">pos</span>
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-70 italic">Soft & Gest</p>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 italic uppercase tracking-widest text-[10px]">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 italic uppercase tracking-widest text-[10px]">
                {mode === "login" ? "Usuario / Email" : "Email de Registro"}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 italic uppercase tracking-widest text-[10px]">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              {loading ? "Procesando..." : mode === "login" ? "Iniciar Sesión" : "Crear Mi Cuenta"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
              <button 
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:text-cyan-700 transition-colors"
              >
                {mode === "login" ? "¿Eres un nuevo cliente? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
          </div>

          <p className="text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-6 opacity-50">
            aurapos - Gestión Inteligente
          </p>
        </div>
      </div>
    </div>
  )
}
