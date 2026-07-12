import React, { Component, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  className?: string;
}

export function WebGLFallback({ className }: FallbackProps) {
  return (
    <div className={cn("bg-[#050505] flex items-center justify-center text-white/50 text-sm", className)}>
      {/* A dark fallback background when WebGL fails */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00E559]/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
    </div>
  );
}
