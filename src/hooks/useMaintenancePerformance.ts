 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 
 export interface WorkerPerformance {
   user_id: string;
   full_name: string | null;
   email: string;
   completed_count: number;
   pending_count: number;
   in_progress_count: number;
   total_assigned: number;
   avg_resolution_hours: number | null;
   avg_rating: number | null;
   total_ratings: number;
 }
 
 export interface PerformanceStats {
   total_workers: number;
   total_completed: number;
   total_pending: number;
   overall_avg_resolution_hours: number | null;
   overall_avg_rating: number | null;
   workers: WorkerPerformance[];
 }
 
 export function useMaintenancePerformance() {
   return useQuery({
     queryKey: ["maintenance-performance"],
     queryFn: async (): Promise<PerformanceStats> => {
       // Get all maintenance users
       const { data: maintenanceUsers, error: usersError } = await supabase.rpc(
         "get_maintenance_users"
       );
       if (usersError) throw usersError;
 
       // Get all maintenance requests with assignments
       const { data: requests, error: requestsError } = await supabase
         .from("maintenance_requests")
         .select("id, assigned_to, status, created_at, resolved_at, rating");
       if (requestsError) throw requestsError;
 
       // Calculate stats per worker
       const workerStats = new Map<string, {
         completed: number;
         pending: number;
         in_progress: number;
         resolution_times: number[];
         ratings: number[];
       }>();
 
       // Initialize all maintenance users
       maintenanceUsers?.forEach((user: { user_id: string }) => {
         workerStats.set(user.user_id, {
           completed: 0,
           pending: 0,
           in_progress: 0,
           resolution_times: [],
           ratings: [],
         });
       });
 
       // Process requests
       requests?.forEach((req) => {
         if (!req.assigned_to) return;
         
         let stats = workerStats.get(req.assigned_to);
         if (!stats) {
           stats = { completed: 0, pending: 0, in_progress: 0, resolution_times: [], ratings: [] };
           workerStats.set(req.assigned_to, stats);
         }
 
         if (req.status === "completed") {
           stats.completed++;
           if (req.resolved_at && req.created_at) {
             const hours = (new Date(req.resolved_at).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60);
             stats.resolution_times.push(hours);
           }
           if (req.rating) {
             stats.ratings.push(req.rating);
           }
         } else if (req.status === "in_progress") {
           stats.in_progress++;
         } else if (req.status === "pending") {
           stats.pending++;
         }
       });
 
       // Build worker performance array
       const workers: WorkerPerformance[] = (maintenanceUsers || []).map((user: { user_id: string; full_name: string | null; email: string }) => {
         const stats = workerStats.get(user.user_id) || {
           completed: 0,
           pending: 0,
           in_progress: 0,
           resolution_times: [],
           ratings: [],
         };
 
         const avgResolution = stats.resolution_times.length > 0
           ? stats.resolution_times.reduce((a, b) => a + b, 0) / stats.resolution_times.length
           : null;
 
         const avgRating = stats.ratings.length > 0
           ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
           : null;
 
         return {
           user_id: user.user_id,
           full_name: user.full_name,
           email: user.email,
           completed_count: stats.completed,
           pending_count: stats.pending,
           in_progress_count: stats.in_progress,
           total_assigned: stats.completed + stats.pending + stats.in_progress,
           avg_resolution_hours: avgResolution,
           avg_rating: avgRating,
           total_ratings: stats.ratings.length,
         };
       });
 
       // Calculate overall stats
       const allResolutionTimes = workers.flatMap((w) =>
         w.avg_resolution_hours !== null ? [w.avg_resolution_hours] : []
       );
       const allRatings = workers.flatMap((w) =>
         w.avg_rating !== null ? [w.avg_rating] : []
       );
 
       return {
         total_workers: workers.length,
         total_completed: workers.reduce((sum, w) => sum + w.completed_count, 0),
         total_pending: workers.reduce((sum, w) => sum + w.pending_count, 0),
         overall_avg_resolution_hours: allResolutionTimes.length > 0
           ? allResolutionTimes.reduce((a, b) => a + b, 0) / allResolutionTimes.length
           : null,
         overall_avg_rating: allRatings.length > 0
           ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
           : null,
         workers: workers.sort((a, b) => b.completed_count - a.completed_count),
       };
     },
   });
 }