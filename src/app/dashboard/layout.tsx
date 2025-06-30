'use client';

import {
  Bot,
  LayoutDashboard,
  Wand2,
  Share2,
  CalendarDays,
  LineChart,
  BookOpen,
  BadgeDollarSign,
  User,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard/theme-generator')) return 'Theme Generator';
    if (pathname.startsWith('/dashboard/content-aligner')) return 'Content Aligner';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    return 'Veiled Truths';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-primary group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all" />
              <h1 className="text-2xl font-bold font-headline text-foreground group-data-[collapsible=icon]:hidden">
                Veiled Truths
              </h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                 <SidebarMenuButton asChild tooltip="Dashboard" isActive={isActive('/dashboard')}>
                    <Link href="/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarGroup>
                <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Theme Generator" isActive={isActive('/dashboard/theme-generator')}>
                        <Link href="/dashboard/theme-generator">
                            <Wand2 />
                            <span>Theme Generator</span>
                            <SidebarMenuBadge>New</SidebarMenuBadge>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Content Aligner" isActive={isActive('/dashboard/content-aligner')}>
                    <Link href="/dashboard/content-aligner">
                      <Share2 />
                      <span>Content Aligner</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Planning</SidebarGroupLabel>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Scheduler">
                    <CalendarDays />
                    <span>Scheduler</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Analytics">
                    <LineChart />
                    <span>Analytics</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Sales</SidebarGroupLabel>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Book Promotion">
                    <BookOpen />
                    <span>Book Promotion</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Subscriptions">
                    <BadgeDollarSign />
                    <span>Subscriptions</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <div className="flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="hacker anonymous" alt="User" />
                      <AvatarFallback>VT</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-semibold">Agent Smith</span>
                      <span className="text-xs text-muted-foreground">Pro Member</span>
                    </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-between p-4 md:p-6 border-b">
             <h2 className="text-2xl font-headline font-semibold">{getPageTitle()}</h2>
             <SidebarTrigger className="md:hidden"/>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
