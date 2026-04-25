"use client";

import { Toaster as Sonner, ToasterProps, toast } from "sonner";

const Toaster = ({ theme = "system", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "rounded-2xl!",
          success: "bg-success! text-white!",
          error: "bg-red-400! text-white!",
          warning: "bg-yellow-500! text-white!",
          info:
            "border-blue-100! bg-blue-50! text-blue-700! dark:border-blue-900! dark:bg-blue-950! dark:text-blue-300!",
          description: "text-inherit!",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
