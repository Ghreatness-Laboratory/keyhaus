"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, UserPlus } from "lucide-react";
import {
  signInAction,
  signInDemoPresetAction,
  signUpAction,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox, Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthFormClient({
  mode,
  isDemoMode,
  nextPath,
}: {
  mode: "signin" | "signup";
  isDemoMode: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    startTransition(async () => {
      if (mode === "signin") {
        const res = await signInAction({ email, password });
        if (!res.ok) {
          setErrorMsg(res.error ?? "Sign in failed.");
          return;
        }
        const target = nextPath || res.data?.redirectTo || "/explore";
        router.push(target);
        router.refresh();
        return;
      }

      const res = await signUpAction({
        fullName,
        email,
        phone,
        password,
        acceptedLegal,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not create account.");
        return;
      }
      if (res.data?.needsEmailConfirmation) {
        setInfoMsg("Check your inbox to confirm your email address, then sign in.");
        return;
      }
      router.push(res.data?.redirectTo ?? "/onboarding/role");
      router.refresh();
    });
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Configure Supabase env vars to enable Google sign-in.");
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback${
      nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setErrorMsg(error.message);
    }
  };

  const handleDemoPreset = (preset: "renter" | "landlord" | "new") => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await signInDemoPresetAction(preset);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not sign in.");
        return;
      }
      router.push(nextPath || res.data?.redirectTo || "/explore");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="rounded-[24px] border-[1.5px] border-[#E2DFD6] bg-white p-6 space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#17211F]">
            {mode === "signin" ? "Welcome back to Keyhaus" : "Create your Keyhaus account"}
          </h1>
          <p className="mt-1 text-sm text-[#5B6663]">
            {mode === "signin"
              ? "Sign in to save homes, request viewings, or manage listings."
              : "Collects only your name, email, and Nigerian mobile number."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="auth-name">Full name</Label>
                <Input
                  id="auth-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tunde Adeyemi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-phone">Nigerian mobile number</Label>
                <Input
                  id="auth-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0803 123 4567"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email address</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {mode === "signup" && (
            <label
              htmlFor="auth-legal"
              className="flex min-h-[44px] cursor-pointer items-start gap-3 pt-1"
            >
              <Checkbox
                id="auth-legal"
                checked={acceptedLegal}
                onCheckedChange={(v) => setAcceptedLegal(Boolean(v))}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed text-[#5B6663]">
                I agree to the Keyhaus{" "}
                <Link href="/terms" className="font-semibold text-[#0E6B5B] underline">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-[#0E6B5B] underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}

          {errorMsg && (
            <p role="alert" className="text-sm font-medium text-[#B3261E]">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <p role="status" className="text-sm font-medium text-[#0E6B5B]">
              {infoMsg}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {mode === "signin" ? (
              <>
                <KeyRound className="h-4 w-4" strokeWidth={2} />
                <span>{isPending ? "Signing in..." : "Sign in with email"}</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" strokeWidth={2} />
                <span>{isPending ? "Creating account..." : "Create account"}</span>
              </>
            )}
          </Button>
        </form>

        {!isDemoMode && (
          <>
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#E2DFD6]" />
              <span className="mx-3 shrink-0 text-xs text-[#5B6663]">or</span>
              <div className="flex-grow border-t border-[#E2DFD6]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              <span>Continue with Google</span>
            </Button>
          </>
        )}

        <p className="text-center text-sm text-[#5B6663]">
          {mode === "signin" ? (
            <>
              New to Keyhaus?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-[#0E6B5B] underline underline-offset-4"
              >
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-[#0E6B5B] underline underline-offset-4"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      {isDemoMode && (
        <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-3">
          <p className="font-heading text-sm font-bold text-[#17211F]">
            Preview quick sign-in
          </p>
          <p className="text-xs text-[#5B6663]">
            Supabase environment variables are not connected yet, so you can try
            every Keyhaus role immediately with demo accounts:
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleDemoPreset("renter")}
            >
              Continue as Demo Renter (Tunde)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleDemoPreset("landlord")}
            >
              Continue as Demo Landlord (Chinedu)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleDemoPreset("new")}
            >
              Test New User Onboarding
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
