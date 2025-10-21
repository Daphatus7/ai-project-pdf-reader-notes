import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  FileText, 
  Search, 
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
} from "./ui/dropdown-menu";
import { PricingDialog } from "./PricingDialog";

export function Header() {
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <>
    <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-xl">NoteFlow AI</h1>
        </div>
        
        <div className="relative w-80 ml-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes..." 
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setPricingOpen(true)}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Upgrade to Pro
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
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
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
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
