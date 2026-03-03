import { useState, useRef, useEffect } from "react";
import { Bell, Search, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAlertCount } from "@/hooks/useAutomationWorkflows";
import { useLandlordNotifications, useUnreadLandlordNotificationCount, useMarkNotificationRead } from "@/hooks/useLandlordNotifications";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { profile, isLandlord } = useAuth();
  const unreadAlerts = useUnreadAlertCount();
  const unreadLandlordCount = useUnreadLandlordNotificationCount();
  const { data: landlordNotifications } = useLandlordNotifications();
  const markRead = useMarkNotificationRead();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalUnread = unreadAlerts + unreadLandlordCount;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || profile?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-card-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 bg-secondary border-0 focus-visible:ring-accent"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell className="h-5 w-5" />
            {totalUnread > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </Badge>
            ) : (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
            )}
          </Button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm text-card-foreground">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLandlord && landlordNotifications && landlordNotifications.length > 0 ? (
                  landlordNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors",
                        !notification.is_read && "bg-accent/5"
                      )}
                      onClick={() => {
                        if (!notification.is_read) {
                          markRead.mutate(notification.id);
                        }
                      }}
                    >
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        notification.is_read ? "bg-muted" : "bg-accent/10"
                      )}>
                        <FileText className={cn("h-4 w-4", notification.is_read ? "text-muted-foreground" : "text-accent")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-tight", !notification.is_read && "font-medium text-foreground")}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-accent mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent transition-colors hover:border-accent">
          <AvatarFallback className="bg-gradient-slate text-primary-foreground text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
