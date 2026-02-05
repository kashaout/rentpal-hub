import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

interface RateLimitEntry {
  id: string;
  identifier: string;
  attempts: number;
  first_attempt: string;
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,           // Maximum attempts before blocking
  windowMs: 15 * 60 * 1000, // 15 minute window
  blockDurationMs: 30 * 60 * 1000, // 30 minute block
}

function getClientIdentifier(req: Request): string {
  // Use X-Forwarded-For header or fall back to a hash of the request
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRateLimit(identifier: string, supabaseAdmin: any): Promise<{ allowed: boolean; message: string }> {
  const now = Date.now()
  
  // Fetch rate limit entry from database
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .single()
  
  const entry = data as RateLimitEntry | null

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('Rate limit check error:', error)
    // Allow on error to not block legitimate users
    return { allowed: true, message: '' }
  }

  if (!entry) {
    // Create new entry
    await supabaseAdmin.from('rate_limits').insert({
      identifier,
      attempts: 1,
      first_attempt: new Date(now).toISOString(),
      blocked_until: null
    })
    return { allowed: true, message: '' }
  }

  const blockedUntil = entry.blocked_until ? new Date(entry.blocked_until as string).getTime() : null
  const firstAttempt = new Date(entry.first_attempt as string).getTime()

  // Check if blocked
  if (blockedUntil && now < blockedUntil) {
    const remainingMinutes = Math.ceil((blockedUntil - now) / 60000)
    return { 
      allowed: false, 
      message: `Too many login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
    }
  }

  // Reset if block expired
  if (blockedUntil && now >= blockedUntil) {
    await supabaseAdmin
      .from('rate_limits')
      .update({
        attempts: 1,
        first_attempt: new Date(now).toISOString(),
        blocked_until: null
      })
      .eq('identifier', identifier)
    return { allowed: true, message: '' }
  }

  // Reset if window expired
  if (now - firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    await supabaseAdmin
      .from('rate_limits')
      .update({
        attempts: 1,
        first_attempt: new Date(now).toISOString(),
        blocked_until: null
      })
      .eq('identifier', identifier)
    return { allowed: true, message: '' }
  }

  // Check max attempts
  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    const newBlockedUntil = new Date(now + RATE_LIMIT_CONFIG.blockDurationMs).toISOString()
    await supabaseAdmin
      .from('rate_limits')
      .update({ blocked_until: newBlockedUntil })
      .eq('identifier', identifier)
    return { 
      allowed: false, 
      message: `Too many login attempts. Please try again in 30 minutes.`
    }
  }

  // Increment attempts
  await supabaseAdmin
    .from('rate_limits')
    .update({ attempts: entry.attempts + 1 })
    .eq('identifier', identifier)
  return { allowed: true, message: '' }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Admin client for rate limiting (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const clientId = getClientIdentifier(req)
    const rateCheck = await checkRateLimit(clientId, supabaseAdmin)

    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateCheck.message, code: 'RATE_LIMITED' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { action, email, password, fullName, role } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Password length check
    if (password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Password must be between 6 and 128 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client for auth operations (uses anon key)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    let result

    if (action === 'signup') {
      // Validate full name if provided
      if (fullName && (fullName.length < 1 || fullName.length > 100)) {
        return new Response(
          JSON.stringify({ error: 'Full name must be between 1 and 100 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate role if provided
      // Only allow self-registration for tenant and landlord roles
      // Admin, consultant, and maintenance roles must be assigned by admins
      const validRoles = ['tenant', 'landlord']
      if (role && !validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role. You can only register as a landlord or tenant.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email,
            role: role || 'tenant',
          },
        },
      })
    } else if (action === 'signin') {
      result = await supabase.auth.signInWithPassword({
        email,
        password,
      })
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "signup" or "signin"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (result.error) {
      // Don't reveal whether email exists for security
      const safeMessage = result.error.message.includes('Invalid login credentials')
        ? 'Invalid email or password'
        : result.error.message.includes('User already registered')
        ? 'An account with this email already exists'
        : 'Authentication failed. Please try again.'

      return new Response(
        JSON.stringify({ error: safeMessage }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // On successful auth, we could reset rate limit for this identifier
    // But keeping some history helps prevent abuse patterns
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: result.data.user,
        session: result.data.session 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auth error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
