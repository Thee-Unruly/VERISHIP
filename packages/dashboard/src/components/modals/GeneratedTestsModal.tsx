import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface GeneratedTestCase {
  title: string;
  description?: string;
  test_type: string;
  priority: number;
  test_steps: string[];
  expected_result: string;
}

interface GeneratedTestsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  testCases: GeneratedTestCase[];
}

export function GeneratedTestsModal({
  isOpen,
  onOpenChange,
  testCases,
}: GeneratedTestsModalProps) {
  const getBadgeVariant = (testType: string) => {
    switch (testType.toLowerCase()) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'edge case':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI-Generated Test Cases</DialogTitle>
          <DialogDescription>
            Review the test cases suggested by the Quality Copilot. You can add them to the project manually.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {testCases.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {testCases.map((tc, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4 text-left">
                       <Badge variant={getBadgeVariant(tc.test_type)}>{tc.test_type}</Badge>
                       <span>{tc.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      {tc.description && <p className="text-muted-foreground">{tc.description}</p>}
                       <div>
                         <h4 className="font-semibold mb-2">Test Steps:</h4>
                         <ol className="list-decimal list-inside space-y-1">
                           {tc.test_steps.map((step, i) => <li key={i}>{step}</li>)}
                         </ol>
                       </div>
                       <div>
                         <h4 className="font-semibold mb-2">Expected Result:</h4>
                         <p className="text-muted-foreground">{tc.expected_result}</p>
                       </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center">No test cases were generated.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
