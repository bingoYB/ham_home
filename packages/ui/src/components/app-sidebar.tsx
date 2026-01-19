"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar"

// 类型定义
export interface AppSidebarUser {
  name: string
  email: string
  avatar: string
}

export interface AppSidebarNavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  badge?: string | number
  items?: {
    title: string
    url: string
  }[]
}

export interface AppSidebarProject {
  name: string
  url: string
  icon: LucideIcon
}

export interface AppSidebarBrand {
  name: string
  subtitle?: string
  logo: React.ReactNode
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  brand: AppSidebarBrand
  user?: AppSidebarUser
  navMain?: AppSidebarNavItem[]
  navSecondary?: AppSidebarNavItem[]
  projects?: AppSidebarProject[]
  footer?: React.ReactNode
  navLabel?: string
  showNavLabel?: boolean
  onNavClick?: (url: string) => void
}

export function AppSidebar({ 
  brand,
  user,
  navMain,
  navSecondary,
  projects,
  footer,
  navLabel,
  showNavLabel = true,
  onNavClick,
  ...props 
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {brand.logo}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{brand.name}</span>
                  {brand.subtitle && (
                    <span className="truncate text-xs">{brand.subtitle}</span>
                  )}
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navMain && navMain.length > 0 && (
          <NavMain items={navMain} label={navLabel} showLabel={showNavLabel} onItemClick={onNavClick} />
        )}
        {projects && projects.length > 0 && <NavProjects projects={projects} />}
        {navSecondary && navSecondary.length > 0 && (
          <NavSecondary items={navSecondary} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter>
        {footer ? footer : user && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
