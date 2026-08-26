import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Compliance() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance</h1>
          <p className="text-muted-foreground">Audit trails and compliance reporting</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance & Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Compliance features coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
