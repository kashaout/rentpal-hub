import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory rate limiting store (resets on function cold start)
// For production, consider using Redis or a database table
const rateLimitStore = new Map<string, { attempts: number; firstAttempt: number; blockedUntil: number | null }>()

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

function checkRateLimit(identifier: string): { allowed: boolean; message: string } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry) {
    rateLimitStore.set(identifier, { attempts: 1, firstAttempt: now, blockedUntil: null })
    return { allowed: true, message: '' }
  }

  // Check if blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / 60000)
    return { 
      allowed: false, 
      message: `Too many login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
    }
  }

  // Reset if block expired
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    rateLimitStore.set(identifier, { attempts: 1, firstAttempt: now, blockedUntil: null })
    return { allowed: true, message: '' }
  }

  // Reset if window expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.set(identifier, { attempts: 1, firstAttempt: now, blockedUntil: null })
    return { allowed: true, message: '' }
  }

  // Check max attempts
  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    const blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs
    rateLimitStore.set(identifier, { ...entry, blockedUntil })
    return { 
      allowed: false, 
      message: `Too many login attempts. Please try again in 30 minutes.`
    }
  }

  // Increment attempts
  rateLimitStore.set(identifier, { ...entry, attempts: entry.attempts + 1 })
  return { allowed: true, message: '' }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientId = getClientIdentifier(req)
    const rateCheck = checkRateLimit(clientId)

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    
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
      const validRoles = ['tenant', 'landlord', 'consultant', 'admin']
      if (role && !validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role specified' }),
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
