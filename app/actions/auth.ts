"use server"

import { createClient } from "@supabase/supabase-js"

export async function registerStaff(email: string, password: string, fullName: string, role: string, tenantId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para registro directo" }
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 1. Create User
  let userId: string | undefined;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })
  
  if (authError) {
    if (authError.message.includes("already been registered")) {
      // Try to find the existing user to get their ID
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        return { error: "El usuario ya existe en Auth pero no se pudo recuperar el ID" };
      }
    } else {
      return { error: authError.message };
    }
  } else {
    userId = authData.user.id;
  }

  // 2. Create or Update Profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      email: email,
      full_name: fullName,
      username: email.split("@")[0],
      role: role,
      tenant_id: tenantId || null
    })

  if (profileError) {
    return { error: "Fallo al crear/vincular el perfil: " + profileError.message }
  }

  return { success: true }
}
