"use client";

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
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { ConspiracyThemeGenerator } from "./conspiracy-theme-generator";
import { PlatformContentAligner } from "./platform-content-aligner";
import { TaskScheduler } from "./task-scheduler";
import { PerformanceDashboard } from "./performance-dashboard";
import { ContentCalendar } from "./content-calendar";
import { PromotionCards } from "./promotion-cards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Dashboard() {
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
                <SidebarMenuButton tooltip="Dashboard" isActive>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarGroup>
                <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Theme Generator">
                    <Wand2 />
                    <span>Theme Generator</span>
                     <SidebarMenuBadge>New</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Content Aligner">
                    <Share2 />
                    <span>Content Aligner</span>
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
             <h2 className="text-2xl font-headline font-semibold">Dashboard</h2>
             <SidebarTrigger className="md:hidden"/>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="grid gap-8 grid-cols-12">
              <div className="col-span-12">
                <PerformanceDashboard />
              </div>
              <div className="col-span-12 lg:col-span-7">
                <ConspiracyThemeGenerator />
              </div>
               <div className="col-span-12 lg:col-span-5">
                <PlatformContentAligner />
              </div>
              <div className="col-span-12 lg:col-span-6 xl:col-span-5">
                 <TaskScheduler />
              </div>
              <div className="col-span-12 lg:col-span-6 xl:col-span-7">
                <ContentCalendar />
              </div>
               <div className="col-span-12">
                <PromotionCards />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
