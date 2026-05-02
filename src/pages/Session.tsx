import { useEffect, useRef } from 'react';
import { useResearch } from '@/context/ResearchContext';

import { ThoughtTerminal } from '@/components/ThoughtTerminal';
import { ToolCards } from '@/components/ToolCards';
import { StateGraph } from '@/components/StateGraph';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { RotateCcw, Plus, Copy, Download, FileText, Clock, Link2, Footprints, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const Session = () => {
  const { store, getActiveSession, setRewind } = useResearch();
  const navigate = useNavigate();
  const session = getActiveSession();
  const reportRef = useRef<HTMLDivElement>(null);

  const isLive = store.isStreaming;
  const wasLive = useRef(isLive);

  // Auto-scroll to report when research completes
  useEffect(() => {
    if (wasLive.current && !isLive && session?.status === 'completed') {
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
    wasLive.current = isLive;
  }, [isLive, session?.status]);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">No active session. Start a new research from the home page.</p>
      </div>
    );
  }

  const checkpoints = session.checkpoints;
  const hasCheckpoints = checkpoints.length > 0;
  const rewindIdx = store.rewindCheckpointIdx ?? (checkpoints.length - 1);
  const isRewound = store.rewindCheckpointIdx !== null && store.rewindCheckpointIdx < checkpoints.length - 1;

  const states = isLive
    ? store.liveStates
    : hasCheckpoints
      ? checkpoints[rewindIdx]?.agentStates
      : undefined;

  if (!states && !store.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Initializing session...</p>
      </div>
    );
  }

  const allLogs: { node: string; text: string }[] = [];
  const allTools: { node: string; tool: string; input: string; output: string }[] = [];

  if (states) {
    for (const node of ['researcher', 'analyst', 'writer'] as const) {
      const s = states[node];
      if (s) {
        s.logs.forEach(l => allLogs.push({ node, text: l }));
        s.toolCalls.forEach(tc => allTools.push({ node, ...tc }));
      }
    }
  }

  const handleCopy = async () => {
    if (!session.finalReport) return;
    await navigator.clipboard.writeText(session.finalReport);
    toast({ title: 'Copied to clipboard', description: 'The report has been copied.' });
  };

  const handleDownload = () => {
    if (!session.finalReport) return;
    const blob = new Blob([session.finalReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${session.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Session section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-4 p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground truncate max-w-lg">
              {session.query}
            </h2>
            <p className="text-sm text-muted-foreground">
              {store.error ? 'Error' : isLive ? 'Researching...' : `Status: ${session.status}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRewound && (
              <Button variant="outline" size="sm" onClick={() => setRewind(null)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Back to Live
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Plus className="mr-2 h-4 w-4" /> New Research
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {store.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            {store.error.toLowerCase().includes('quota exceeded') ? (
              <>
                <AlertTitle>Demo Quota Reached</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>You've used your 2 free research requests for this hour. Please try again later.</span>
                  <Button variant="outline" size="sm" className="ml-4 shrink-0" onClick={() => navigate('/')}>
                    New Research
                  </Button>
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{store.error}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Two-column: Thought stream | State graph + tools */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[1000px] lg:h-[700px]">
          <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <ThoughtTerminal logs={allLogs} isStreaming={isLive} />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            {hasCheckpoints && (
              <div className="space-y-3">
                <StateGraph
                  checkpoints={checkpoints}
                  activeIdx={rewindIdx}
                  onNodeClick={(idx) => setRewind(idx)}
                />
                {checkpoints.length > 1 && (
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Timeline</span>
                    <Slider
                      value={[rewindIdx]}
                      min={0}
                      max={checkpoints.length - 1}
                      step={1}
                      onValueChange={([v]) => setRewind(v)}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      {rewindIdx + 1}/{checkpoints.length}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto">
              <ToolCards toolCalls={allTools} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Report section — appears when research is complete */}
      {session.finalReport && (
        <motion.div
          ref={reportRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-t p-6 space-y-6 w-full"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Research Report
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>

          <Card className="p-8">
            <article className="prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary">
              <ReactMarkdown>{session.finalReport}</ReactMarkdown>
            </article>
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {new Date(session.startedAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                6 sources
              </span>
              <span className="flex items-center gap-1.5">
                <Footprints className="h-4 w-4" />
                {session.checkpoints.length} agent steps
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Session;
