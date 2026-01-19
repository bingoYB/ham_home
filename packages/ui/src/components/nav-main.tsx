"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
} from "@ui/components/sidebar"

export interface NavMainItem {
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

export interface NavMainProps {
  items: NavMainItem[]
  label?: string
  showLabel?: boolean
  onItemClick?: (url: string) => void
}

export function NavMain({ items, label = "Platform", showLabel = true, onItemClick }: NavMainProps) {
  const handleClick = (e: React.MouseEvent, url: string) => {
    if (onItemClick) {
      e.preventDefault()
      onItemClick(url)
    }
  }

  return (
    <SidebarGroup>
      {showLabel && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                isActive={item.isActive}
              >
                <a href={item.url} onClick={(e) => handleClick(e, item.url)}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
              {item.badge !== undefined && (
                <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
              )}
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url} onClick={(e) => handleClick(e, subItem.url)}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
