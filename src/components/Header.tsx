import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
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

        {/* Add Button */}
        <Button className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add New</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
        </Button>

        {/* User Avatar */}
        <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent transition-colors hover:border-accent">
          <AvatarFallback className="bg-gradient-slate text-primary-foreground text-sm font-medium">
            JD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
