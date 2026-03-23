import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Get user profile with tenant and plan info
  let { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(*, subscription_plans(*))")
    .eq("id", user.id)
    .single()

  // Auto-recovery: If profile missing but auth user exists
  if (!profile) {
    const email = user.email?.toLowerCase()
    
    // Check if they are a tenant owner
    const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_email", email)
        .single()
    
    // Check for super admin email (Jose)
    const isSuperAdmin = profile?.role === 'super_admin'
    const role = isSuperAdmin ? 'super_admin' : (tenant ? 'admin' : 'vendedor')
    
    const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
            id: user.id,
            email: email,
            username: email?.split("@")[0] || 'usuario',
            full_name: user.user_metadata?.full_name || 'Usuario',
            role: role,
            tenant_id: tenant?.id || null
        })
        .select("*, tenants(*, subscription_plans(*))")
        .single()
    
    if (!createError) {
        profile = newProfile
    } else {
        console.error("Auto-recovery error:", createError.message)
    }
  }

  const userData = {
    username: profile?.username || user.email?.split("@")[0] || "Usuario",
    role: profile?.role || (user.email?.toLowerCase() === 'josebdo91@gmail.com' ? 'super_admin' : 'visitante'),
    tenant: profile?.tenants || null,
    plan: profile?.tenants?.subscription_plans?.name || "Sin Plan",
    planData: profile?.tenants?.subscription_plans || null,
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
