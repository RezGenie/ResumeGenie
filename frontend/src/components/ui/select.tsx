import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  selectedLabel?: string
  setSelectedLabel?: (label: string) => void
}

const SelectContext = React.createContext<SelectContextType | null>(null)

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState<string>("")

  // Update selectedLabel when value changes or on mount
  React.useEffect(() => {
    if (!value) {
      setSelectedLabel("")
      return
    }

    // Extract label from SelectItem children that match the current value
    const findLabel = (node: React.ReactNode): string | null => {
      if (React.isValidElement(node)) {
        const props = node.props as { value?: string; children?: React.ReactNode }

        // Check if this is a SelectItem with matching value
        if (props.value === value) {
          const getTextContent = (child: React.ReactNode): string => {
            if (typeof child === 'string') return child
            if (typeof child === 'number') return String(child)
            if (React.isValidElement(child)) {
              const childProps = child.props as { children?: React.ReactNode }
              if (childProps.children) return getTextContent(childProps.children)
            }
            if (Array.isArray(child)) {
              return child.map(getTextContent).join(' ')
            }
            return ''
          }
          return getTextContent(props.children)
        }
        // Recursively search in children
        if (props.children) {
          const result = findLabel(props.children)
          if (result) return result
        }
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const result = findLabel(child)
          if (result) return result
        }
      }
      return null
    }

    const label = findLabel(children)
    if (label) {
      setSelectedLabel(label)
    }
  }, [value, children])

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, setSelectedLabel }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "bg-white dark:bg-input border-gray-300 dark:border-gray-600 text-foreground",
        className
      )}
      onClick={() => context?.setOpen(!context.open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const displayText = context?.selectedLabel || placeholder

  return (
    <span
      ref={ref}
      className={cn(
        "block truncate",
        !context?.selectedLabel && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {displayText}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)

  if (!context?.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 w-full mt-1 max-h-96 overflow-auto rounded-md border shadow-md bg-white dark:bg-[#2d1b3d] border-gray-300 dark:border-gray-600 text-foreground",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  SelectItemProps
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext)

  // Extract text content from children for label
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return String(node)
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode };
      if (props.children) {
        return getTextContent(props.children)
      }
    }
    if (Array.isArray(node)) {
      return node.map(getTextContent).join(' ')
    }
    return ''
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:bg-purple-50 dark:focus:bg-purple-900/30 transition-colors",
        className
      )}
      onClick={() => {
        context?.onValueChange?.(value)
        context?.setSelectedLabel?.(getTextContent(children))
        context?.setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}