import { useCreateSession } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Session identifier is required").max(100),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SessionNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createSession = useCreateSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  function onSubmit(values: FormValues) {
    createSession.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({
          title: "Session Initialized",
          description: `Neural session ${data.name} is now active.`,
        });
        setLocation(`/sessions/${data.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to initialize session. Verify parameters.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      <Link href="/sessions" className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sessions
      </Link>
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
          <Terminal className="w-8 h-8 text-primary" />
          Initialize Sequence
        </h1>
        <p className="text-muted-foreground font-mono text-sm border-l-2 border-primary/30 pl-3 ml-1 text-primary/70">
          Configure parameters for new neural adaptation sequence.
        </p>
      </div>

      <Card className="bg-card/40 backdrop-blur border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Session Identifier</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. ALPHA_PROTOCOL_01" 
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary/50 text-base py-6" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Context / Parameters</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Define operational boundaries..." 
                        className="font-mono min-h-[150px] bg-background/50 border-border/50 focus-visible:ring-primary/50 resize-none leading-relaxed"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6 border-t border-border/30 mt-6">
                <Button 
                  type="submit" 
                  disabled={createSession.isPending}
                  className="font-mono text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px] h-12"
                >
                  {createSession.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Initializing...
                    </span>
                  ) : "Initialize"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
