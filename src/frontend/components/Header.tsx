import { useState } from "react";
import { Button } from "./ui/button.tsx";
import { 
  FileText, 
  Settings, 
  User, 
  LogIn,
  CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import { PricingDialog } from "./PricingDialog.tsx";

export function Header() {
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <>
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-muted-foreground/70" />
        <h1 className="text-base tracking-tight text-foreground/90">NoteFlow AI</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setPricingOpen(true)}
          className="text-xs h-8 px-3"
        >
          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
          Upgrade
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              API Key Configuration
            </DropdownMenuItem>
            <DropdownMenuItem>
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem>
              Export Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <User className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogIn className="w-4 h-4 mr-2" />
              Login / Sign Up
            </DropdownMenuItem>
            <DropdownMenuItem>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
    </header>
    </>
  );
}
