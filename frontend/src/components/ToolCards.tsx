import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench } from 'lucide-react';

interface ToolEntry {
  node: string;
  tool: string;
  input: string;
  output: string;
}

interface Props {
  toolCalls: ToolEntry[];
}

export function ToolCards({ toolCalls }: Props) {
  return (
    <div className="flex h-full min-h-[500px] flex-col">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Wrench className="h-4 w-4" /> Tool Calls
      </h3>
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-2">
          <AnimatePresence initial={false}>
            {toolCalls.length === 0 && (
              <p className="text-sm text-muted-foreground">No tool calls yet.</p>
            )}
            {toolCalls.map((tc, i) => (
              <motion.div
                key={`${tc.tool}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="text-sm">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      🔧 {tc.tool}
                      <span className="text-muted-foreground font-normal">· {tc.node}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1.5">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Input: </span>
                      <span className="text-xs text-foreground">{tc.input}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Output: </span>
                      <span className="text-xs text-foreground">{tc.output}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
