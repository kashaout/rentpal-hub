 import { useState } from "react";
 import { Loader2, Users, CheckCircle, Clock, Star, TrendingUp, Search } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { useMaintenancePerformance, WorkerPerformance } from "@/hooks/useMaintenancePerformance";
 import { cn } from "@/lib/utils";
 
 function StatCard({
   title,
   value,
   subtitle,
   icon: Icon,
   trend,
 }: {
   title: string;
   value: string | number;
   subtitle?: string;
   icon: React.ElementType;
   trend?: "up" | "down" | "neutral";
 }) {
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between pb-2">
         <CardTitle className="text-sm font-medium text-muted-foreground">
           {title}
         </CardTitle>
         <Icon className="h-4 w-4 text-muted-foreground" />
       </CardHeader>
       <CardContent>
         <div className="text-2xl font-bold">{value}</div>
         {subtitle && (
           <p className={cn(
             "text-xs mt-1",
             trend === "up" && "text-success",
             trend === "down" && "text-destructive",
             !trend && "text-muted-foreground"
           )}>
             {subtitle}
           </p>
         )}
       </CardContent>
     </Card>
   );
 }
 
 function RatingStars({ rating }: { rating: number | null }) {
   if (rating === null) {
     return <span className="text-muted-foreground text-sm">No ratings</span>;
   }
 
   return (
     <div className="flex items-center gap-1">
       {[1, 2, 3, 4, 5].map((star) => (
         <Star
           key={star}
           className={cn(
             "h-4 w-4",
             star <= Math.round(rating)
               ? "fill-warning text-warning"
               : "text-muted-foreground/30"
           )}
         />
       ))}
       <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
     </div>
   );
 }
 
 function WorkerRow({ worker }: { worker: WorkerPerformance }) {
   const initials = worker.full_name
     ?.split(" ")
     .map((n) => n[0])
     .join("")
     .toUpperCase()
     .slice(0, 2) || worker.email[0].toUpperCase();
 
   const completionRate = worker.total_assigned > 0
     ? (worker.completed_count / worker.total_assigned) * 100
     : 0;
 
   const formatHours = (hours: number | null) => {
     if (hours === null) return "N/A";
     if (hours < 24) return `${hours.toFixed(1)}h`;
     return `${(hours / 24).toFixed(1)}d`;
   };
 
   return (
     <TableRow>
       <TableCell>
         <div className="flex items-center gap-3">
           <Avatar className="h-9 w-9">
             <AvatarFallback className="bg-muted text-sm">{initials}</AvatarFallback>
           </Avatar>
           <div>
             <p className="font-medium">{worker.full_name || "Unknown"}</p>
             <p className="text-sm text-muted-foreground">{worker.email}</p>
           </div>
         </div>
       </TableCell>
       <TableCell>
         <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-success/10 text-success border-success/20">
             {worker.completed_count}
           </Badge>
           <span className="text-muted-foreground text-sm">completed</span>
         </div>
       </TableCell>
       <TableCell>
         <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
             {worker.in_progress_count}
           </Badge>
           <Badge variant="outline" className="bg-muted text-muted-foreground">
             {worker.pending_count}
           </Badge>
         </div>
       </TableCell>
       <TableCell>
         <div className="space-y-1">
           <div className="flex items-center justify-between text-sm">
             <span>{completionRate.toFixed(0)}%</span>
           </div>
           <Progress value={completionRate} className="h-2" />
         </div>
       </TableCell>
       <TableCell className="text-center">
         <span className="font-medium">{formatHours(worker.avg_resolution_hours)}</span>
       </TableCell>
       <TableCell>
         <RatingStars rating={worker.avg_rating} />
         {worker.total_ratings > 0 && (
           <p className="text-xs text-muted-foreground mt-0.5">
             ({worker.total_ratings} reviews)
           </p>
         )}
       </TableCell>
     </TableRow>
   );
 }
 
 export function MaintenancePerformanceDashboard() {
   const [searchQuery, setSearchQuery] = useState("");
   const { data: stats, isLoading } = useMaintenancePerformance();
 
   if (isLoading) {
     return (
       <div className="flex h-[50vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   const filteredWorkers = stats?.workers.filter(
     (worker) =>
       worker.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       worker.email.toLowerCase().includes(searchQuery.toLowerCase())
   ) || [];
 
   const formatHours = (hours: number | null) => {
     if (hours === null) return "N/A";
     if (hours < 24) return `${hours.toFixed(1)} hours`;
     return `${(hours / 24).toFixed(1)} days`;
   };
 
   return (
     <div className="space-y-6 p-6">
       {/* Stats Overview */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <StatCard
           title="Total Workers"
           value={stats?.total_workers || 0}
           subtitle="Maintenance personnel"
           icon={Users}
         />
         <StatCard
           title="Completed Issues"
           value={stats?.total_completed || 0}
           subtitle="All-time completions"
           icon={CheckCircle}
           trend="up"
         />
         <StatCard
           title="Avg Resolution Time"
           value={formatHours(stats?.overall_avg_resolution_hours ?? null)}
           subtitle="From creation to completion"
           icon={Clock}
         />
         <StatCard
           title="Avg Rating"
           value={stats?.overall_avg_rating?.toFixed(1) || "N/A"}
           subtitle="Out of 5 stars"
           icon={Star}
           trend={stats?.overall_avg_rating && stats.overall_avg_rating >= 4 ? "up" : undefined}
         />
       </div>
 
       {/* Workers Table */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5" />
               Worker Performance
             </CardTitle>
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                 placeholder="Search workers..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9"
               />
             </div>
           </div>
         </CardHeader>
         <CardContent>
           {filteredWorkers.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               {stats?.workers.length === 0
                 ? "No maintenance workers found. Assign the maintenance role to users first."
                 : "No workers match your search."}
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Worker</TableHead>
                   <TableHead>Completed</TableHead>
                   <TableHead>Active</TableHead>
                   <TableHead>Completion Rate</TableHead>
                   <TableHead className="text-center">Avg Time</TableHead>
                   <TableHead>Rating</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredWorkers.map((worker) => (
                   <WorkerRow key={worker.user_id} worker={worker} />
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }