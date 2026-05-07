"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApp, loginUser } from "@/lib/api";
import type { AppConfig } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;
  const { login } = useAuth();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApp(appId).then((app) => setConfig(app.config)).catch(() => {});
  }, [appId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginUser(appId, {
        email: formData.email || "",
        password: formData.password || "",
      });
      login(result.token, result.user);
      toast.success("Logged in!");
      router.push(`/app/${appId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const authFields = config?.auth?.fields || [
    { name: "email", type: "email", required: true },
    { name: "password", type: "password", required: true },
  ];

  // Only show email and password for login
  const loginFields = authFields.filter((f) =>
    ["email", "password"].includes(f.name)
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{config?.appName || "App"} - Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginFields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>
                  {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                </Label>
                <Input
                  id={field.name}
                  type={field.type === "password" ? "password" : field.type === "email" ? "email" : "text"}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  required={field.required}
                />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href={`/app/${appId}/auth/register`}
              className="text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
