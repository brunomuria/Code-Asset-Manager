import React from "react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6">
      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight">SDR CRM</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            A precision CRM built for SDR sales teams. Manage leads, run AI-powered outreach campaigns, and track your pipeline — all in one place.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setLocation("/sign-in")}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => setLocation("/sign-up")}
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Create Account
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 text-left">
          {[
            { title: "Kanban Pipeline", desc: "Visual lead management across customizable funnel stages." },
            { title: "AI Outreach", desc: "Generate personalized messages using OpenAI based on your campaigns." },
            { title: "Smart Automation", desc: "Auto-generate messages when leads reach trigger stages." },
          ].map((feat) => (
            <div key={feat.title} className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-1">{feat.title}</h3>
              <p className="text-sm text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
