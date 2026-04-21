/**
 * Error sanitization utilities to prevent information leakage
 * Maps database/API error messages to user-friendly messages
 */
import { handleRlsError } from "@/lib/securityLogger";

/**
 * Sanitizes error messages from Supabase/database operations to prevent
 * leaking information about database schema, constraints, or internal structure.
 * 
 * @param error - The error object or message to sanitize
 * @returns A user-friendly error message
 */
export function sanitizeErrorMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();
  
  // Duplicate key / unique constraint violations
  if (lowerMessage.includes('duplicate key') || lowerMessage.includes('unique constraint')) {
    return 'This record already exists';
  }
  
  // Foreign key violations
  if (lowerMessage.includes('foreign key') || lowerMessage.includes('violates foreign key')) {
    return 'Invalid reference - the related record does not exist';
  }
  
  // Check constraint violations
  if (lowerMessage.includes('check constraint')) {
    return 'Invalid data provided - please check your input';
  }
  
  // Row-level security violations — log to security_events
  if (lowerMessage.includes('row-level security') || lowerMessage.includes('rls')) {
    handleRlsError(error, 'unknown', 'unknown');
    return 'You do not have permission to perform this action';
  }
  
  // Not null violations
  if (lowerMessage.includes('null value') || lowerMessage.includes('not-null constraint')) {
    return 'Required field is missing';
  }
  
  // Data type errors
  if (lowerMessage.includes('invalid input syntax') || lowerMessage.includes('type mismatch')) {
    return 'Invalid data format';
  }
  
  // Connection/network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
    return 'Connection error - please check your internet and try again';
  }
  
  // Authentication errors (keep these somewhat specific for UX)
  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid credentials')) {
    return 'Invalid email or password';
  }
  
  if (lowerMessage.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in';
  }
  
  if (lowerMessage.includes('user already registered') || lowerMessage.includes('already exists')) {
    return 'An account with this email already exists';
  }
  
  // Generic fallback - don't expose internal details
  return 'An error occurred. Please try again or contact support if the problem persists.';
}
