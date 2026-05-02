import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LogEntry {
  node: string;
  text: string;
}

interface Props {
  logs: LogEntry[];
  isStreaming: boolean;
}

const nodeColors: Record<string, string> = {
  researcher: 'text-blue-400',
  analyst: 'text-purple-400',
  writer: 'text-emerald-400',
};

export function ThoughtTerminal({ logs, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [logs.length]);

  return (
    <div className="flex h-full min-h-[300px] flex-col rounded-lg border bg-[hsl(var(--terminal-bg))] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--terminal-muted))]/20 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <span className="font-mono text-xs text-[hsl(var(--terminal-muted))]">thought-stream</span>
        {isStreaming && (
          <span className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1 font-mono text-sm">
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div
                key={`${log.node}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex gap-2"
              >
                <span className={cn('shrink-0', nodeColors[log.node] || 'text-[hsl(var(--terminal-fg))]')}>
                  [{log.node}]
                </span>
                <span className="text-[hsl(var(--terminal-fg))]">{log.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block h-4 w-2 bg-[hsl(var(--terminal-fg))]"
            />
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
