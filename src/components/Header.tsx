import { useState, useRef, useEffect } from "react";
import { Bell, Search, FileText, Check, Menu, X, Home, ArrowLeft, Globe } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAlertCount } from "@/hooks/useAutomationWorkflows";
import { useLandlordNotifications, useUnreadLandlordNotificationCount, useMarkNotificationRead } from "@/hooks/useLandlordNotifications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onToggleNav?: () => void;
  navOpen?: boolean;
  onNavigate?: (view: string) => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

export function Header({ title, subtitle, onToggleNav, navOpen, onNavigate, onGoBack, onGoHome }: HeaderProps) {
  const { profile, isLandlord, isTenant, signOut } = useAuth();
  const unreadAlerts = useUnreadAlertCount();
  const unreadLandlordCount = useUnreadLandlordNotificationCount();
  const { data: landlordNotifications } = useLandlordNotifications();
  const markRead = useMarkNotificationRead();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const totalUnread = unreadAlerts + unreadLandlordCount;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
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
    <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 max-w-[1760px] mx-auto">
        {/* Left: Hamburger + Home + Back + Logo */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onToggleNav}
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onGoHome}
            title="Home"
          >
            <Home className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onGoBack}
            title="Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div className="flex items-center gap-2 ml-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-display text-lg font-bold text-foreground">
              RentPal
            </span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <GlobalSearch onNavigate={onNavigate} />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Current page title (mobile) */}
          <span className="md:hidden text-sm font-semibold truncate max-w-[120px]">
            {title}
          </span>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {totalUnread > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-0.5 -top-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </Badge>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-elevated z-50">
                <div className="p-3 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {isLandlord && landlordNotifications && landlordNotifications.length > 0 ? (
                    landlordNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors",
                          !notification.is_read && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            markRead.mutate(notification.id);
                          }
                        }}
                      >
                        <div className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          notification.is_read ? "bg-muted" : "bg-primary/10"
                        )}>
                          <FileText className={cn("h-4 w-4", notification.is_read ? "text-muted-foreground" : "text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-tight", !notification.is_read && "font-medium")}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
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

          {/* User Avatar + Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full border p-1 pl-3 hover:shadow-card transition-shadow"
            >
              <Menu className="h-3.5 w-3.5 text-muted-foreground" />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card shadow-elevated z-50 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-semibold truncate">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onNavigate?.("settings"); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  Settings
                </button>
                {isTenant && (
                  <button
                    onClick={() => { setShowUserMenu(false); onNavigate?.("tenant-portal"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    My Portal
                  </button>
                )}
                <div className="border-t my-1" />
                <button
                  onClick={() => { setShowUserMenu(false); signOut(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors text-destructive"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page title bar */}
      <div className="border-t bg-background">
        <div className="px-4 md:px-6 py-3 max-w-[1760px] mx-auto">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
