import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Checkpoint, AgentNode } from '@/types/research';
import { Search, Brain, PenTool, Check, Circle, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const NODE_META: { key: AgentNode; label: string; icon: typeof Search }[] = [
  { key: 'researcher', label: 'Researcher', icon: Search },
  { key: 'analyst', label: 'Analyst', icon: Brain },
  { key: 'writer', label: 'Writer', icon: PenTool },
];

interface Props {
  checkpoints: Checkpoint[];
  activeIdx: number;
  onNodeClick: (checkpointIdx: number) => void;
}

export function StateGraph({ checkpoints, activeIdx, onNodeClick }: Props) {
  const latestCp = checkpoints[checkpoints.length - 1];

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-4 py-6">
        {NODE_META.map((node, i) => {
          const status = latestCp?.agentStates[node.key].status || 'idle';
          const cpIdx = checkpoints.findIndex(cp => cp.agentStates[node.key].status === 'complete');
          const isClickable = cpIdx >= 0;
          const isActive = cpIdx === activeIdx;

          const button = (
            <motion.button
              whileHover={isClickable ? { scale: 1.08, y: -2 } : {}}
              whileTap={isClickable ? { scale: 0.95 } : {}}
              onClick={(e) => { e.preventDefault(); if (isClickable) onNodeClick(cpIdx); }}
              disabled={!isClickable}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 transition-all',
                isActive && 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20',
                !isActive && status === 'complete' && 'border-[hsl(var(--node-complete))] bg-[hsl(var(--node-complete))]/5 cursor-pointer hover:shadow-md hover:border-[hsl(var(--node-complete))]/80',
                !isActive && status === 'running' && 'border-primary/50 bg-primary/5 animate-pulse',
                !isActive && status === 'idle' && 'border-border bg-muted/30 opacity-50',
              )}
            >
              {isActive && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <RotateCcw className="h-3 w-3" />
                </span>
              )}
              <node.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{node.label}</span>
              {status === 'complete' ? (
                <Check className="h-4 w-4 text-[hsl(var(--node-complete))]" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </motion.button>
          );

          return (
            <div key={node.key} className="flex items-center gap-4">
              {isClickable ? (
                <Tooltip>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Click to rewind to {node.label} checkpoint
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              )}
              {i < NODE_META.length - 1 && (
                <svg width="40" height="2" className="text-border">
                  <line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray={status === 'complete' ? '0' : '4 4'} />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
