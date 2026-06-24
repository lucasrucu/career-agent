import * as React from "react"

import { cn } from "@/lib/utils"

// A small styled wrapper over a native checkbox. We keep it native (rather than a
// base-ui primitive) so it composes cleanly with plain `checked` / `onChange`
// form state and matches the themed focus ring used by Input/Button.
function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-input bg-transparent align-middle outline-none transition-colors",
        "checked:border-primary checked:bg-primary",
        "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M3 8.5l3.5 3.5L13 4.5%22/></svg>')] checked:bg-center checked:bg-no-repeat",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }
