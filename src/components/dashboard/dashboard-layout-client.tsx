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
  Send,
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
import { LanguageSwitcher } from '../language-switcher';

export function DashboardLayoutClient({
  children,
  lang,
  dict,
}: {
  children: ReactNode;
  lang: string;
  dict: any;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === `/${lang}${path}`;
  };

  const getPageTitle = () => {
    if (pathname.endsWith('/theme-generator'))
      return dict.pageTitles.themeGenerator;
    if (pathname.endsWith('/content-aligner'))
      return dict.pageTitles.contentAligner;
    if (pathname.endsWith('/publisher')) return dict.pageTitles.publisher;
    if (pathname.endsWith('/dashboard')) return dict.pageTitles.dashboard;
    return dict.pageTitles.default;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-primary group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all" />
              <h1 className="text-2xl font-bold font-headline text-foreground group-data-[collapsible=icon]:hidden">
                {dict.sidebar.header}
              </h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={dict.sidebar.dashboard}
                  isActive={isActive('/dashboard')}
                >
                  <Link href={`/${lang}/dashboard`}>
                    <LayoutDashboard />
                    <span>{dict.sidebar.dashboard}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarGroup>
                <SidebarGroupLabel>{dict.sidebar.aiTools}</SidebarGroupLabel>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={dict.sidebar.themeGenerator}
                    isActive={isActive('/dashboard/theme-generator')}
                  >
                    <Link href={`/${lang}/dashboard/theme-generator`}>
                      <Wand2 />
                      <span>{dict.sidebar.themeGenerator}</span>
                      <SidebarMenuBadge>{dict.sidebar.new}</SidebarMenuBadge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={dict.sidebar.contentAligner}
                    isActive={isActive('/dashboard/content-aligner')}
                  >
                    <Link href={`/${lang}/dashboard/content-aligner`}>
                      <Share2 />
                      <span>{dict.sidebar.contentAligner}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={dict.sidebar.publisher}
                    isActive={isActive('/dashboard/publisher')}
                  >
                    <Link href={`/${lang}/dashboard/publisher`}>
                      <Send />
                      <span>{dict.sidebar.publisher}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>{dict.sidebar.planning}</SidebarGroupLabel>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={dict.sidebar.scheduler}>
                    <CalendarDays />
                    <span>{dict.sidebar.scheduler}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={dict.sidebar.analytics}>
                    <LineChart />
                    <span>{dict.sidebar.analytics}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>{dict.sidebar.sales}</SidebarGroupLabel>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={dict.sidebar.bookPromotion}>
                    <BookOpen />
                    <span>{dict.sidebar.bookPromotion}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={dict.sidebar.subscriptions}>
                    <BadgeDollarSign />
                    <span>{dict.sidebar.subscriptions}</span>
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
                    <AvatarImage
                      src="https://placehold.co/40x40.png"
                      data-ai-hint="hacker anonymous"
                      alt="User"
                    />
                    <AvatarFallback>VT</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold">{dict.userMenu.agentName}</span>
                    <span className="text-xs text-muted-foreground">{dict.userMenu.membership}</span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>{dict.userMenu.myAccount}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" /> {dict.userMenu.profile}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" /> {dict.userMenu.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <LanguageSwitcher dict={dict.userMenu} />
                <DropdownMenuSeparator />
                <DropdownMenuItem>{dict.userMenu.logout}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-between p-4 md:p-6 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h2 className="text-2xl font-headline font-semibold">
                {getPageTitle()}
              </h2>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
