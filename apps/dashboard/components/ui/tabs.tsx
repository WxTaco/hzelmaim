"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider")
  }
  return context
}

interface TabsProps extends React.ComponentProps<"div"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue)
    }
    onValueChange?.(newValue)
  }, [isControlled, onValueChange])

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div
        data-slot="tabs"
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "flex sm:h-10 w-full items-center gap-1 rounded-lg bg-muted/50 p-1 text-muted-foreground overflow-x-auto scrollbar-none",
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ComponentProps<"button"> {
  value: string
}

function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs()
  const isSelected = selectedValue === value

  return (
    <button
      data-slot="tabs-trigger"
      role="tab"
      type="button"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        // Base styles with improved touch targets (min 44px on mobile)
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
        "min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2 sm:py-1.5 shrink-0",
        "text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

interface TabsContentProps extends React.ComponentProps<"div"> {
  value: string
}

function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabs()
  const isSelected = selectedValue === value

  if (!isSelected) return null

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
