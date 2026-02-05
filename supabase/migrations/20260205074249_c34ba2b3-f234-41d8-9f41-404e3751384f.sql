-- Add rating column to maintenance_requests for tracking worker performance
ALTER TABLE public.maintenance_requests 
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);

-- Add index for performance queries on completed requests
CREATE INDEX idx_maintenance_requests_assigned_completed 
ON public.maintenance_requests (assigned_to, status) 
WHERE status = 'completed';